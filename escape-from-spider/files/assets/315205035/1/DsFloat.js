var DsFloat = pc.createScript('dsFloat');

// Su üstündeki TAHTA karolar (DSWood etiketli sallar) yüzer; beton karolar sabit kalır.
// Tahta karolar: üstüne inince suya gömülüp yaylanır, oyuncunun durduğu / gittiği tarafa yatar,
// üstünde dururken hafifçe dalgalanır. Kimse kalmayınca düzelir ve durur (duran karo hiç işlenmez).
// Tüm oyuncuların konumuyla hesaplanır: her istemcide aynı görünür. Diğer betiklerin (kayan, batan, çöken,
// hafıza karoları) verdiği konumun üstüne eklenir. Karo üstündeki çakıl yığınları da karoyla birlikte yatar.
//
// Yatma sadece görüntüde: çarpışma kutusu düz kalır (oyuncu eğimde kayıp suya düşmesin), yüksekliği ise
// yerel oyuncunun bastığı noktadaki eğik yüzeye eşitlenir; ayaklar karonun görünen yüzüne tam oturur.
// Görüntü çizimden hemen önce eğilir, çizimden sonra fizik konumuna geri alınır.
DsFloat.attributes.add('maxTilt', { type: 'number', default: 5, description: 'Kenara basınca yatma açısı (derece)' });
DsFloat.attributes.add('dipPerPlayer', { type: 'number', default: 0.14, description: 'Üstündeki her oyuncu için gömülme (m)' });
DsFloat.attributes.add('ripples', { type: 'boolean', default: true, description: 'İnişte suda halka' });

DsFloat.NAMES = /^(Plat|Crumble|Sink|Mem)/;
DsFloat.CELL = 10;
DsFloat.STEP = 1 / 120;

DsFloat.prototype.initialize = function () {
    this.tiles = [];
    this.grid = {};
    this.active = [];
    this.time = 0;
    this.acc = 0;
    this.fallV = 0;
    this.fallT = 0;
    this.v1 = new pc.Vec3();
    this.v2 = new pc.Vec3();
    this.v3 = new pc.Vec3();
    this.q1 = new pc.Quat();
    this.ripplePool = [];
    this.app.on('prerender', this.onPreRender, this);
    this.app.on('postrender', this.onPostRender, this);
    this.on('destroy', this.onDestroy, this);
};

