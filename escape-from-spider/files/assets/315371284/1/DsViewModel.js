var DsViewModel = pc.createScript('dsViewModel');

// Birinci şahıs kamerada eldeki eşya:
//  - Don't Splash eşyalarının (çakıl, sopa, kanca, buz bombası) birinci şahıs modeli yok: eşyanın modeli
//    ekranın sağ altında elde tutuluyormuş gibi gösterilir.
//  - Eldeki tüm eşyalar (oyunun kendi birinci şahıs modelleri dahil) tek bir "el" düğümüne bağlanır;
//    yürürken sallanır, kamera dönünce hafif geriden gelir, zıplayınca/inince tepki verir, eşya değişince alttan gelir.
//  Hareketler sabit adımlı yaylarla hesaplanır (kare hızından bağımsız).

// Eşya kimliği -> görünüş (konum: sağ, aşağı, ileri(-); açı: derece; boy: en uzun kenar metre)
//  canon: modelin kendi (yerde yatış) dönüşünü sıfırla; squash: dikey basıklık
DsViewModel.POSE = {
    40: { pos: [0.3, -0.15, -0.5], rot: [-35, -40, 30], size: 0.2, squash: 0.85 },        // çakıl
    41: { pos: [0.38, -0.2, -0.62], rot: [30, 0, -14], size: 0.5, canon: true },       // sopa (omuza yaslı)
    42: { pos: [0.25, -0.15, -0.46], rot: [3, -97, 0], size: 0.26, canon: true },      // kanca tabancası (namlu ileri)
    43: { pos: [0.3, -0.15, -0.5], rot: [25, -35, 15], size: 0.13, canon: true }     // buz bombası
};
// el ışığı: sadece eldeki görünüşü aydınlatır (maske biti 2; dünyadaki hiçbir şey bu biti kullanmıyor)
DsViewModel.LIGHT_MASK = 2;
DsViewModel.STEP = 1 / 120;

DsViewModel.prototype.initialize = function () {
    this.cache = {};       // id -> görünüş varlığı
    this.curId = null;
    this.ready = false;
    this.acc = 0;
    this.phase = 0;
    this.bobK = 0;
    // yaylar: konum (x,y,z) ve dönme (pitch, yaw, roll)
    this.p = [0, 0, 0]; this.pv = [0, 0, 0];
    this.r = [0, 0, 0]; this.rv = [0, 0, 0];
    this.lastYaw = null; this.lastPitch = null;
    this.wasGrounded = true;
    this.fallV = 0;
    this.on('destroy', this.onDestroy, this);
};

DsViewModel.prototype.setup = function () {
    var pl = this.app.player;
    if (!pl || !pl.fpsAnimator || !pl.fpsAnimator.right) return false;
    var cam = pl.fpsAnimator.right.parent;
    if (!cam) return false;
    this.cam = cam;
    var hand = new pc.Entity('DsHand');
    cam.addChild(hand);
    // oyunun birinci şahıs modelleri de bu düğümün altına: hepsi aynı sallanmayı alır
    pl.fpsAnimator.right.reparent(hand);
    pl.fpsAnimator.left.reparent(hand);
    this.hand = hand;
    // eldeki eşya karanlık sahnede düz gri leke gibi görünmesin: sadece ona etki eden yön ışığı
    var light = new pc.Entity('DsHandLight');
    light.addComponent('light', {
        type: 'directional', mask: DsViewModel.LIGHT_MASK, intensity: 0.9,
        color: new pc.Color(1, 0.95, 0.88), castShadows: false, layers: [pc.LAYERID_WORLD]
    });
    cam.addChild(light);
    light.setLocalEulerAngles(35, 0, 35);
    light.enabled = false;
    this.light = light;
    this.ready = true;
    return true;
};

DsViewModel.prototype.selectedItem = function () {
    var inv = this.app.player && this.app.player.inventory;
    if (!inv || !inv.slots) return null;
    return inv.currentSlot || null;
};

