var DsKeypad = pc.createScript('dsKeypad');

// Kilitli çıkış: 4 renkli direkte birer rakam var. Kapının önündeki aynı renkli plakaya
// basınca o rakam bir artar. 4 rakam doğruysa kapı açılır.
DsKeypad.prototype.initialize = function () {
    var self = this;
    this.signs = [];
    for (var i = 0; i < 4; i++) {
        var isl = this.entity.findByName('CodeIsland' + i);
        var d = isl && isl.findByName('Digit');
        this.signs.push(d);
    }
    this.plates = [];
    this.doorDigits = [];
    this.entered = [0, 0, 0, 0];
    for (var j = 0; j < 4; j++) {
        var plate = this.entity.findByName('CodePlate' + j);
        var trig = plate && plate.findByName('PlateTrigger');
        this.plates.push(plate);
        var dd = this.entity.findByName('DoorDigit' + j);
        this.doorDigits.push(dd && dd.findByName('Digit'));
        if (trig && trig.collision) {
            (function (idx) {
                trig.collision.on('triggerenter', function (other) { self.onPlate(idx, other); });
            })(j);
        }
    }
    this.gate = this.entity.findByName('ExitGate');
    this.gateBase = this.gate ? this.gate.getLocalPosition().clone() : null;
    this.open = 0;
    this.solved = false;
    this.seed = null;
};

DsKeypad.prototype.onPlate = function (idx, other) {
    var ds = this.app.dontSplash;
    if (!ds || other !== ds.player || this.solved) return;
    this.entered[idx] = (this.entered[idx] + 1) % 10;
    ds.play('click', 0.7);
    this.refresh();
    this.check();
};

DsKeypad.prototype.refresh = function () {
    for (var i = 0; i < 4; i++) {
        if (this.doorDigits[i]) this.doorDigits[i].element.text = String(this.entered[i]);
        if (this.signs[i] && this.code) this.signs[i].element.text = String(this.code[i]);
    }
};

DsKeypad.prototype.check = function () {
    if (!this.code) return;
    for (var i = 0; i < 4; i++) if (this.entered[i] !== this.code[i]) return;
    this.solved = true;
    var ds = this.app.dontSplash;
    ds.play('success', 1);
    ds.play('door', 0.9);
    this.app.fire('WarningTextController:setWarning', 'Code accepted! The door is open.', 3, new pc.Color(0, 1, 0, 1));
    for (var j = 0; j < 4; j++) if (this.doorDigits[j]) this.doorDigits[j].element.color = new pc.Color(0.4, 1, 0.5);
};

DsKeypad.prototype.update = function (dt) {
    var ds = this.app.dontSplash;
    if (!ds) return;
    var seed = ds.getSeed();
    if (seed !== this.seed) {
        this.seed = seed;
        var rnd = DontSplashManager.random(seed + 991);
        // Başlangıçtaki 0'lardan farklı olsun diye 1-9
        this.code = [0, 0, 0, 0].map(function () { return 1 + Math.floor(rnd() * 9); });
        this.refresh();
    }
    if (this.solved) this.open = Math.min(1, this.open + dt * 0.6);
    if (this.gate && this.gateBase) this.gate.setLocalPosition(this.gateBase.x, this.gateBase.y + this.open * 8.2, this.gateBase.z);
};
