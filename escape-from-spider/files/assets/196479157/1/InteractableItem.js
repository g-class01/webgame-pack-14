var InteractableItem = pc.createScript('interactableItem');
InteractableItem.attributes.add("id", {
    type: "number", enum: [
        { 'Scroll': 2 },
        { 'Bat': 3 },
        { 'Axe': 6 },
        { 'Fusion': 8 },
        { 'GreenFusion': 10 },
        { 'YellowFusion': 11 },
        { 'Wrench': 12 },
        { 'KeyGray': 13, },
        { 'KeyRed': 14, },
        { 'KeyOrange': 15, },
        { 'KeyGreen': 16, },
        { 'KeyBlue': 17, },
        { 'KeyPurple': 18, },
        { 'KeyPink': 19, },
        { 'Cutter': 20, },
        { 'Trafo Cable Red': 25, },
        { 'Trafo Cable Green': 26, },
        { 'Trafo Cable Blue': 27, },
        { 'Carjack': 28, },
        { 'Codebook': 29, },
        { 'Fuel': 30, },
        { 'WoodPiece': 31, },
        { 'MetalPiece': 32, },
        { 'IronPiece': 33, },
        { 'GliderSeat': 34, },
        { 'GliderWing': 35, },
        { 'GliderWheel': 36, },
        { 'GliderPropeller': 37, },
        { 'GliderEngine': 38, },
        { 'Grenade': 39, },
    ]
});

InteractableItem.attributes.add("canPickup", { type: "boolean", default: true })
InteractableItem.attributes.add("resetIndicator", { type: "boolean", default: true })

InteractableItem.prototype.initialize = function () {
    this.item = this.app.itemDatabase.items.find(i => i.id == this.id);

    this.model = this.entity.findByName("Model") ?? this.entity.children[0];
    this.indicator = this.entity.findByName("Indicator") ?? this.entity.children[1];

    this.pickupText = this.indicator.findByName("PickupText") ?? this.indicator.children[1];
    if (this.resetIndicator) this.pickupText.element.text = "Pick Up " + this.item.name;

    this.collision = this.entity.collision;
    this.rigidbody = this.entity.rigidbody;

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle), this);

    this.entity.canInteract = this.canPickup;
    this.entity.priority = 1;

    this.app.on("ItemChanged", this.onItemChange, this);

    this.entity.on("destroy", () => {
        this.app.off("ItemChanged", this.onItemChange, this);
    }, this);
};

InteractableItem.prototype.playSound = function (soundName, randomPitch = false) {
    if (this.entity.sound == null) return;
    this.slot = this.entity.sound.slot(soundName);
    if (this.slot == null) return;
    if (randomPitch) {
        this.slot.pitch = pc.math.random(0.8, 1.2);
    }
    this.slot.play();
};

InteractableItem.prototype.onItemChange = function (item, interactable) {
    this.app.currentInteractable = interactable;

    if (!interactable || interactable != this)
        this.respawn();
}

InteractableItem.prototype.interact = function (playerInteract) {
    this.pickup();
    this.app.fire("RefreshTutorial");
};

InteractableItem.prototype.pickup = function () {
    if (!this.canPickup) return;
    this.playSound("pickup", true);
    this.model.enabled = false;
    this.collision.enabled = false;
    this.rigidbody.enabled = false;

    toggleIndicator(this, false);

    this.entity.canInteract = false;

    this.app.player.interact.setRightHand(this.item, this);
};

InteractableItem.prototype.respawn = function () {
    this.model.enabled = true;
    this.collision.enabled = true;
    this.rigidbody.enabled = true;

    this.entity.canInteract = true;
};