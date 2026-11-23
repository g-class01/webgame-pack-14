var Axe = pc.createScript('axe');

Axe.prototype.initialize = function () {
    this.canAttack = true;
};

Axe.prototype.update = function (dt) {
    if (window.touchJoypad.buttons.wasPressed('shootButton') || this.app.mouse.wasPressed(0)) {
        if (!this.canAttack || this.app.anyMenuEnabled()) return;

        this.canAttack = false;
        this.app.player.controller._animComponent.setBoolean("hit", true);

        if (this.app.isFPS)
            this.app.player.fpsAnimator.right.fire("Motion", "hit");

        this.checkPlanks();

        setTimeout(() => {
            this.app.player.controller._animComponent.setBoolean("hit", false);
        }, 500);
        setTimeout(() => {
            this.canAttack = true;
        }, 1500);
    }
};

Axe.prototype.checkPlanks = function () {
    const playerPosition = this.entity.getPosition();
    const maxDistance = 4;

    const plankEntities = this.app.root.findByTag("Plank");

    plankEntities.forEach((plank) => {
        if (plank.enabled && plank.transform != null) {
            const distance = playerPosition.clone().sub(plank.getPosition()).length();
            if (distance < maxDistance) {
                if (this.app.room) {
                    this.app.room.send("InteractableTransform:PlankDamage", { id: plank.transform.id })
                }
                else {
                    plank.fire("damage");
                }
                return;
            }
        }
    });
};