DsFloat.prototype.postInitialize = function () {
    var self = this, app = this.app;
    var parkour = this.entity.script && this.entity.script.dsParkour;
    var blockOf = new Map();
    if (parkour && parkour.blocks) parkour.blocks.forEach(function (b) { blockOf.set(b.e, b); });

    var dyn = app.batcher && (app.batcher.getGroupByName('PerfDynamic/DSWorld') || app.batcher.addGroup('PerfDynamic/DSWorld', true, 100));
    var stat = app.batcher && app.batcher.getGroupByName('DSStatic');

    this.entity.forEach(function (e) {
        if (!e.collision || !e.render || !DsFloat.NAMES.test(e.name) || !e.tags.has('DSWood')) return;
        var s = e.getLocalScale();
        var lp = e.getLocalPosition().clone();
        var half = s.y / 2;
        // sadece sudan çıkan karolar (üstü su üstünde, altı su altında)
        if (lp.y + half < 0.3 || lp.y - half > 0) return;
        // hareket edebilmesi için sabit toplu çizimden çıkar (dinamik toplu çizim hareketi izler)
        if (dyn && stat && e.render.batchGroupId === stat.id) e.render.batchGroupId = dyn.id;
        var size = Math.max(s.x, s.z);
        var t = {
            e: e, base: lp, lastSet: lp.clone(), h: half, hx: s.x / 2, hz: s.z / 2,
            sizeK: pc.math.clamp(4.2 / size, 0.55, 1.25), size: size,
            isStatic: !!(e.rigidbody && e.rigidbody.type === pc.BODYTYPE_STATIC),
            block: blockOf.get(e) || null,
            dip: 0, dipV: 0, tx: 0, txV: 0, tz: 0, tzV: 0, offY: 0,
            n: 0, sx: 0, sz: 0, lx: 0, lz: 0, prevN: 0, act: false,
            phase: Math.random() * 6.28, riders: [],
            vis: false, visPos: new pc.Vec3(), visRot: new pc.Quat(), physPos: new pc.Vec3()
        };
        self.tiles.push(t);
        // kayan karolar genliği kadar ötedeki hücrelerde de aranır
        var amp = 0;
        if (e.tags.has('DSMover')) e.tags.list().forEach(function (tg) { if (tg.indexOf('amp') === 0) amp = Math.max(amp, parseFloat(tg.slice(3)) || 0); });
        var mx = t.hx + (e.tags.has('DSAxisX') ? amp + 0.5 : 0), mz = t.hz + (e.tags.has('DSAxisZ') ? amp + 0.5 : 0);
        var c = DsFloat.CELL;
        for (var gx = Math.floor((lp.x - mx) / c); gx <= Math.floor((lp.x + mx) / c); gx++)
            for (var gz = Math.floor((lp.z - mz) / c); gz <= Math.floor((lp.z + mz) / c); gz++) {
                var k = gx + ',' + gz;
                (self.grid[k] || (self.grid[k] = [])).push(t);
            }
    });

    // karo üstündeki çakıl yığınları
    var pickups = app.root.findByName('Pickups');
    if (pickups) pickups.children.forEach(function (p) {
        if (!/^PebblePile/.test(p.name)) return;
        var pp = p.getPosition();
        var t = self.tileAt(pp.x, pp.z, pp.y - 1.6, pp.y + 0.2, 0);
        if (t) t.riders.push({ e: p, base: p.getPosition().clone(), rot: p.getRotation().clone() });
    });
};

// karonun şu anki merkezi (bizim gömülme ofsetimiz çıkarılmış)
DsFloat.prototype.liveBase = function (t, out) {
    var cur = t.e.getLocalPosition();
    return out.set(cur.x, cur.y - (t.offY || 0), cur.z);
};

// (x, z) noktasının altındaki karo; üst yüzü [y0, y1] aralığında olmalı
DsFloat.prototype.tileAt = function (x, z, y0, y1, pad) {
    var c = DsFloat.CELL;
    var list = this.grid[Math.floor(x / c) + ',' + Math.floor(z / c)];
    if (!list) return null;
    for (var i = 0; i < list.length; i++) {
        var t = list[i], b = this.liveBase(t, this.v3);
        var top = b.y + t.h;
        if (Math.abs(x - b.x) < t.hx + pad && Math.abs(z - b.z) < t.hz + pad && top > y0 && top < y1) return t;
    }
    return null;
};

DsFloat.prototype.usable = function (t) {
    if (!t.e.enabled || !t.e.collision || !t.e.collision.enabled) return false;
    if (t.block && t.block.state !== 0) return false;   // çöken / düşen karo: parkur betiği yönetir
    return true;
};