// eşyanın modelinden bir görünüş varlığı (bir kez üretilir)
DsViewModel.prototype.viewFor = function (item) {
    var id = item.id;
    if (this.cache[id] !== undefined) return this.cache[id];
    var pose = DsViewModel.POSE[id];
    var tpl = item.template;
    if (!pose || !tpl || !tpl.resource) { this.cache[id] = null; return null; }
    var holder = new pc.Entity('DsView_' + id);
    var inner = tpl.resource.instantiate();
    // modelin kendi betikleri/fiziği/etkileşimi olmasın: sadece görüntü
    var mask = pc.MASK_AFFECT_DYNAMIC | DsViewModel.LIGHT_MASK;
    inner.forEach(function (e) {
        if (e.script) e.removeComponent('script');
        if (e.rigidbody) e.removeComponent('rigidbody');
        if (e.collision) e.removeComponent('collision');
        if (e.element) e.enabled = false;
        if (e.render) {
            e.render.castShadows = false; e.render.receiveShadows = false; e.render.batchGroupId = -1;
            e.render.meshInstances.forEach(function (mi) { mi.mask = mask; });
            if (pose.canon) { e.setLocalPosition(0, 0, 0); e.setLocalEulerAngles(0, 0, 0); }
        }
    });
    inner.enabled = true;
    holder.addChild(inner);
    this.hand.addChild(holder);
    holder.setLocalPosition(pose.pos[0], pose.pos[1], pose.pos[2]);
    holder.setLocalEulerAngles(pose.rot[0], pose.rot[1], pose.rot[2]);
    holder.enabled = false;
    var v = { e: holder, inner: inner, pose: pose, fitted: false };
    this.cache[id] = v;
    return v;
};

DsViewModel.prototype.applyMask = function (v) {
    var mask = pc.MASK_AFFECT_DYNAMIC | DsViewModel.LIGHT_MASK;
    var rs = v.rs || (v.rs = v.inner.findComponents('render'));
    for (var i = 0; i < rs.length; i++) {
        var mis = rs[i].meshInstances;
        for (var j = 0; j < mis.length; j++) if (mis[j].mask !== mask) mis[j].mask = mask;
    }
};

// modelin boyunu ve ortasını ölç, istenen boya getir (malzemeler yüklenince bir kez)
DsViewModel.prototype.fit = function (v) {
    if (v.fitted) return;
    var mis = [];
    v.inner.findComponents('render').forEach(function (r) { if (r.enabled && r.entity.enabled) mis = mis.concat(r.meshInstances); });
    if (!mis.length) return;
    v.inner.setLocalScale(1, 1, 1);
    v.inner.setLocalPosition(0, 0, 0);
    // holder'ın uzayında kutu: geçici olarak holder'ı başlangıca alıp ölç
    var hp = v.e.getLocalPosition().clone(), hr = v.e.getLocalRotation().clone();
    var par = v.e.parent;
    v.e.reparent(this.app.root);
    v.e.setPosition(0, -500, 0); v.e.setRotation(pc.Quat.IDENTITY); v.e.setLocalScale(1, 1, 1);
    var box = new pc.BoundingBox(); box.copy(mis[0].aabb);
    for (var i = 1; i < mis.length; i++) box.add(mis[i].aabb);
    var h = box.halfExtents, big = Math.max(h.x, h.y, h.z) * 2;
    if (big > 0.0001) {
        var k = v.pose.size / big;
        v.inner.setLocalScale(k, k, k);
        v.inner.setLocalPosition(-(box.center.x - 0) * k, -(box.center.y + 500) * k, -(box.center.z - 0) * k);
        if (v.pose.squash) v.inner.setLocalScale(k, k * v.pose.squash, k);
    }
    v.e.reparent(par);
    v.e.setLocalPosition(hp); v.e.setLocalRotation(hr);
    v.fitted = true;
};

