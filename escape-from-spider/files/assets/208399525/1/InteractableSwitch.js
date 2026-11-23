var InteractableSwitch = pc.createScript('interactableSwitch');
InteractableSwitch.attributes.add("id", { type: "number" });
InteractableSwitch.attributes.add("targetEntity", { type: "entity" });
InteractableSwitch.attributes.add("unlockEvent", { type: "string" });
InteractableSwitch.attributes.add("unlockMessage", { type: "string" });
InteractableSwitch.attributes.add("targetRot", { type: "vec3" });

InteractableSwitch.prototype.initialize = function () {
    this.needItem = this.app.itemDatabase.items[this.needId];

    this.toggle = false;

    this.indicator = this.entity.findByName("Indicator");

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle && !this.toggle), this);

    this.entity.canInteract = true;
};

InteractableSwitch.prototype.playSound = function (soundName, randomPitch = false) {
    if (this.entity.sound == null) return;
    this.slot = this.entity.sound.slot(soundName);
    if (this.slot == null) return;
    if (randomPitch) {
        this.slot.pitch = pc.math.random(0.8, 1.2);
    }
    this.slot.play();
};

InteractableSwitch.prototype.interact = function (playerInteract) {
    if (this.toggle) return;

    if (this.app.room) {
        this.app.room.send("InteractableSwitch:Interact", { id: this.id });
    }
    else {
        this.unlock();
    }
}

InteractableSwitch.prototype.unlock = function () {
    if (this.toggle) return;
    this.toggle = true;
    this.playSound("trigger", true);
    this.playSound("electric");
    this.entity.canInteract = false;

    this.app.player.interact.refresh();
    this.app.fire(this.unlockEvent);

    this.targetEntity
        .tween(this.targetEntity.getLocalEulerAngles())
        .rotate(this.targetRot, 1, pc.QuinticOut)
        .start();

    this.app.fire('WarningTextController:setWarning', this.unlockMessage, 5, new pc.Color(0, 1, 0, 1));

    toggleIndicator(this, false);

    this.app.fire("RefreshTutorial");
}