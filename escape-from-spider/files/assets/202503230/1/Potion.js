var Potion = pc.createScript('potion');

Potion.prototype.initialize = function () {
    this.model = this.entity.findByName("Model");
    this.id =  Math.floor(pc.math.random(0, 6));
    
    this.model.children[this.id].enabled = true;

    this.entity.on("Start", this.onStart, this);
    this.entity.on("Removal", this.onDestroy, this);
    this.entity.on("Enabled", this.onEnabled, this);
    this.entity.on("Disabled", this.onDisabled, this);

    this.canUse = false;
};

Potion.prototype.update = function (dt) {
    if (!this.canUse || this.app.anyMenuEnabled() || this.app.isDied) return;

    if (window.touchJoypad.buttons.wasPressed('useButton') || this.app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) {
        this.app.player.controller.setProp(this.id);
        this.app.player.interact.setRightHand(null);
        this.app.player.inventory.selectSlot(null);
        this.id =  Math.floor(pc.math.random(0, 6));
        
        this.entity.fire("useItem");
    }
}

Potion.prototype.onStart = function () {
    
};

Potion.prototype.onDestroy = function () {

};

Potion.prototype.onEnabled = function () {
    this.canUse = true;
    this.app.ui.powerupButton.enabled = true;
};

Potion.prototype.onDisabled = function () {
    this.canUse = false;
    this.app.ui.powerupButton.enabled = false;
};