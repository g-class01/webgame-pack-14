var DsSfx = pc.createScript('dsSfx');

// Don't Splash modunun eksik sesleri. Oyun mantığına dokunmaz: parkur blokları, batan bloklar,
// canavarlar, checkpoint, bölüm yazısı ve damlaların durum değişimlerini izleyip ses çalar.
// (DSWorld üzerinde, dontSplashManager / dsParkour / dsAtmosphere / dsGadgets'tan sonra)
//  - kırılan blok: basınca çatırtı, düşerken gümbürtü, suya düşünce küçük şıpırtı
//  - hafıza köprüsü: yanlış karoya basınca uyarı sesi
//  - batan blok: batarken alçak uğultu + kabarcık, geri çıkarken kabarcık
//  - canavar: seni duyunca hırıltı, suda koşarken şapırtı, sersemleyince inleme, yakalayınca kahkaha
//  - buz bombası: buz kırılma sesi
//  - checkpoint / bölüm yazısı / kazanma: kısa fanfar
//  - tavandan damlayan su: yakına düşünce minik "plop"
//  - her bölümün ambiyans sesi farklı perdede (bölümler aynı havayı vermesin)
DsSfx.SND = {
    roar: 215312561,       // snakeHissing (perdesi düşürülünce hırıltı)
    laugh: 227523379,      // centipedeCatchLaugh
    stunned: 227523441,    // centipedeStunned
    ice: 215707577,        // ice
    wrong: 215314120,      // warning
    checkpoint: 214864106, // missionCompleted
    popup: 215715945,      // popup
    splashS: 314358179,    // DS_Splash (küçük, tiz)
    bubble: 314358184,     // DS_Bubble1
    crack: 315371203,      // DS_Crack: kırılan karo
    rumble: 315371204,     // DS_Rumble: düşen / batan blok
    plop: 315371206,       // DS_Drip: tavandan damla
    thud: 315371207,       // DS_WoodLand: tahta sala iniş
    slosh: 315371209       // DS_Slosh: salın altında su şapırtısı
};
// bölüm ambiyans perdesi (güvenli zeminlerde 1)
// 20 bölüm: salonlar ilerledikçe ambiyans biraz daha pes (gerilim artsın)
DsSfx.AMB_PITCH = [1, 0.93, 1.06, 0.88, 0.82, 0.74, 0.95, 0.86, 1.02, 0.8, 0.9, 0.76, 0.92, 0.84, 0.98, 0.78, 0.88, 0.72, 0.82, 0.7];

DsSfx.prototype.initialize = function () {
    var app = this.app;
    this.holder = new pc.Entity('DsSfx');
    this.holder.addComponent('sound', { positional: false, volume: 1 });
    this.entity.addChild(this.holder);
    this.snd = this.holder.sound;
    var self = this;
    Object.keys(DsSfx.SND).forEach(function (k) {
        var a = app.assets.get(DsSfx.SND[k]);
        if (!a) return;
        if (!a.loaded) app.assets.load(a);
        self.snd.addSlot(k, { asset: a.id, volume: 1, overlap: true, autoPlay: false, loop: false });
    });
    this.prevBlock = new Map();
    this.prevSink = [];
    this.mon = [];
    this.prevDrip = [];
    this.prevCaught = false;
    this.prevCheckpoint = null;
    this.prevFinished = false;
    this.prevSec = 0;
    this.laughT = -1;
    this.ampT = 0;
    this.on('destroy', function () { if (this.holder) this.holder.destroy(); }, this);
};

// mesafeye göre kısılan ses (pos yoksa tam ses)
DsSfx.prototype.playAt = function (name, pos, vol, p0, p1, maxD) {
    var slot = this.snd.slot(name);
    if (!slot) return null;
    var v = vol === undefined ? 1 : vol;
    if (pos) {
        var ds = this.app.dontSplash;
        var me = ds && ds.player ? ds.player.getPosition() : pos;
        var d = Math.hypot(pos.x - me.x, pos.z - me.z);
        var k = 1 - d / (maxD || 40);
        if (k <= 0) return null;
        v *= Math.pow(k, 1.5);
    }
    if (v < 0.02) return null;
    var inst = slot.play();
    if (inst) {
        inst.volume = v;
        inst.pitch = p0 === undefined ? 1 : pc.math.random(p0, p1 === undefined ? p0 : p1);
    }
    return inst;
};

