var InteractableButton = pc.createScript('interactableButton');
InteractableButton.attributes.add("interactEvent", { type: "string" })

InteractableButton.prototype.initialize = function () {
    this.model = this.entity.findByName("Model") ?? this.entity.children[0];
    this.indicator = this.entity.findByName("Indicator") ?? this.entity.children[1];

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle), this);

    this.entity.canInteract = true;
}

InteractableButton.prototype.interact = function (playerInteract) {
    this.app.fire(this.interactEvent);
}