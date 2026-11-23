var CageSpawner = pc.createScript('cageSpawner');

CageSpawner.prototype.initialize = function () {
    this.model = this.entity.findByName("Model");

    this.entity.on("Start", this.onStart, this);
    this.entity.on("Removal", this.onDestroy, this);
    this.entity.on("Enabled", this.onEnabled, this);
    this.entity.on("Disabled", this.onDisabled, this);
};

// update code called every frame
CageSpawner.prototype.update = function (dt) {
    if (!this.canUse || this.app.anyMenuEnabled()) return;

    if (window.touchJoypad.buttons.wasPressed('powerupButton') || this.app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) {
        let pos = this.app.player.entity.getPosition().clone().add(this.app.player.controller.body.forward.clone().scale(-10).add(new pc.Vec3(0, 1.8, 0)));

        let playerPos = this.app.player.entity.getPosition().clone();
        let playerRot = this.app.player.controller.body.getEulerAngles().clone();
        let reverseRot = !(Math.abs(playerRot.x - 180) <= 1 || Math.abs(playerRot.x + 180) <= 1)
            && !(Math.abs(playerRot.z - 180) <= 1 || Math.abs(playerRot.z + 180) <= 1);

        playerPos.y = pos.y;

        if (this.app.room)
            this.app.room.send("Spawn:Cage", {
                xPos: pos.x,
                yPos: pos.y,
                zPos: pos.z,
                playerX: playerPos.x,
                playerY: playerPos.y,
                playerZ: playerPos.z,
                reverseRot: reverseRot
            })
        else {
            let cage = this.app.gameManager.cageTemplate.resource.instantiate();
            cage.reparent(this.app.root);
            cage.setPosition(pos);
            cage.lookAt(playerPos);

            let eulerAngles = cage.getEulerAngles();
            cage.setEulerAngles(eulerAngles.x, eulerAngles.y + (reverseRot ? -90 : 90), eulerAngles.z);

            cage.script.interactablePlayerCage.isOwner = true;
            cage.canInteract = true;

            setTimeout(() => {
                cage.destroy();
            }, 10000);
        }

        this.entity.fire("useItem");
    }
}

CageSpawner.prototype.onStart = function () {

};

CageSpawner.prototype.onDestroy = function () {
    this.app.player.controller.cageGhost.enabled = false;
};

CageSpawner.prototype.onEnabled = function () {
    this.canUse = true;
    this.app.ui.powerupButton.enabled = true;
    this.app.player.controller.cageGhost.enabled = true;
};

CageSpawner.prototype.onDisabled = function () {
    this.canUse = false;
    this.app.ui.powerupButton.enabled = false;
    this.app.player.controller.cageGhost.enabled = false;
};