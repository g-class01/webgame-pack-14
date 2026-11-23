var DsExitDoor = pc.createScript('dsExitDoor');

// Don't Splash çıkış kapısı: lobideki mod kapılarıyla aynı model. Oyuncu yaklaşınca kapı açılır
// (lobideki gibi yaylanarak), uzaklaşınca kapanır. Kapıdan girince EnterTrigger (DSExit) bitiş ekranını açar.
DsExitDoor.attributes.add('openDist', { type: 'number', default: 13, description: 'Bu mesafede (m) kapı açılır' });
DsExitDoor.CLOSED = 180;
DsExitDoor.OPEN = 55;

DsExitDoor.prototype.initialize = function () {
    this.door = this.entity.findByName('Portal_Door');
    this.isOpen = false;
    this.t = 1;
    this.from = DsExitDoor.CLOSED;
    this.to = DsExitDoor.CLOSED;
    this.dur = 1;
    this.angle = DsExitDoor.CLOSED;   // açıyı kendimiz tutarız (getLocalEulerAngles eşdeğer başka açı döndürebilir)
};

DsExitDoor.prototype.setOpen = function (open) {
    if (open === this.isOpen || !this.door) return;
    this.isOpen = open;
    this.from = this.angle;
    this.to = open ? DsExitDoor.OPEN : DsExitDoor.CLOSED;
    this.dur = open ? 1 : 0.2;
    this.t = 0;
    var s = this.entity.sound;
    if (s && s.slot(open ? 'open' : 'close')) s.play(open ? 'open' : 'close');
};

// pc.ElasticOut ile aynı eğri (lobideki kapı açılışı)
DsExitDoor.elasticOut = function (k) {
    if (k <= 0) return 0;
    if (k >= 1) return 1;
    var a = 1, p = 0.4, s = p / 4;
    return a * Math.pow(2, -10 * k) * Math.sin((k - s) * (2 * Math.PI) / p) + 1;
};

DsExitDoor.prototype.update = function (dt) {
    var ds = this.app.dontSplash;
    if (!ds || !ds.player || !this.door) return;
    var p = ds.player.getPosition(), e = this.entity.getPosition();
    this.setOpen(Math.hypot(p.x - e.x, p.z - e.z) < this.openDist);
    if (this.t < 1) {
        this.t = Math.min(1, this.t + dt / this.dur);
        var k = this.isOpen ? DsExitDoor.elasticOut(this.t) : this.t;
        this.angle = this.from + (this.to - this.from) * k;
        this.door.setLocalEulerAngles(0, 0, this.angle);
    }
};
