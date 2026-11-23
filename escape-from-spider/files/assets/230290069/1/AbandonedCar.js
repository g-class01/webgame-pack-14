var AbandonedCar = pc.createScript('abandonedCar');
AbandonedCar.attributes.add("carjack", { type: "entity" })
AbandonedCar.attributes.add("car", { type: "entity" })

AbandonedCar.prototype.initialize = function () {
    this.indicator = this.entity.findByName("Indicator");

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle), this);

    this.app.abandonedCar = this;
    this.locked = true;

    this.entity.canInteract = true;
};

AbandonedCar.prototype.interact = function (playerInteract) {
    if (!playerInteract.rightItem || Item.Carjack != playerInteract.rightItem.id) {
        this.app.fire('WarningTextController:setWarning', "You need a carjack to place!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    this.app.player.interact.setRightHand(null);

    if (this.app.room) this.app.room.send("AbandonedCar:Unlock");
    else this.unlock();
};

AbandonedCar.prototype.unlock = function () {
    this.carjack.enabled = true;
    this.car.children[0].enabled = false;
    this.car.rigidbody.type = "dynamic";
    this.car.rigidbody.applyImpulse(-20, 5, 0);
    this.car.rigidbody.applyTorqueImpulse(-20, 30, 0);

    this.locked = false;

    this.entity.canInteract = false;
    this.app.player.interact.refresh();
    toggleIndicator(this, false);

    this.app.fire("RefreshTutorial");
}
