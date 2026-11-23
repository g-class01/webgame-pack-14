var InteractableWindow = pc.createScript('interactableWindow');
InteractableWindow.attributes.add("id", { type: "number" });
InteractableWindow.attributes.add("startRot", { type: "number" });

InteractableWindow.prototype.initialize = function () {
    this.toggle = false;

    this.rightWindow = this.entity.children[0];
    this.leftWindow = this.entity.children[1];

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle), this);

    this.indicator = this.entity.findByName("Indicator");
    this.collider = this.entity.findByName("Collider");

    this.entity.canInteract = true;
};

InteractableWindow.prototype.playSound = function (soundName, randomPitch = false) {
    if (this.entity.sound == null) return;
    this.slot = this.entity.sound.slot(soundName);
    if (this.slot == null) return;
    if (randomPitch) {
        this.slot.pitch = pc.math.random(0.8, 1.2);
    }
    this.slot.play();
};

InteractableWindow.prototype.interact = function (playerInteract) {
    if (this.app.room)
        this.app.room.send("InteractableWindow:Interact", { id: this.id, toggle: !this.toggle });
    else
        this.setToggle(!this.toggle);
};

InteractableWindow.prototype.setToggle = function (toggle) {
    this.toggle = toggle;
    this.collider.enabled = !this.toggle;

    if (this.toggle)
        this.playSound("open", true);
    else
        this.playSound("close", true);

    let rightRot = this.toggle ? this.startRot + 110 : this.startRot;
    this.leftRot = { value: this.toggle ? this.startRot : this.startRot - 110 }

    this.rightWindow
        .tween(this.rightWindow.getLocalEulerAngles())
        .rotate(new pc.Vec3(-90, rightRot, 0), .5, pc.QuinticOut)
        .start();

    this.app
        .tween(this.leftRot)
        .to({ value: this.toggle ? this.startRot - 110 : this.startRot }, .5, pc.QuinticOut)
        .onUpdate(() => {
            this.leftWindow.setLocalEulerAngles(-90, this.leftRot.value, 0);
        })
        .start();
}