DsFloat.prototype.postUpdate = function (dt) {
    var ds = this.app.dontSplash;
    if (!ds || !ds.player || !this.tiles.length) return;
    dt = Math.min(dt, 0.1);
    this.time += dt;

    // yerel oyuncunun son anlardaki en hızlı düşüşü (inişin sertliği)
    var rb = ds.player.rigidbody;
    var vel = rb ? rb.linearVelocity : pc.Vec3.ZERO;
    this.fallT -= dt;
    if (vel.y < this.fallV || this.fallT <= 0) { this.fallV = Math.min(0, vel.y); this.fallT = 0.25; }

    // karo kimde, kaç kişi, nereye basıyor
    var i, t;
    for (i = 0; i < this.active.length; i++) { t = this.active[i]; t.n = 0; t.sx = 0; t.sz = 0; t.lx = 0; t.lz = 0; t.mine = false; }
    var players = ds.standingPositions();
    for (var k = 0; k < players.length; k++) {
        var p = players[k];
        if (k === 0 && ds.caught) continue;
        var feet = p.y - 1.0;
        t = this.tileAt(p.x, p.z, feet - 0.8, feet + 0.65, 0.15);
        if (!t || !this.usable(t)) continue;
        if (!t.act) { t.act = true; t.n = 0; t.sx = 0; t.sz = 0; t.lx = 0; t.lz = 0; t.mine = false; this.active.push(t); }
        var cp = t.e.getLocalPosition();
        t.n++;
        t.sx += pc.math.clamp((p.x - cp.x) / t.hx, -1, 1);
        t.sz += pc.math.clamp((p.z - cp.z) / t.hz, -1, 1);
        if (k === 0) { t.lx = vel.x; t.lz = vel.z; t.mine = true; }
    }

    // fizik: sabit adımlı yay (kare hızından bağımsız)
    this.acc = Math.min(this.acc + dt, 0.1);
    var steps = 0;
    while (this.acc >= DsFloat.STEP) { this.acc -= DsFloat.STEP; steps++; }

    var me = players[0];
    for (i = this.active.length - 1; i >= 0; i--) {
        t = this.active[i];
        if (!this.usable(t)) { this.release(t); this.active.splice(i, 1); continue; }
        var n = t.n;
        // inişte suya gömülür (sert inişte daha çok), inilen tarafa da bir anlık yatar
        if (n > t.prevN) {
            var hard = t.prevN === 0 ? 1 : 0.5;
            var kick = (t.mine ? pc.math.clamp(-this.fallV * 0.3, 2.2, 4.6) : 3.0) * hard * Math.max(0.75, t.sizeK);
            t.dipV += kick;
            t.txV += (t.sz / n) * 22 * t.sizeK;
            t.tzV -= (t.sx / n) * 22 * t.sizeK;
            if (this.ripples && t.prevN === 0) this.ripple(t, Math.min(1, 0.5 + kick * 0.35));
            // tahtaya iniş sesi: kalın tok vuruş + altında suyun şapırtısı (sadece görsel/ses, canavar duymaz)
            if (t.prevN === 0) {
                var sfx = this.entity.script && this.entity.script.dsSfx;
                if (sfx && sfx.playAt) {
                    var lp = t.e.getLocalPosition();
                    var hv = t.mine ? Math.min(1, 0.45 + kick * 0.15) : 0.5;
                    sfx.playAt('thud', lp, 0.7 * hv, 0.92, 1.08, 35);
                    sfx.playAt('slosh', lp, 0.5 * hv, 0.9, 1.1, 30);
                }
            }
        }
        t.prevN = n;
        var dipT = 0, txT = 0, tzT = 0;
        if (n > 0) {
            var mt = this.maxTilt * t.sizeK;
            dipT = this.dipPerPlayer * Math.min(n, 3) * t.sizeK + 0.032 * Math.sin(this.time * 2.3 + t.phase);
            // durduğu tarafa yatar + gittiği yöne eğilir; üstünde dururken hafif sallanır
            txT = (t.sz / n) * mt + pc.math.clamp(t.lz * 0.35, -2.5, 2.5) + 0.9 * Math.sin(this.time * 1.7 + t.phase);
            tzT = -((t.sx / n) * mt + pc.math.clamp(t.lx * 0.35, -2.5, 2.5)) + 0.9 * Math.sin(this.time * 1.3 + t.phase * 1.7);
            txT = pc.math.clamp(txT, -7, 7); tzT = pc.math.clamp(tzT, -7, 7);
        }
        for (var s = 0; s < steps; s++) {
            var h = DsFloat.STEP;
            t.dipV += (-50 * (t.dip - dipT) - 6.2 * t.dipV) * h; t.dip += t.dipV * h;
            t.txV += (-55 * (t.tx - txT) - 6.5 * t.txV) * h; t.tx += t.txV * h;
            t.tzV += (-55 * (t.tz - tzT) - 6.5 * t.tzV) * h; t.tz += t.tzV * h;
        }
        t.dip = pc.math.clamp(t.dip, -0.25, 0.75);
        // kimse yoksa ve durulduysa bırak (tam yerine oturur, artık işlenmez)
        var still = Math.abs(t.dip) < 0.002 && Math.abs(t.dipV) < 0.01 && Math.abs(t.tx) < 0.03 && Math.abs(t.tz) < 0.03 && Math.abs(t.txV) < 0.1 && Math.abs(t.tzV) < 0.1;
        if (n === 0 && still) { this.release(t); this.active.splice(i, 1); continue; }
        this.apply(t, me);
    }
    this.updateRipples(dt);
};