DsSfx.prototype.update = function (dt) {
    this.time = (this.time || 0) + dt;
    var ds = this.app.dontSplash;
    if (!ds || !ds.player) return;
    var me = ds.player.getPosition();
    var scripts = this.entity.script;
    var pk = scripts && scripts.dsParkour;
    var atm = scripts && scripts.dsAtmosphere;

    // ---- parkur blokları
    if (pk && pk.blocks) {
        for (var i = 0; i < pk.blocks.length; i++) {
            var b = pk.blocks[i];
            var pv = this.prevBlock.get(b);
            if (pv === undefined) { this.prevBlock.set(b, { s: b.state, sp: !!b.splashed }); continue; }
            if (b.kind === 'crumble' || (b.kind === 'mem' && !b.safe)) {
                if (pv.s === 0 && b.state === 1) {
                    this.playAt('crack', b.baseW, b.kind === 'mem' ? 0.5 : 0.75, 0.85, 1.15, 45);
                    if (b.kind === 'mem' && Math.hypot(b.baseW.x - me.x, b.baseW.z - me.z) < 4) this.playAt('wrong', null, 0.55, 1, 1);
                }
                if (pv.s === 1 && b.state === 2) this.playAt('rumble', b.baseW, 0.55, 0.9, 1.2, 45);
                if (!pv.sp && b.splashed) this.playAt('splashS', b.baseW, 0.4, 1.25, 1.45, 50);
            }
            pv.s = b.state; pv.sp = !!b.splashed;
        }
    }

    // ---- batan bloklar
    var sk = ds.sinkers || [];
    for (var j = 0; j < sk.length; j++) {
        var s = sk[j], ps = this.prevSink[j];
        var sp = s.e.getPosition();
        if (ps === 0 && s.state === 1) {
            this.playAt('rumble', sp, 0.5, 0.75, 0.9, 40);
            this.playAt('bubble', sp, 0.6, 0.55, 0.7, 40);
        }
        if (ps === 1 && s.state === 2) this.playAt('bubble', sp, 0.35, 0.8, 0.95, 35);
        if (ps === 2 && s.state === 3) this.playAt('bubble', sp, 0.3, 1.1, 1.3, 30);
        this.prevSink[j] = s.state;
    }

    // ---- canavarlar
    var S = DontSplashManager.STATE;
    var myArea = ds.areaIndexAt(me.z);
    var mons = ds.monsters || [];
    for (var m = 0; m < mons.length; m++) {
        var mo = mons[m], st = this.mon[m] || (this.mon[m] = { s: mo.state, t: 0 });
        var mp = mo.vis || mo;
        var mpos = { x: mp.x, z: mp.z };
        var near = Math.hypot(mp.x - me.x, mp.z - me.z);
        if (mo.state !== st.s) {
            // hırıltı: yeni ava başlayınca, aynı canavardan en fazla 4 sn'de bir
            if (mo.state === S.HUNT && st.s !== S.HUNT && (mo.room === myArea || near < 90) && this.time - (st.roarT || -99) > 4) {
                st.roarT = this.time;
                this.playAt('roar', mpos, 0.9, 0.5, 0.62, 130);
            }
            if (mo.state === S.STUN) this.playAt('stunned', mpos, 0.9, 0.9, 1.05, 90);
            st.s = mo.state;
        }
        // suda koşarken şapırtı
        if (mo.state === S.HUNT && mo.moving && near < 75) {
            st.t -= dt;
            if (st.t <= 0) {
                st.t = 0.16 + Math.random() * 0.08;
                this.playAt('splashS', mpos, 0.45, 1.5, 1.9, 75);
            }
        }
    }
    if (ds.caught && !this.prevCaught) this.laughT = 0.9;
    this.prevCaught = ds.caught;
    if (this.laughT >= 0) {
        this.laughT -= dt;
        if (this.laughT < 0) this.playAt('laugh', null, 0.7, 0.85, 0.95);
    }

    // ---- checkpoint, bölüm yazısı, kazanma
    if (this.prevCheckpoint === null) this.prevCheckpoint = ds.checkpoint;
    if (ds.checkpoint > this.prevCheckpoint && ds.checkpoint > 0) this.playAt('checkpoint', null, 0.6, 1, 1);
    this.prevCheckpoint = ds.checkpoint;
    if (pk && pk.sPhase === 1 && this.prevSec !== 1) this.playAt('popup', null, 0.6, 1, 1);
    this.prevSec = pk ? pk.sPhase : 0;
    if (ds.finished && !this.prevFinished) this.playAt('checkpoint', null, 0.9, 1, 1);
    this.prevFinished = ds.finished;

    // ---- buz bombası (DsGadgets.freezeAt'e bir kez bağlanır)
    var g = this.app.dsGadgets;
    if (g && !g._sfxHooked) {
        g._sfxHooked = true;
        var self = this, orig = g.freezeAt;
        g.freezeAt = function (p) {
            self.playAt('ice', p, 1, 0.95, 1.05, 80);
            self.playAt('crack', p, 0.8, 0.6, 0.7, 80);
            return orig.apply(this, arguments);
        };
    }

    // ---- damlalar
    if (atm && atm.drips) {
        for (var q = 0; q < atm.drips.length; q++) {
            var dr = atm.drips[q];
            if (this.prevDrip[q] && !dr.on) this.playAt('plop', { x: dr.x, z: dr.z }, 0.35, 0.8, 1.3, 26);
            this.prevDrip[q] = dr.on;
        }
    }

    // ---- bölüme göre ambiyans perdesi
    var amb = ds.sound && ds.sound.slot('ambience');
    if (amb) {
        var area = ds.areaIndexAt(me.z);
        var target = area >= 0 ? (DsSfx.AMB_PITCH[area] || 1) : 1;
        var cur = amb.pitch || 1;
        var np = cur + (target - cur) * Math.min(1, dt * 0.8);
        if (Math.abs(np - cur) > 0.0005) amb.pitch = np;
    }
};
