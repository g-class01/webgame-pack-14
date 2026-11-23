var InteractableCoin = pc.createScript('interactableCoin');
InteractableCoin.attributes.add("coinAmount", { type: "number" })

InteractableCoin.prototype.initialize = function () {
    this.model = this.entity.findByName("Model") ?? this.entity.children[0];
    this.indicator = this.entity.findByName("Indicator") ?? this.entity.children[1];

    this.collision = this.entity.collision;
    this.rigidbody = this.entity.rigidbody;

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle), this);

    this.entity.canInteract = true;
    this.entity.priority = 1;
};

InteractableCoin.prototype.interact = function () {
    this.model.enabled = false;
    this.collision.enabled = false;
    this.rigidbody.enabled = false;

    toggleIndicator(this, false);

    this.entity.canInteract = false;

    this.app.fire('WarningTextController:setWarning', "You got " + this.coinAmount + " coins!", 5, new pc.Color(0, 1, 0, 1));
    this.app.fire("AddCoin", this.coinAmount);
};