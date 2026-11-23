var FlareGun = pc.createScript('flareGun');

FlareGun.prototype.initialize = function () {
    this.entity.on("Start", this.onStart, this);
    this.entity.on("Removal", this.onDestroy, this);
    this.entity.on("Enabled", this.onEnabled, this);
    this.entity.on("Disabled", this.onDisabled, this);

    this.canUse = false;
};

FlareGun.prototype.update = function (dt) {
    if (!this.canUse || this.app.anyMenuEnabled() || this.app.isDied) return;

    if (window.touchJoypad.buttons.wasPressed('powerupButton') || this.app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) {
        var camera = this.app.network.localCamera;
        var cameraForward = camera.forward.clone();

        //let spawnPos = this.app.player.entity.getPosition().clone();
        let spawnPos;

        if (this.app.isFPS) {
            //spawnPos = this.app.player.entity.getPosition().clone().add(new pc.Vec3(-.7, 1.3, 0));
            spawnPos = this.app.root.findByName("FPSAnimatorLeft").findByName("Point").getPosition().clone();
        }
        else {
            spawnPos = this.entity.findByName("Point").getPosition().clone();
        }
        let lookAtPos = spawnPos.clone().add(cameraForward);

        if (this.app.room)
            this.app.room.send("Spawn:Flare", {
                xPos: spawnPos.x,
                yPos: spawnPos.y,
                zPos: spawnPos.z,
                xLook: lookAtPos.x,
                yLook: lookAtPos.y,
                zLook: lookAtPos.z,
            })
        else {
            let flare = this.app.gameManager.flareTemplate.resource.instantiate();
            this.app.root.addChild(flare);
            flare.setPosition(spawnPos);
            flare.script.flare.isOwner = true;
            flare.lookAt(lookAtPos);
        }

        this.entity.fire("useItem");
    }
}

FlareGun.prototype.onStart = function () {

};

FlareGun.prototype.onDestroy = function () {

};

FlareGun.prototype.onEnabled = function () {
    this.canUse = true;
    this.app.ui.powerupButton.enabled = true;
};

FlareGun.prototype.onDisabled = function () {
    this.canUse = false;
    this.app.ui.powerupButton.enabled = false;
};