// Diğer betik bu kare konum verdiyse temel o; vermediyse bizim son konumumuzdan ofseti çıkarırız
DsFloat.prototype.baseNow = function (t, out) {
    var cur = t.e.getLocalPosition();
    if (cur.x === t.lastSet.x && cur.y === t.lastSet.y && cur.z === t.lastSet.z) return out.set(cur.x, cur.y - (t.offY || 0), cur.z);
    return out.copy(cur);
};

DsFloat.prototype.apply = function (t, me) {
    var b = this.baseNow(t, this.v1);
    var bx = b.x, by = b.y, bz = b.z;
    var q = t.visRot.setFromEulerAngles(t.tx, 0, t.tz);
    var topY = by + t.h;
    // görüntü: üst yüzün ortası etrafında döner (kenar aşağı iner), hepsi biraz gömülür
    var d = this.v2.set(0, -t.h, 0);
    q.transformVector(d, d);
    t.visPos.set(bx + d.x, topY + d.y - t.dip, bz + d.z);
    t.vis = true;
    // fizik: düz kutu; üstü yerel oyuncunun (karo içine kıstırılmış) noktasındaki eğik yüzey yüksekliği
    var nrm = this.v2.set(0, 1, 0);
    q.transformVector(nrm, nrm);
    var dx = pc.math.clamp(me.x - bx, -t.hx, t.hx), dz = pc.math.clamp(me.z - bz, -t.hz, t.hz);
    var surf = topY - t.dip - (nrm.x * dx + nrm.z * dz) / Math.max(0.5, nrm.y);
    var py = surf - t.h;
    t.offY = py - by;
    t.physPos.set(bx, py, bz);
    if (t.isStatic && t.e.rigidbody) t.e.rigidbody.teleport(t.physPos, pc.Quat.IDENTITY);
    else { t.e.setLocalPosition(t.physPos); t.e.setLocalRotation(pc.Quat.IDENTITY); }
    t.lastSet.copy(t.e.getLocalPosition());
    t.vbx = bx; t.vbz = bz; t.vtop = topY;
};

// Çizimden hemen önce eğik görüntü, hemen sonra fizik konumu
DsFloat.prototype.onPreRender = function () {
    for (var i = 0; i < this.active.length; i++) {
        var t = this.active[i];
        if (!t.vis) continue;
        t.e.setLocalPosition(t.visPos);
        t.e.setLocalRotation(t.visRot);
        for (var r = 0; r < t.riders.length; r++) {
            var rd = t.riders[r];
            var rel = this.v2.set(rd.base.x - t.base.x, rd.base.y - (t.base.y + t.h), rd.base.z - t.base.z);
            t.visRot.transformVector(rel, rel);
            rd.e.setPosition(t.vbx + rel.x, t.vtop + rel.y - t.dip, t.vbz + rel.z);
            rd.e.setRotation(this.q1.mul2(t.visRot, rd.rot));
        }
    }
};

DsFloat.prototype.onPostRender = function () {
    for (var i = 0; i < this.active.length; i++) {
        var t = this.active[i];
        if (!t.vis) continue;
        t.e.setLocalPosition(t.lastSet);
        t.e.setLocalRotation(pc.Quat.IDENTITY);
        for (var r = 0; r < t.riders.length; r++) { var rd = t.riders[r]; rd.e.setPosition(rd.base); rd.e.setRotation(rd.rot); }
    }
};

