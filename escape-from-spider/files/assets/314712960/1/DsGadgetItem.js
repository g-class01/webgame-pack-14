var DsGadgetItem = pc.createScript('dsGadgetItem');

// Envanterdeki kanca / buz bombası: slotu seçiliyken sol tık (mobilde kullan butonu) ile kullanılır.
// Sağ elde tutulur (uzak oyuncularda da). İşi DsGadgets yapar.
DsGadgetItem.attributes.add('kind', { type: 'string', default: 'hook', description: 'hook | ice' });
DsGadgetItem.attributes.add('size', { type: 'number', default: 0, description: '0: şablondaki el duruşu aynen kullanılır (Steal and Run / oyunun eşyası gibi). >0: elde bu boyuta (m) ölçeklenir' });
DsGadgetItem.HOLD_POS = [18, 32, -2];   // sağ el kemiğine göre (çakıldaki gibi)

DsGadgetItem.prototype.initialize = function () {
    this.canUse = false;
    this.placed = false;
    this.entity.on('Enabled', this.onEnabled, this);
    this.entity.on('Disabled', this.onDisabled, this);
};

DsGadgetItem.prototype.isLocal = function () {
    for (var e = this.entity.parent; e; e = e.parent) {
        if (e.script && e.script.remotePlayerController) return false;
        if (e.script && e.script.playerController) return true;
    }
    return false;
};

DsGadgetItem.prototype.place = function () {
    if (this.placed) return;
    if (!DontSplashManager.moveToRightHand(this.entity)) return;
    this.placed = true;
    if (!(this.size > 0)) return;
    var P = DsGadgetItem.HOLD_POS;
    this.entity.setLocalPosition(P[0], P[1], P[2]);
    this.entity.setLocalEulerAngles(0, 0, 0);
};

// Eldeki model: en uzun kenarı 'size' m olacak şekilde ölçeklenir (kemik ölçeğinden bağımsız)
DsGadgetItem.prototype.fit = function () {
    if (this.fitted || !this.placed) return;
    if (!(this.size > 0)) { this.fitted = true; return; }
    var model = this.entity.findByName('Model');
    var rs = (model || this.entity).findComponents('render');
    var aabb = null;
    for (var i = 0; i < rs.length; i++) {
        var mis = rs[i].meshInstances;
        for (var j = 0; j < mis.length; j++) {
            if (!aabb) { aabb = new pc.BoundingBox(); aabb.copy(mis[j].aabb); } else aabb.add(mis[j].aabb);
        }
    }
    if (!aabb) return;
    var h = aabb.halfExtents, m = Math.max(h.x, h.y, h.z) * 2;
    if (!(m > 1e-5)) return;
    var s = this.entity.getLocalScale().clone().mulScalar(this.size / m);
    this.entity.setLocalScale(s);
    this.fitted = true;
};

DsGadgetItem.prototype.onEnabled = function () {
    this.place();
    this.canUse = true;
    if (this.app.ui && this.app.ui.powerupButton) this.app.ui.powerupButton.enabled = !!this.app.isMobile;
};

DsGadgetItem.prototype.onDisabled = function () {
    this.canUse = false;
    if (this.app.ui && this.app.ui.powerupButton) this.app.ui.powerupButton.enabled = false;
};

DsGadgetItem.prototype.update = function () {
    if (!this.placed) this.place();
    if (!this.fitted) this.fit();
    if (!this.canUse || this.app.isDied || (this.app.anyMenuEnabled && this.app.anyMenuEnabled())) return;
    var g = this.app.dsGadgets;
    if (!g || !this.isLocal()) return;
    var pressed = (this.app.mouse && this.app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) ||
        (window.touchJoypad && window.touchJoypad.buttons && window.touchJoypad.buttons.wasPressed('powerupButton'));
    if (!pressed) return;
    if (this.kind === 'ice') g.throwIce();
    else g.useHook();
};
