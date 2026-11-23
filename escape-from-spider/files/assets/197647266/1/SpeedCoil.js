var SpeedCoil = pc.createScript('speedCoil');

SpeedCoil.prototype.initialize = function() {
    this.entity.on("Start", this.onStart, this);
    this.entity.on("Removal", this.onDestroy, this);
    this.entity.on("Enabled", this.onEnabled, this);
    this.entity.on("Disabled", this.onDisabled, this);

    this.using = false;
    this.timer = 0;
};

SpeedCoil.prototype.update = function (dt) {
    if (!this.using) return;

    this.timer += dt;
    if (this.timer > 1) {
        this.entity.fire("useItem");
        this.timer = 0;
    }
}

SpeedCoil.prototype.onStart = function () {
    this.timer = 0;
};

SpeedCoil.prototype.onDestroy = function () {

};

SpeedCoil.prototype.onEnabled = function () {
    this.using = true;
    this.app.player.properties.speedMul = 2.5;
};

SpeedCoil.prototype.onDisabled = function () {
    this.using = false;
    this.app.player.properties.speedMul = 1;
};