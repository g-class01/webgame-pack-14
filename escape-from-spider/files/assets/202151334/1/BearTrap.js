var BearTrap = pc.createScript('bearTrap');
BearTrap.attributes.add("trapTemplate", { type: "asset", assetType: "template" })

BearTrap.prototype.initialize = function () {
    this.entity.on("Start", this.onStart, this);
    this.entity.on("Removal", this.onDestroy, this);
    this.entity.on("Enabled", this.onEnabled, this);
    this.entity.on("Disabled", this.onDisabled, this);

    this.canUse = false;
};

BearTrap.prototype.update = function (dt) {
    if (!this.canUse || this.app.anyMenuEnabled() || this.app.isDied) return;

    if (window.touchJoypad.buttons.wasPressed('powerupButton') || this.app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) {
        const rayStart = this.entity.getPosition().clone();
        const rayEnd = rayStart.clone().sub(new pc.Vec3(0, 2, 0));

        const _rayResults = [
            this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd, "Ground"),
            this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd.clone().add(new pc.Vec3(0.5, 0, 0.5)), "Ground"),
            this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd.clone().add(new pc.Vec3(0.5, 0, -0.5)), "Ground"),
            this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd.clone().add(new pc.Vec3(-0.5, 0, 0.5)), "Ground"),
            this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd.clone().add(new pc.Vec3(-0.5, 0, -0.5)), "Ground")
        ];
        
        let success = false;
        let pos = pc.Vec3.ZERO;
        for (const result of _rayResults) {
            if (result) {
                pos = result.point.clone().add(new pc.Vec3(0, .1, 0));
                success = true;
                break;
            }
        }

        if (success) {
            if (this.app.room) {
                this.app.room.send("Spawn:BearTrap", {
                    xPos: pos.x,
                    yPos: pos.y,
                    zPos: pos.z,
                });
            }
            else {
                let trap = this.trapTemplate.resource.instantiate();
                this.app.root.addChild(trap);
                trap.setPosition(pos);
                trap.script.metalTrap.isOwner = true;
            }

            this.entity.fire("useItem");
        }
    }
}

BearTrap.prototype.onStart = function () {

};

BearTrap.prototype.onDestroy = function () {

};

BearTrap.prototype.onEnabled = function () {
    this.canUse = true;
    this.app.ui.powerupButton.enabled = true;
};

BearTrap.prototype.onDisabled = function () {
    this.canUse = false;
    this.app.ui.powerupButton.enabled = false;
};