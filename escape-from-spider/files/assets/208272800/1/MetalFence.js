var MetalFence = pc.createScript('metalFence');
MetalFence.attributes.add("needId", { type: "number", default: 20 })
MetalFence.attributes.add("collider", { type: "entity" })

MetalFence.prototype.initialize = function () {
    this.needItem = this.app.itemDatabase.items[this.needId];

    this.locked = true;

    this.indicator = this.entity.findByName("Indicator");

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle), this);

    this.entity.canInteract = true;

    this.app.metalFence = this;
};

MetalFence.prototype.interact = function (playerInteract) {
    if (!playerInteract.rightItem || this.needId != playerInteract.rightItem.id) {
        this.app.fire('WarningTextController:setWarning', "You need " + this.needItem.name + " to cut!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    this.app.fire('WarningTextController:setWarning', "You cut the fence!", 3, new pc.Color(0, 1, 0, 1));
    playerInteract.setRightHand(null);

    if (this.app.room) {
        this.app.room.send("MetalFence:Interact");
    }
    else {
        this.unlock();
    }
}

MetalFence.prototype.unlock = function () {
    this.entity.sound.play("cutFence");
    this.collider.enabled = false;
    this.entity.render.enabled = false;

    this.locked = false;
    this.entity.canInteract = false;

    this.app.player.interact.refresh();
    toggleIndicator(this, false);

    this.app.fire("RefreshTutorial");
};