DsViewModel.prototype.postUpdate = function (dt) {
    var app = this.app;
    if (!this.ready && !this.setup()) return;
    dt = Math.min(dt, 0.1);
    var fps = !!app.isFPS;

    // ---- hangi eşya: oyunun kendi birinci şahıs modeli yoksa bizim görünüşümüz
    var slot = this.selectedItem();
    var item = slot && slot.item;
    var id = item && !slot.fpsEntity ? item.id : null;
    var want = fps && id !== null ? this.viewFor(item) : null;
    var newKey = slot ? (item && item.id) : null;
    if (newKey !== this.curKey) {
        // eşya değişti: el aşağıdan yukarı gelir
        this.curKey = newKey;
        this.p[1] = -0.25; this.pv[1] = 0; this.r[0] = -25; this.rv[0] = 0;
    }
    for (var key in this.cache) {
        var v = this.cache[key];
        if (!v) continue;
        var on = v === want;
        if (on && !v.fitted) this.fit(v);
        if (v.e.enabled !== on) v.e.enabled = on;
        if (on) {
            // model sonradan yüklenince mesh'ler yeniden kurulur: el ışığı maskesi kaybolmasın
            this.applyMask(v);
            // dar/dikey ekranda eşya ekran dışına taşmasın: yatay konumu en-boy oranına göre içeri çek
            var cv = app.graphicsDevice;
            var asp = cv.width / Math.max(1, cv.height);
            var kx = pc.math.clamp(asp / 1.78, 0.5, 1);
            var pp = v.pose.pos;
            v.e.setLocalPosition(pp[0] * kx, pp[1], pp[2]);
        }
    }
    if (this.light.enabled !== !!want) this.light.enabled = !!want;
    if (!fps || !this.hand) return;

    // ---- girdiler: hız, yerde mi, kamera dönüşü
    var ds = app.dontSplash, ctrl = app.player && app.player.controller;
    var rb = ds && ds.player ? ds.player.rigidbody : null;
    var vel = rb ? rb.linearVelocity : pc.Vec3.ZERO;
    var hs = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    var grounded = ctrl ? ctrl._timeSinceLastGrounded < 0.08 : true;
    var inWater = ds && ds.inWater;
    if (!grounded && vel.y < this.fallV) this.fallV = vel.y;
    var kickY = 0, kickP = 0;
    if (grounded && !this.wasGrounded) {
        // iniş: el aşağı çöker (sert inişte daha çok)
        var f = pc.math.clamp(-this.fallV / 14, 0.3, 1.2);
        kickY -= 1.7 * f; kickP -= 120 * f;
        this.fallV = 0;
    } else if (!grounded && this.wasGrounded && vel.y > 2) {
        // zıplama: el hafif aşağı kalır (kamera yukarı giderken)
        kickY -= 0.9; kickP += 60;
        this.fallV = 0;
    }
    if (grounded) this.fallV = 0;
    this.wasGrounded = grounded;

    var e = this.cam.getEulerAngles();
    var q = this.cam.getRotation();
    var fwd = this.cam.forward;
    var yaw = Math.atan2(-fwd.x, -fwd.z) * pc.math.RAD_TO_DEG;
    var pitch = Math.asin(pc.math.clamp(fwd.y, -1, 1)) * pc.math.RAD_TO_DEG;
    var dyaw = 0, dpitch = 0;
    if (this.lastYaw !== null) {
        dyaw = yaw - this.lastYaw; if (dyaw > 180) dyaw -= 360; if (dyaw < -180) dyaw += 360;
        dpitch = pitch - this.lastPitch;
    }
    this.lastYaw = yaw; this.lastPitch = pitch;

    // ---- yürüme sallanması (yerde ve hızlıysa; suda daha yavaş ve yumuşak)
    var moving = grounded && hs > 1 ? Math.min(1, hs / 10) : 0;
    if (inWater) moving = Math.min(1, hs / 6) * 0.6;
    this.bobK += (moving - this.bobK) * Math.min(1, dt * 8);
    this.phase += dt * (inWater ? 5 : 2.2 + hs * 0.55);
    var bx = Math.sin(this.phase) * 0.018 * this.bobK;
    var by = -Math.abs(Math.cos(this.phase)) * 0.022 * this.bobK;
    var broll = Math.sin(this.phase) * 2.2 * this.bobK;
    // nefes: dururken çok hafif
    var t = (this.tt = (this.tt || 0) + dt);
    var breathe = Math.sin(t * 1.6) * 0.004 * (1 - this.bobK);

    // ---- yaylar (hedef: sallanma + kamera gecikmesi)
    var swayYaw = pc.math.clamp(-dyaw / Math.max(dt, 0.001) * 0.012, -6, 6);   // kamera sağa dönünce el sola kalır
    var swayPitch = pc.math.clamp(dpitch / Math.max(dt, 0.001) * 0.01, -5, 5);
    var tp = [bx - swayYaw * 0.004, by + breathe + swayPitch * 0.003, 0];
    var tr = [swayPitch, swayYaw, broll + swayYaw * 0.6];
    this.pv[1] += kickY; this.rv[0] += kickP;
    this.acc = Math.min(this.acc + dt, 0.1);
    while (this.acc >= DsViewModel.STEP) {
        this.acc -= DsViewModel.STEP;
        var h = DsViewModel.STEP;
        for (var i = 0; i < 3; i++) {
            this.pv[i] += (-120 * (this.p[i] - tp[i]) - 14 * this.pv[i]) * h; this.p[i] += this.pv[i] * h;
            this.rv[i] += (-110 * (this.r[i] - tr[i]) - 13 * this.rv[i]) * h; this.r[i] += this.rv[i] * h;
        }
    }
    this.hand.setLocalPosition(this.p[0], this.p[1], this.p[2]);
    this.hand.setLocalEulerAngles(this.r[0], this.r[1], this.r[2]);
};

DsViewModel.prototype.onDestroy = function () {
    for (var k in this.cache) if (this.cache[k]) this.cache[k].e.destroy();
    if (this.light) this.light.destroy();
};
