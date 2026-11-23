var DsPebbleItem = pc.createScript('dsPebbleItem');

// Envanterdeki çakıl: slotu seçiliyken sol tık (mobilde kullan butonu) ile fırlatılır.
// Sağ elde tutulur (savurma animasyonu sağ kolla); uzak oyuncularda da aynı.
DsPebbleItem.HOLD_POS = [18, 32, -2];   // sağ el kemiğine göre (avuç altı, yumruktan görünür)
DsPebbleItem.HOLD_SCALE = 34;

DsPebbleItem.prototype.initialize = function () {
    this.canUse = false;
    this.placed = false;
    this.entity.on('Enabled', this.onEnabled, this);
    this.entity.on('Disabled', this.onDisabled, this);
};

DsPebbleItem.prototype.place = function () {
    if (this.placed) return;
    if (!DontSplashManager.moveToRightHand(this.entity)) return;
    this.placed = true;
    var e = this.entity;
    var P = DsPebbleItem.HOLD_POS, S = DsPebbleItem.HOLD_SCALE;
    e.setLocalPosition(P[0], P[1], P[2]);
    e.setLocalEulerAngles(0, 0, 0);
    e.setLocalScale(1, 1, 1);
    var model = e.findByName('Model');
    if (model) { model.setLocalPosition(0, 0, 0); model.setLocalEulerAngles(0, 0, 0); model.setLocalScale(1, 1, 1); }
    var stone = e.findByName('Stone');
    if (stone) {
        stone.setLocalPosition(0, 0, 0);
        stone.setLocalEulerAngles(20, 35, 10);
        stone.setLocalScale(S, S, S);
        DontSplashManager.makeRock(stone.render);
    }
};

DsPebbleItem.prototype.onEnabled = function () {
    this.place();
    this.canUse = true;
    if (this.app.ui && this.app.ui.powerupButton) this.app.ui.powerupButton.enabled = !!this.app.isMobile;
};

DsPebbleItem.prototype.onDisabled = function () {
    this.canUse = false;
    if (this.app.ui && this.app.ui.powerupButton) this.app.ui.powerupButton.enabled = false;
};

DsPebbleItem.prototype.update = function () {
    if (!this.placed) this.place();
    if (!this.canUse || this.throwing || this.app.isDied || (this.app.anyMenuEnabled && this.app.anyMenuEnabled())) return;
    var ds = this.app.dontSplash;
    if (!ds) return;
    var pressed = (this.app.mouse && this.app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) ||
        (window.touchJoypad && window.touchJoypad.buttons && window.touchJoypad.buttons.wasPressed('powerupButton'));
    if (!pressed) return;
    var self = this;
    // Taş, savurmanın ortasında elden çıkınca envanterden düşer
    if (ds.throwPebble(function () { if (!self.entity._destroyed) self.entity.fire('useItem'); })) this.throwing = true;
};
