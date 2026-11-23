var Scissors = pc.createScript('scissors');

Scissors.prototype.initialize = function () {
    this.entity.on("Start", this.onStart, this);
    this.entity.on("Removal", this.onDestroy, this);
    this.entity.on("Enabled", this.onEnabled, this);
    this.entity.on("Disabled", this.onDisabled, this);

    this.canUse = false;
};

Scissors.prototype.update = function (dt) {
    if (!this.canUse || this.app.anyMenuEnabled() || this.app.isDied) return;

    if (window.touchJoypad.buttons.wasPressed('powerupButton') || this.app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) {
        if (!this.app.caughtWeb) {
            this.app.fire('WarningTextController:setWarning', "There is no web you got caught.", 3, new pc.Color(1, 1, 0, 1));
            return;
        }

        let web = this.app.caughtWeb;

        if (web.entity)
            web.entity.sound.play("uncaught");

        clearTimeout(web.caughtTimeout);
        this.app.player.canMove = true;
        this.app.player.controller.setCaught(false);
        this.app.caughtWeb = null;

        web.model
            .tween(web.model.getLocalScale())
            .to(new pc.Vec3(0, 0, 0), .35, pc.QuanticOut)
            .onComplete(() => {
                if (this.app.room && web.id) {
                    this.app.room.send("Despawn:SpiderWeb", { id: web.id })
                }
                else {
                    web.entity.destroy();
                }
            })
            .start();

        this.entity.fire("useItem");
    }
}

Scissors.prototype.onStart = function () {

};

Scissors.prototype.onDestroy = function () {

};

Scissors.prototype.onEnabled = function () {
    this.canUse = true;
    this.app.ui.powerupButton.enabled = true;
};

Scissors.prototype.onDisabled = function () {
    this.canUse = false;
    this.app.ui.powerupButton.enabled = false;
};