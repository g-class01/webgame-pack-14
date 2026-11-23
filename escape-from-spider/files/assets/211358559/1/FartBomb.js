var FartBomb = pc.createScript('fartBomb');

// initialize code called once per entity
FartBomb.prototype.initialize = function () {
    this.model = this.entity.findByName("Model");

    this.entity.on("Start", this.onStart, this);
    this.entity.on("Removal", this.onDestroy, this);
    this.entity.on("Enabled", this.onEnabled, this);
    this.entity.on("Disabled", this.onDisabled, this);
};

// update code called every frame
FartBomb.prototype.update = function (dt) {
    if (!this.canUse || this.app.anyMenuEnabled() || this.app.isDied) return;

    if (window.touchJoypad.buttons.wasPressed('powerupButton') || this.app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) {
        let pos = this.app.player.entity.getPosition().clone();

        if (this.app.room)
            this.app.room.send("Spawn:Fart", {
                xPos: pos.x,
                yPos: pos.y,
                zPos: pos.z
            })
        else {
            let fart = this.app.gameManager.fartTemplate.resource.instantiate();
            fart.reparent(this.app.root);
            fart.tags.add("Fart");
            fart.setPosition(pos);
            fart.script.fart.isOwner = true;

            fart.setLocalScale(pc.Vec3.ZERO);
            fart
                .tween(fart.getLocalScale())
                .to(pc.Vec3.ONE, .25, pc.QuinticOut)
                .start();
        }

        this.entity.fire("useItem");
    }
}

FartBomb.prototype.onStart = function () {

};

FartBomb.prototype.onDestroy = function () {

};

FartBomb.prototype.onEnabled = function () {
    this.canUse = true;
    this.app.ui.powerupButton.enabled = true;
};

FartBomb.prototype.onDisabled = function () {
    this.canUse = false;
    this.app.ui.powerupButton.enabled = false;
};