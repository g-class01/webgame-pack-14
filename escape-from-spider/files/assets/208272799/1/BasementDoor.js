var BasementDoor = pc.createScript('basementDoor');
BasementDoor.attributes.add("needId", { type: "number", default: -1 })
BasementDoor.attributes.add("leftDoor", { type: "entity" })
BasementDoor.attributes.add("rightDoor", { type: "entity" })
BasementDoor.attributes.add("lockEntity", { type: "entity" })
BasementDoor.attributes.add("collider", { type: "entity" })

BasementDoor.prototype.initialize = function () {
    this.needItem = this.app.itemDatabase.items[this.needId];

    this.locked = true;

    this.indicator = this.entity.findByName("Indicator");

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle), this);

    this.entity.canInteract = true;

    this.app.basementDoor = this;
};

BasementDoor.prototype.playSound = function (soundName, randomPitch = false) {
    if (this.entity.sound == null) return;
    this.slot = this.entity.sound.slot(soundName);
    if (this.slot == null) return;
    if (randomPitch) {
        this.slot.pitch = pc.math.random(0.8, 1.2);
    }
    this.slot.play();
};

BasementDoor.prototype.interact = function (playerInteract) {
    //basement da sonsuza kadar kalmasin diye icerden acabilsin veya spidersa
    if (this.app.playerLocation == LOCATIONS.BASEMENT || this.app.isSpider) {
        this.playSound("open", true);
        this.collider.enabled = false;
        this.lockEntity.enabled = false;
        this.rightDoor
            .tween(this.rightDoor.getLocalEulerAngles())
            .rotate(new pc.Vec3(0, 0, 120), 1, pc.Linear)
            .start();

        this.leftDoor
            .tween(this.leftDoor.getLocalEulerAngles())
            .rotate(new pc.Vec3(0, 0, -120), 1, pc.Linear)
            .start();
        //geri kapat
        setTimeout(() => {
            if (this.locked == true) {
                this.playSound("close", true);
                this.collider.enabled = true;
                this.lockEntity.enabled = true;
                this.rightDoor
                    .tween(this.rightDoor.getLocalEulerAngles())
                    .rotate(new pc.Vec3(0, 0, 0), 0.5, pc.Linear)
                    .start();

                this.leftDoor
                    .tween(this.leftDoor.getLocalEulerAngles())
                    .rotate(new pc.Vec3(0, 0, 0), 0.5, pc.Linear)
                    .start();
            }
        }, 3000);
        return;
    }
    if (!playerInteract.rightItem || this.needId != playerInteract.rightItem.id) {
        this.app.fire('WarningTextController:setWarning', "You need " + this.needItem.name + " to unlock!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    playerInteract.setRightHand(null);

    if (this.app.room) {
        this.app.room.send("BasementDoor:Interact");
    }
    else {
        this.unlock();
    }
}

BasementDoor.prototype.unlock = function () {
    this.playSound("open", true);

    this.entity.canInteract = false;

    this.locked = false;

    this.collider.enabled = false;
    this.lockEntity.enabled = false;

    this.app.player.interact.refresh();

    this.rightDoor
        .tween(this.rightDoor.getLocalEulerAngles())
        .rotate(new pc.Vec3(0, 0, 120), 1, pc.Linear)
        .start();

    this.leftDoor
        .tween(this.leftDoor.getLocalEulerAngles())
        .rotate(new pc.Vec3(0, 0, -120), 1, pc.Linear)
        .start();

    this.app.fire('WarningTextController:setWarning', "The basement door is now unlocked!", 5, new pc.Color(0, 1, 0, 1));

    toggleIndicator(this, false);

    this.app.fire("RefreshTutorial");
}