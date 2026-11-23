var InteractablePlayerCage = pc.createScript('interactablePlayerCage');

InteractablePlayerCage.prototype.initialize = function () {
    this.indicator = this.entity.findByName("Indicator");
    this.collider = this.entity.findByName("Collider");
    this.door = this.entity.findByName("CageDoor");

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle && this.isOwner), this);

    this.setDoor(false);
};

InteractablePlayerCage.prototype.interact = function () {
    if (!this.isOwner) return;
    if (this.unlocked) return;

    if (this.app.room) {
        this.app.room.send("InteractablePlayerCage:Interact", {
            id: this.id,
            toggle: !this.toggle
        })
    }
    else {
        this.setDoor(!this.toggle);
    }
};

InteractablePlayerCage.prototype.setDoor = function (doorOpen) {
    this.toggle = doorOpen;
    this.collider.enabled = !doorOpen;

    this.door
        .tween(this.door.getLocalEulerAngles())
        .rotate(new pc.Vec3(0, 0, doorOpen ? 120 : 0), .25, pc.QuinticOut)
        .start();
}

InteractablePlayerCage.prototype.unlock = function () {
    this.setDoor(true);
    this.entity.canInteract = false;
    toggleIndicator(this, false);
    this.unlocked = true;
}