// Yüzme bitti: karo tam yerine döner
DsFloat.prototype.release = function (t) {
    t.act = false; t.n = 0; t.prevN = 0; t.vis = false;
    t.dip = t.dipV = t.tx = t.txV = t.tz = t.tzV = 0;
    if (this.usable(t) || !t.block) {
        var b = this.baseNow(t, this.v1);
        if (t.isStatic && t.e.rigidbody) t.e.rigidbody.teleport(b, pc.Quat.IDENTITY);
        else { t.e.setLocalPosition(b); t.e.setLocalRotation(pc.Quat.IDENTITY); }
    } else {
        t.e.setLocalRotation(pc.Quat.IDENTITY);   // konumu parkur betiği veriyor
    }
    t.offY = 0;
    t.lastSet.copy(t.e.getLocalPosition());
    for (var r = 0; r < t.riders.length; r++) { var rd = t.riders[r]; rd.e.setPosition(rd.base); rd.e.setRotation(rd.rot); }
};

// ---------------------------------------------------------------- suda halka
DsFloat.prototype.ringTexture = function () {
    if (this.ringTex) return this.ringTex;
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(64, 64, 30, 64, 64, 63);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.6, 'rgba(255,255,255,1)');
    gr.addColorStop(0.78, 'rgba(255,255,255,0.4)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    var t = new pc.Texture(this.app.graphicsDevice, { width: 128, height: 128, mipmaps: true, addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE });
    t.setSource(c);
    this.ringTex = t;
    return t;
};

DsFloat.prototype.ripple = function (t, strength) {
    var me = this.app.dontSplash.player.getPosition();
    var cp = t.e.getLocalPosition();
    if (Math.abs(cp.x - me.x) + Math.abs(cp.z - me.z) > 70) return;
    var r = null, i;
    for (i = 0; i < this.ripplePool.length; i++) if (!this.ripplePool[i].e.enabled) { r = this.ripplePool[i]; break; }
    if (!r) {
        if (this.ripplePool.length >= 8) r = this.ripplePool[0];
        else {
            var mat = new pc.StandardMaterial();
            mat.useLighting = false;
            mat.diffuse = new pc.Color(0, 0, 0);
            mat.emissive = new pc.Color(0.75, 0.92, 1);
            mat.emissiveMap = this.ringTexture();
            mat.opacityMap = this.ringTexture();
            mat.opacityMapChannel = 'a';
            mat.blendType = pc.BLEND_NORMAL;
            mat.depthWrite = false;
            mat.update();
            var e = new pc.Entity('FloatRipple');
            e.addComponent('render', { type: 'plane', castShadows: false, receiveShadows: false });
            e.render.material = mat;
            // suyun (saydam) üstüne çizilsin diye dünya katmanından sonra gelen katmanda
            e.render.layers = [pc.LAYERID_IMMEDIATE];
            this.app.root.addChild(e);
            r = { e: e, mat: mat, t: 0 };
            this.ripplePool.push(r);
        }
    }
    r.t = 0; r.life = 1.0; r.s0 = t.size * 1.0; r.s1 = t.size * 2.2; r.a = 0.7 * strength;
    r.e.setPosition(cp.x, 0.04, cp.z);
    r.e.setLocalScale(r.s0, 1, r.s0);
    r.mat.opacity = 0; r.mat.update();
    r.e.enabled = true;
};

DsFloat.prototype.updateRipples = function (dt) {
    for (var i = 0; i < this.ripplePool.length; i++) {
        var r = this.ripplePool[i];
        if (!r.e.enabled) continue;
        r.t += dt;
        var k = r.t / r.life;
        if (k >= 1) { r.e.enabled = false; continue; }
        var e = 1 - Math.pow(1 - k, 2.2);
        var s = r.s0 + (r.s1 - r.s0) * e;
        r.e.setLocalScale(s, 1, s);
        r.mat.opacity = r.a * (1 - k) * Math.min(1, k * 10);
        r.mat.update();
    }
};

DsFloat.prototype.onDestroy = function () {
    this.app.off('prerender', this.onPreRender, this);
    this.app.off('postrender', this.onPostRender, this);
    this.ripplePool.forEach(function (r) { r.e.destroy(); });
    if (this.ringTex) this.ringTex.destroy();
};
