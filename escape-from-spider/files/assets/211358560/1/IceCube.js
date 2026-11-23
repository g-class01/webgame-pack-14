var IceCube = pc.createScript('iceCube');

// initialize code called once per entity
IceCube.prototype.initialize = function () {
    this.model = this.entity.findByName("Model");

    this.entity.on("Start", this.onStart, this);
    this.entity.on("Removal", this.onDestroy, this);
    this.entity.on("Enabled", this.onEnabled, this);
    this.entity.on("Disabled", this.onDisabled, this);
};

// update code called every frame
IceCube.prototype.update = function (dt) {
    if (!this.canUse || this.app.anyMenuEnabled() || this.app.isDied) return;

    if (window.touchJoypad.buttons.wasPressed('powerupButton') || this.app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) {
        let pos = this.app.player.entity.getPosition().clone();

        if (this.app.room)
            this.app.room.send("Spawn:IceCube", {
                xPos: pos.x,
                yPos: pos.y,
                zPos: pos.z
            })
        else {
            let ice = this.app.gameManager.iceTemplate.resource.instantiate();
            ice.reparent(this.app.root);
            ice.tags.add("Ice");
            ice.setPosition(pos);
            ice.script.ice.isOwner = true;

            ice.setLocalScale(pc.Vec3.ZERO);
            ice
                .tween(ice.getLocalScale())
                .to(pc.Vec3.ONE, .25, pc.QuinticOut)
                .start();
        }

        this.entity.fire("useItem");
    }
}

IceCube.prototype.onStart = function () {

};

IceCube.prototype.onDestroy = function () {

};

IceCube.prototype.onEnabled = function () {
    this.canUse = true;
    this.app.ui.powerupButton.enabled = true;
};

IceCube.prototype.onDisabled = function () {
    this.canUse = false;
    this.app.ui.powerupButton.enabled = false;
};