var Flashlight = pc.createScript('flashlight');

Flashlight.prototype.initialize = function() {
    this.entity.on("Start", this.onStart, this);
    this.entity.on("Removal", this.onDestroy, this);
    this.entity.on("Enabled", this.onEnabled, this);
    this.entity.on("Disabled", this.onDisabled, this);

    this.using = false;
    this.timer = 0;
};

Flashlight.prototype.update = function (dt) {
    if (!this.using) return;

    this.timer += dt;
    if (this.timer > 1) {
        this.entity.fire("useItem");
        this.timer = 0;
    }
}

Flashlight.prototype.onStart = function () {
    this.timer = 0;
};

Flashlight.prototype.onDestroy = function () {

};

Flashlight.prototype.onEnabled = function () {
    this.using = true;
    this.tweenLight(new pc.Color(.75, .75, .75));
};

Flashlight.prototype.onDisabled = function () {
    this.using = false;
    this.tweenLight(this.app.ambientLight.startColor);
};

Flashlight.prototype.tweenLight = function (color) {
    this.app
        .tween(this.app.ambientLight.color)
        .to(color, .5, pc.SineOut)
        .onUpdate(() => {
            this.app.scene.ambientLight = this.app.ambientLight.color;
        })
        .start();
}