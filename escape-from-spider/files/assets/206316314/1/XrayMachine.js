var XrayMachine = pc.createScript('xrayMachine');

XrayMachine.prototype.initialize = function() {
    this.entity.on("Start", this.onStart, this);
    this.entity.on("Removal", this.onDestroy, this);
    this.entity.on("Enabled", this.onEnabled, this);
    this.entity.on("Disabled", this.onDisabled, this);

    this.canUse = false;
};

XrayMachine.prototype.update = function (dt) {
    if (!this.canUse || this.app.anyMenuEnabled() || this.app.isDied) return;

    if (window.touchJoypad.buttons.wasPressed('powerupButton') || this.app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) {
        // use xray
        
        this.entity.fire("useItem");
    }
}

XrayMachine.prototype.onStart = function () {
    
};

XrayMachine.prototype.onDestroy = function () {

};

XrayMachine.prototype.onEnabled = function () {
    this.canUse = true;
    this.app.ui.powerupButton.enabled = true;
};

XrayMachine.prototype.onDisabled = function () {
    this.canUse = false;
    this.app.ui.powerupButton.enabled = false;
};