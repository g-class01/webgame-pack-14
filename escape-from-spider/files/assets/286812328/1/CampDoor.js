var CampDoor = pc.createScript('campDoor');
CampDoor.attributes.add('leftDoor', { type: "entity" });
CampDoor.attributes.add('rightDoor', { type: "entity" });

CampDoor.prototype.initialize = function () {
    this.indicator = this.entity.findByName("Indicator");
    this.doorCollider = this.entity.findByName("DoorCollider");

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle), this);

    this.app.campDoor = this;
    this.locked = true;

    this.entity.canInteract = true;
};

CampDoor.prototype.interact = function (playerInteract) {
    if (!playerInteract.rightItem || Item.KeyBlue != playerInteract.rightItem.id) {
        this.app.fire('WarningTextController:setWarning', "You need the blue key to unlock!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    this.app.player.interact.setRightHand(null);

    if (this.app.room) this.app.room.send("CampDoor:Unlock");
    else this.unlock();
};

CampDoor.prototype.unlock = function () {
    this.doorCollider.enabled = false;
    this.locked = false;

    this.entity.canInteract = false;
    this.app.player.interact.refresh();
    toggleIndicator(this, false);

    this.rightDoor
        .tween(this.rightDoor.getLocalEulerAngles())
        .rotate(new pc.Vec3(0, -120, ), 1, pc.Linear)
        .start();

    this.leftDoor
        .tween(this.leftDoor.getLocalEulerAngles())
        .rotate(new pc.Vec3(0, 120, 0), 1, pc.Linear)
        .start();

    this.app.fire("RefreshTutorial");
}
