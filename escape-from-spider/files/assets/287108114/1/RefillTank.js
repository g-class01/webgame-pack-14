var RefillTank = pc.createScript('refillTank');

RefillTank.prototype.initialize = function () {
    this.indicator = this.entity.findByName("Indicator");

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle), this);

    this.app.refillTank = this;
    this.locked = true;

    this.entity.canInteract = true;
};

RefillTank.prototype.interact = function (playerInteract) {
    if (this.app.tutorialManagerThree.state != ObjectiveStatesThree.PowerElectric) {
        this.app.fire('WarningTextController:setWarning', "Finish other tasks first!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    if (!playerInteract.rightItem || Item.Fuel != playerInteract.rightItem.id) {
        this.app.fire('WarningTextController:setWarning', "You need a fuel to refill!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    if (this.app.refilledFuel) {
        this.app.fire('WarningTextController:setWarning', "You already refilled your fuel!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    this.app.refilledFuel = true;
    this.app.fire('WarningTextController:setWarning', "You refilled your fuel!", 3, new pc.Color(0, 1, 0, 1));

    this.app.fire("RefreshTutorial")
};