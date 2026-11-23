var DsBatItem = pc.createScript('dsBatItem');

// Envanterdeki sopa (Steal and Run'daki sopa): slotu seçiliyken sol tık (mobilde kullan butonu)
// ile savrulur, önündeki oyuncuyu iter. Tükenmez. Sağ elde tutulur (uzak oyuncularda da).
// Elde tutulurken vuruş animasyonu beyzbol savurmasıyla değişir.
DsBatItem.SWING_ANIM = 314398411;

DsBatItem.prototype.initialize = function () {
    this.canUse = false;
    this.placed = false;
    this.entity.on('Enabled', this.onEnabled, this);
    this.entity.on('Disabled', this.onDisabled, this);
    this.on('enable', this.swapAnim, this);
    this.on('disable', this.restoreAnim, this);
    this.on('destroy', this.restoreAnim, this);
};

// Bu eşyayı tutan karakterin anim bileşeni (yerel ya da uzak)
DsBatItem.prototype.ownerAnim = function () {
    for (var e = this.entity.parent; e; e = e.parent) {
        if (e.script && e.script.remotePlayerController) return e.script.remotePlayerController.playerBody && e.script.remotePlayerController.playerBody.anim;
        if (e.script && e.script.playerController) return e.script.playerController._animComponent;
    }
    return null;
};

DsBatItem.prototype.swapAnim = function () {
    var anim = this.ownerAnim();
    var a = this.app.assets.get(DsBatItem.SWING_ANIM);
    if (!anim || !a) return;
    var self = this;
    a.ready(function () {
        if (!self.entity.enabled || !self.enabled || self.entity._destroyed) return;
        try { anim.assignAnimation('Hit', a.resource, 'UpBody', 1); self.swapped = anim; } catch (e) { }
    });
    if (!a.loaded) this.app.assets.load(a);
};

DsBatItem.prototype.restoreAnim = function () {
    var anim = this.swapped;
    this.swapped = null;
    if (!anim) return;
    var info = anim.animationAssets && anim.animationAssets['UpBody:Hit'];
    var orig = info && this.app.assets.get(info.asset);
    try { if (orig && orig.resource) anim.assignAnimation('Hit', orig.resource, 'UpBody'); } catch (e) { }
};

DsBatItem.prototype.place = function () {
    if (this.placed) return;
    if (DontSplashManager.moveToRightHand(this.entity)) {
        this.placed = true;
        if (this.entity.enabled) this.swapAnim();
    }
};

DsBatItem.prototype.onEnabled = function () {
    this.place();
    this.swapAnim();
    this.canUse = true;
    if (this.app.ui && this.app.ui.powerupButton) this.app.ui.powerupButton.enabled = !!this.app.isMobile;
};

DsBatItem.prototype.onDisabled = function () {
    this.canUse = false;
    this.restoreAnim();
    if (this.app.ui && this.app.ui.powerupButton) this.app.ui.powerupButton.enabled = false;
};

DsBatItem.prototype.update = function () {
    if (!this.placed) this.place();
    if (!this.canUse || this.app.isDied || (this.app.anyMenuEnabled && this.app.anyMenuEnabled())) return;
    var ds = this.app.dontSplash;
    if (!ds) return;
    var pressed = (this.app.mouse && this.app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) ||
        (window.touchJoypad && window.touchJoypad.buttons && window.touchJoypad.buttons.wasPressed('powerupButton'));
    if (pressed) ds.swingBat();
};
