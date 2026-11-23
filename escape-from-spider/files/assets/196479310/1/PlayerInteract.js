var PlayerInteract = pc.createScript('playerInteract');
PlayerInteract.attributes.add("leftHand", { type: "entity" });
PlayerInteract.attributes.add("rightHand", { type: "entity" });
PlayerInteract.attributes.add("spine", { type: "entity" });
PlayerInteract.attributes.add("interactTrigger", { type: "entity" })

PlayerInteract.prototype.initialize = function () {
    this.leftItem = null;
    this.rightItem = null;
    this.interactables = [];

    this.interactTrigger.collision.off("triggerenter");
    this.interactTrigger.collision.off("triggerleave");
    this.interactTrigger.enabled = false;

    this.interactDelayTimeout = setTimeout(() => {
        this.interactTrigger.enabled = true;
        this.interactTrigger.collision.on("triggerenter", this.triggerEnter, this);
        this.interactTrigger.collision.on("triggerleave", this.triggerLeave, this);
    }, 1000)

    this.app.on("EnterFPS", this.enterFps, this);
    this.app.on("ExitFPS", this.exitFps, this);

    this.app.on("LockedCaseOpen", this.lockedCaseOpen, this);
    this.app.on("LockedCaseClose", this.lockedCaseClose, this);

    this.app.on("BecomeSpider", this.onBecomeSpider, this);
    this.app.on("BecomeHuman", this.onBecomeHuman, this);

    this.entity.on("destroy", () => {
        this.app.off("EnterFPS", this.enterFps, this);
        this.app.off("ExitFPS", this.exitFps, this);

        this.app.off("LockedCaseOpen", this.lockedCaseOpen, this);
        this.app.off("LockedCaseClose", this.lockedCaseClose, this);

        this.app.off("BecomeSpider", this.onBecomeSpider, this);
        this.app.off("BecomeHuman", this.onBecomeHuman, this);

        clearTimeout(this.interactDelayTimeout);
    }, this);
};

PlayerInteract.prototype.onBecomeSpider = function () {
    this.setRightHand(null);
};

PlayerInteract.prototype.onBecomeHuman = function () {

};

PlayerInteract.prototype.update = function (dt) {
    // DEBUG DEBUG DEBUG DEBUG
    /*
    if (pc.app.keyboard.wasPressed(pc.KEY_H)) {
        if (this.app.room)
            this.app.room.send("PowerupArea:ReserveLimitedPowerup", { powerupType: "Spider" });
    }
    */

    //console.log(this.interactables);

    if (this.interactables.length <= 0) return;

    if (window.touchJoypad.buttons.wasPressed('useButton') || this.app.keyboard.wasPressed(pc.KEY_E)) {
        let interactable = this.interactables[0];
        interactable.fire("interact", this);
    }
}

PlayerInteract.prototype.triggerEnter = function (other) {
    if (!other.tags.has("Interactable")) return;
    if (this.app.player.controller.isGrabbedBySpider && !other.tags.has("Cage")) return;

    if (!other.canInteract) return;
    if (this.interactables.includes(other)) return;

    if (this.app.isSpider) {
        if (other.tags.has("Item")) return;
        if (other.tags.has("LockedCase")) return;
    }

    this.interactables.push(other);
    other.fire("toggleIndicator", true);

    if (!other.priority) other.priority = 0;
    this.sort();

    this.app.ui.useButton.enabled = this.interactables.length > 0;
};

PlayerInteract.prototype.triggerLeave = function (other) {
    if (!other.tags.has("Interactable")) return;
    if (!this.interactables.includes(other)) return;

    let index = this.interactables.indexOf(other);
    this.interactables.splice(index, 1);

    other.fire("toggleIndicator", false);

    this.sort();

    this.app.ui.useButton.enabled = this.interactables.length > 0;
};

PlayerInteract.prototype.sort = function () {
    this.interactables = this.interactables.sort((a, b) => b.priority - a.priority);

    for (let i = 0; i < this.interactables.length; i++) {
        this.interactables[i].fire("toggleIndicator", i == 0);
    }
};

PlayerInteract.prototype.refresh = function () {
    this.interactTrigger.enabled = false;

    setTimeout(() => {
        this.interactables = this.interactables.filter(i => i.canInteract);
        this.interactTrigger.enabled = true;
        this.app.ui.useButton.enabled = this.interactables.length > 0;
    }, 3);
};

PlayerInteract.prototype.setRightHand = function (item, interactable = null) {
    this.app.fire("ItemChanged", item, interactable);

    if (this.rightItem != null) {
        if (item != null)
            if (this.rightItem.id == item.id) return;

        this.rightItem.entity.destroy();
        if (this.rightItem.fpsEntity)
            this.rightItem.fpsEntity.destroy();
        this.rightItem = null;
    }

    if (item != null) {
        item.entity = item.template.resource.instantiate();

        if (item.fpsTemplate)
            item.fpsEntity = item.fpsTemplate.resource.instantiate();

        if (item.spineItem) this.spine.addChild(item.entity);
        else {
            this.rightHand.addChild(item.entity);

            if (item.fpsEntity)
                this.app.player.fpsAnimator.right.addChild(item.fpsEntity);
        }

        item.entity.children[0].enabled = !this.app.isFPS;
        if (item.fpsEntity)
            item.fpsEntity.enabled = this.app.isFPS;
    }

    this.rightItem = item;
    this.app.ui.setRightHand(item);
    this.app.fire("RefreshTutorial");

    if (!this.app.room) return;

    let id = -1;

    if (this.rightItem != null) {
        id = this.rightItem.id;
    }

    this.app.room.send("Client:RightItem", {
        id: id,
    });
}

PlayerInteract.prototype.enterFps = function () {
    if (!this.rightItem) return;

    this.rightItem.entity.children[0].enabled = false;
    if (this.rightItem.fpsEntity)
        this.rightItem.fpsEntity.enabled = true;
}

PlayerInteract.prototype.exitFps = function () {
    if (!this.rightItem) return;

    this.rightItem.entity.children[0].enabled = true;
    if (this.rightItem.fpsEntity)
        this.rightItem.fpsEntity.enabled = false;
}

PlayerInteract.prototype.lockedCaseOpen = function () {
    if (!this.rightItem) return;

    this.rightItem.entity.children[0].enabled = false;
    if (this.rightItem.fpsEntity)
        this.rightItem.fpsEntity.enabled = false;
}

PlayerInteract.prototype.lockedCaseClose = function () {
    if (!this.rightItem) return;

    this.rightItem.entity.children[0].enabled = !this.app.isFPS;
    if (this.rightItem.fpsEntity)
        this.rightItem.fpsEntity.enabled = this.app.isFPS;
}

function toggleIndicator(interactable, toggle) {
    interactable.indicator.findByName("KeyIcon").enabled = !interactable.app.isMobile;
    interactable.indicator.enabled = toggle;

    let renders = findAllRenderEntities(interactable.entity);
    if (renders.length > 0) {
        for (let i = 0; i < renders.length; i++) {
            let r = renders[i];
            pc.app.fire(("Outline:" + (toggle ? "Add" : "Remove")), r);
        }
    }
}