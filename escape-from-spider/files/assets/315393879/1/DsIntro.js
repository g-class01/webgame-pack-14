var DsIntro = pc.createScript('dsIntro');

// İlk giriş sinematiği (oyuncu bu modu ilk kez açtığında bir kez):
//  1) karanlıktan açılış, yukarıdan havuz boyunca ağır kamera, gerilim sesi + "The pool is not empty..."
//  2) su seviyesine iner: sudan canavar yükselir, kükrer (jumpscare animasyonu), su sıçrar, kamera sarsılır, geri dalar
//  3) kamera oyuncunun arkasına döner, "SPLASH RUN!" yazısı, kontrol oyuncuya geçer
// Tıklama / dokunma / tuşla atlanabilir. Bu sürede kronometre işlemez (bitince sıfırlanır).

DsIntro.KEY = 'dsIntroSeen1';
DsIntro.TPL = 315372838;                    // canavar şablonu (DsMonster ile aynı model)
DsIntro.DEPS = [315372831, 315372836, 315372835, 315377773];
DsIntro.RUN = 315372837;                    // run_anim
DsIntro.SCARE = 315372830;                  // jumpscare
DsIntro.END = 7.7;
DsIntro.CUT = 2.9;      // 1. çekimden su seviyesine geçiş (kısa kararma ile)
DsIntro.BACK = 5.5;     // oyuncunun arkasına dönüş başlar
DsIntro.LAND = 7.2;     // kamera oyun kamerasına tam oturur

DsIntro.prototype.initialize = function () {
    this.state = 'wait';
    this.t = 0;
    var force = /[?&]dsintro/i.test(window.location.search);
    var seen = false;
    try { seen = window.localStorage.getItem(DsIntro.KEY) === '1'; } catch (e) { seen = false; }
    if (seen && !force) { this.state = 'done'; return; }
    this.waitT = 0;
    this.loadAssets();
    this.app.on('prerender', this.applyCamera, this);
    this.on('destroy', this.cleanup, this);
};

DsIntro.prototype.loadAssets = function () {
    var app = this.app, self = this;
    this.assetsReady = false;
    var ids = DsIntro.DEPS.concat([DsIntro.TPL, DsIntro.RUN, DsIntro.SCARE]);
    var list = ids.map(function (id) { return app.assets.get(id); }).filter(function (a) { return !!a; });
    var left = list.length;
    if (!left) { this.assetsReady = true; return; }
    list.forEach(function (a) {
        a.ready(function () { if (--left === 0) self.assetsReady = true; });
        if (!a.loaded) app.assets.load(a);
    });
};

DsIntro.prototype.update = function (dt) {
    if (this.state === 'done') return;
    var ds = this.app.dontSplash;
    if (this.state === 'wait') {
        if (!ds || !ds.player || !ds.ctrl) return;
        this.waitT += dt;
        var p = ds.player.getPosition();
        // başlangıç zemininde, yakalanmamış ve sahne yerleşmişken başlar; çok beklerse (yükleme) vazgeç
        if (this.waitT > 12 || p.z > 2 || ds.caught || ds.finished) { this.finish(true); return; }
        if (!this.assetsReady || this.waitT < 0.6) return;
        this.start();
        return;
    }
    // oynuyor: oyun kamerası arkada parkura (+z) bakar; son çekim tam bu görüntüye oturur
    this.aimGameCam();
    this.t += Math.min(dt, 0.1);
    this.timeline(dt);
    if (this.t >= DsIntro.END) this.finish(false);
};

DsIntro.prototype.aimGameCam = function () {
    var cam = this.cam;
    var sc = cam && cam.script;
    if (!sc) return;
    if (sc.cameraController && sc.cameraController.eulers) { sc.cameraController.eulers.x = 0; sc.cameraController.eulers.y = 5; }
    if (sc.mobileCameraController && sc.mobileCameraController.eulers) sc.mobileCameraController.eulers.x = 0;
};

// ---------------------------------------------------------------- kurulum
DsIntro.prototype.start = function () {
    var app = this.app, ds = app.dontSplash;
    this.state = 'play';
    this.t = 0;
    try { window.localStorage.setItem(DsIntro.KEY, '1'); } catch (e) { }
    this.cam = app.root.findByName('Camera');
    this.prevMove = app.player ? app.player.canMove : true;
    if (app.player) app.player.canMove = false;
    var rb = ds.player.rigidbody;
    if (rb) rb.linearVelocity = pc.Vec3.ZERO;
    this.hall = Math.floor(ds.player.getPosition().z / 1000 + 0.05) * 1000;   // hangi salonun başı
    this.buildUi();
    this.buildMonster();
    this.flags = {};
    // atlama: tık / dokunma / tuş
    var self = this;
    this.skipFn = function () { if (self.state === 'play' && self.t > 0.6) self.finish(false); };
    if (app.mouse) app.mouse.on(pc.EVENT_MOUSEDOWN, this.skipFn, this);
    if (app.touch) app.touch.on(pc.EVENT_TOUCHSTART, this.skipFn, this);
    if (app.keyboard) app.keyboard.on(pc.EVENT_KEYDOWN, this.skipFn, this);
    app.dsIntroPlaying = true;
};

DsIntro.prototype.buildUi = function () {
    var app = this.app, ds = app.dontSplash;
    var ui = app.root.findByName('GameUI');
    if (!ui) return;
    // HUD gizlenir (sinematik bitince eski haline döner)
    this.hidden = [];
    var self = this;
    ui.children.forEach(function (c) { if (c.enabled) { self.hidden.push(c); c.enabled = false; } });
    var root = new pc.Entity('DsIntroUI');
    root.addComponent('element', { type: 'group', anchor: new pc.Vec4(0, 0, 1, 1), pivot: new pc.Vec2(0.5, 0.5), margin: new pc.Vec4(0, 0, 0, 0), useInput: false });
    ui.addChild(root);
    var img = function (name, anchor, pivot, h, a) {
        var e = new pc.Entity(name);
        e.addComponent('element', { type: 'image', anchor: anchor, pivot: pivot, margin: new pc.Vec4(0, 0, 0, 0), height: h, color: new pc.Color(0, 0, 0), opacity: a, useInput: false });
        root.addChild(e);
        return e;
    };
    this.black = img('Black', new pc.Vec4(0, 0, 1, 1), new pc.Vec2(0.5, 0.5), 0, 1);
    this.flashImg = img('Flash', new pc.Vec4(0, 0, 1, 1), new pc.Vec2(0.5, 0.5), 0, 0);
    this.flashImg.element.color = new pc.Color(1, 1, 1);
    this.flashImg.enabled = false;
    this.barTop = img('BarTop', new pc.Vec4(0, 1, 1, 1), new pc.Vec2(0.5, 1), 0, 1);
    this.barBot = img('BarBot', new pc.Vec4(0, 0, 1, 0), new pc.Vec2(0.5, 0), 0, 1);
    var font = ds && ds.fontAsset;
    var txt = function (name, size, y, col) {
        var e = new pc.Entity(name);
        e.addComponent('element', {
            type: 'text', fontAsset: font ? font.id : null, text: '', fontSize: size, autoWidth: true, autoHeight: true,
            anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5), pivot: new pc.Vec2(0.5, 0.5), color: col,
            outlineColor: new pc.Color(0, 0, 0, 1), outlineThickness: 0.6, opacity: 0, useInput: false
        });
        e.setLocalPosition(0, y, 0);
        root.addChild(e);
        e.enabled = false;
        return e;
    };
    this.sub = txt('Sub', 40, -230, new pc.Color(0.85, 0.9, 0.95));
    this.title = txt('Title', 110, 40, new pc.Color(1, 0.25, 0.22));
    this.title2 = txt('Title2', 40, -50, new pc.Color(1, 1, 1));
    this.skip = txt('Skip', 26, -300, new pc.Color(1, 1, 1));
    this.skip.element.anchor = new pc.Vec4(1, 0, 1, 0);
    this.skip.element.pivot = new pc.Vec2(1, 0);
    this.skip.setLocalPosition(-30, 20, 0);
    // telefonlarda da fare nesnesi oluyor: dokunmatik ekran varsa "dokun" yazsın
    this.skip.element.text = app.touch ? 'Tap to skip' : 'Click to skip';
    this.ui = root;
};

DsIntro.prototype.buildMonster = function () {
    var app = this.app;
    var tpl = app.assets.get(DsIntro.TPL);
    if (!tpl || !tpl.resource) return;
    var w = new pc.Entity('DsIntroMonster');
    w.setLocalScale(1.8, 1.8, 1.8);
    var inner = tpl.resource.instantiate();
    inner.name = 'RootNode';
    w.addChild(inner);
    inner.findComponents('render').forEach(function (r) { r.castShadows = false; r.receiveShadows = false; });
    app.root.addChild(w);
    inner.addComponent('anim', { activate: true, speed: 1 });
    var run = app.assets.get(DsIntro.RUN), scare = app.assets.get(DsIntro.SCARE);
    if (run && run.resource) inner.anim.assignAnimation('Run', run.resource);
    if (scare && scare.resource) inner.anim.assignAnimation('Scare', scare.resource);
    try { inner.anim.baseLayer.transition('Run', 0); } catch (e) { }
    this.mon = w;
    this.monAnim = inner.anim;
    this.monPos = new pc.Vec3(-1, -9, this.hall + 46);
    w.setPosition(this.monPos);
    w.enabled = false;
};

// ---------------------------------------------------------------- zaman çizelgesi
DsIntro.ease = function (a) { a = pc.math.clamp(a, 0, 1); return a * a * (3 - 2 * a); };
// yazının kenar çizgisi opaklıktan etkilenmiyor: görünmezken tamamen kapat
DsIntro.fitW = function (e) {
    if (!e || !e.element) return 1;
    var scr = e.element.screen && e.element.screen.screen, d = pc.app.graphicsDevice;
    if (!scr || !d) return 1;
    var W = d.width / (scr.scale || 1);
    return Math.min(1, (W - 50) / Math.max(1, e.element.width));
};

DsIntro.fade = function (e, a) {
    if (!e) return;
    e.element.opacity = a;
    var on = a > 0.01;
    if (e.enabled !== on) e.enabled = on;
};

DsIntro.prototype.timeline = function (dt) {
    var app = this.app, ds = app.dontSplash, t = this.t, f = this.flags, E = DsIntro.ease;
    var sfx = this.sfx || (this.sfx = (app.root.findComponents('script').map(function (s) { return s.dsSfx; }).filter(Boolean)[0] || null));
    // karartma / bantlar
    if (this.black) {
        var dip = Math.max(0, 1 - Math.abs(t - DsIntro.CUT) / 0.2);           // çekim geçişinde kısa kararma
        var bo = Math.max(t < 0.9 ? 1 - E(t / 0.9) : 0, E(dip * 1.25));
        DsIntro.fade(this.black, bo);
    }
    if (this.flashImg) DsIntro.fade(this.flashImg, f.scare ? 0.65 * Math.max(0, 1 - (t - 3.55) / 0.3) : 0);
    var barH = 90 * E(t / 0.6) * (1 - E((t - (DsIntro.LAND - 0.2)) / 0.6));
    if (this.barTop) { this.barTop.element.height = barH; this.barBot.element.height = barH; }
    DsIntro.fade(this.skip, t > 0.8 ? 0.55 * (1 - E((t - (DsIntro.END - 0.5)) / 0.4)) : 0);

    if (!f.rumble && t > 0.15) { f.rumble = true; if (sfx) sfx.playAt('rumble', null, 0.7, 0.6, 0.65); ds.play('hbBeat', 0.9); }
    if (!f.beat2 && t > 1.3) { f.beat2 = true; ds.play('hbBeat', 1); }
    if (!f.beat3 && t > 2.3) { f.beat3 = true; ds.play('hbBeat', 1); }
    // alt yazı
    if (this.sub) {
        this.sub.element.text = 'The pool is not empty...';
        DsIntro.fade(this.sub, E((t - 0.8) / 0.5) * (1 - E((t - 2.6) / 0.3)));
    }
    // canavar
    var m = this.mon;
    if (m) {
        var mp = this.monPos;
        if (t > DsIntro.CUT && !m.enabled) m.enabled = true;
        if (t < 3.7) mp.y = -9 + 6.2 * E((t - 3.0) / 0.7);
        else if (t > 4.9) mp.y = -2.8 - 7 * E((t - 4.9) / 0.6);
        m.setPosition(mp);
        // kameraya dönük
        var cp = this.cam.getPosition();
        m.setEulerAngles(0, Math.atan2(cp.x - mp.x, cp.z - mp.z) * pc.math.RAD_TO_DEG, 0);
        if (!f.splashUp && t > 3.2) { f.splashUp = true; if (ds.spawnSplashFx) ds.spawnSplashFx(new pc.Vec3(mp.x, 0, mp.z), 2.2); ds.play('splash', 1); }
        if (!f.scare && t > 3.55) {
            f.scare = true;
            try { this.monAnim.baseLayer.transition('Scare', 0.1, 0); } catch (e) { }
            if (sfx) sfx.playAt('roar', null, 1, 0.9, 0.95);
            ds.play('attack', 0.9);
            this.shakeT = 0.9;
        }
        if (!f.splashDown && t > 5.1) { f.splashDown = true; if (ds.spawnSplashFx) ds.spawnSplashFx(new pc.Vec3(mp.x, 0, mp.z), 1.6); if (sfx) sfx.playAt('slosh', null, 0.8, 0.8, 0.9); }
        if (t > 5.8 && m.enabled) m.enabled = false;
    }
    if (this.shakeT > 0) this.shakeT -= dt;
    // başlık
    if (this.title) {
        this.title.element.text = "SPLASH RUN!";
        this.title2.element.text = 'Stay on the tiles. Never touch the water!';
        var a = E((t - 5.7) / 0.3) * (1 - E((t - (DsIntro.END - 0.45)) / 0.4));
        DsIntro.fade(this.title, a);
        DsIntro.fade(this.title2, E((t - 6.0) / 0.3) * (1 - E((t - (DsIntro.END - 0.45)) / 0.4)));
        var s = t < 5.7 ? 0.6 : 1 + 0.35 * Math.max(0, 1 - (t - 5.7) / 0.25) * Math.sin(Math.min(1, (t - 5.7) / 0.25) * Math.PI);
        // dar/dikey ekranda ve uzun çevirilerde yazılar ekrana sığsın
        var fk = DsIntro.fitW(this.title), fk2 = DsIntro.fitW(this.title2), fk3 = DsIntro.fitW(this.sub);
        this.title.setLocalScale(s * fk, s * fk, s);
        this.title2.setLocalScale(fk2, fk2, 1);
        if (this.sub) this.sub.setLocalScale(fk3, fk3, 1);
        if (!f.titleSnd && t > 5.7) { f.titleSnd = true; ds.play('success', 0.6); }
    }
};

// Kamera (kamera kontrolcüsünden sonra, çizimden hemen önce). Oyun kamerasının bu karedeki konumu okunur:
// son çekim tam oraya oturur, sinematik bitince kamera hiç zıplamaz.
DsIntro.prototype.shotPose = function (t, pos, look) {
    var E = DsIntro.ease, H = this.hall;
    var lerp3 = function (o, a, b, k) { o.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k); };
    var roll = 0;
    if (t < DsIntro.CUT) {
        // 1: yukarıdan havuz boyunca ağır kayış (hafif yatık başlar, düzelir)
        var k = E(t / DsIntro.CUT);
        lerp3(pos, [-3, 21, H - 26], [2, 12.5, H + 9], k);
        lerp3(look, [0, 3, H + 80], [0, 0, H + 60], k);
        roll = -6 * (1 - k);
    } else {
        // 2: su seviyesi, canavara bakış (yükselirken yavaşça yaklaş)
        var k2 = E((t - DsIntro.CUT) / (DsIntro.BACK - DsIntro.CUT));
        lerp3(pos, [11.5, 2.2, H + 23], [7, 1.8, H + 31], k2);
        var mp = this.monPos || new pc.Vec3(-1, -3, H + 46);
        look.set(mp.x, Math.max(-1, mp.y + 6.5), mp.z);
    }
    // elde tutulan kamera hissi (zamana bağlı, kare hızından bağımsız)
    pos.x += Math.sin(t * 1.3) * 0.12; pos.y += Math.sin(t * 1.7 + 1) * 0.08;
    look.x += Math.sin(t * 0.9 + 2) * 0.25; look.y += Math.sin(t * 1.1) * 0.15;
    if (this.shakeT > 0) {
        var s = 0.4 * Math.min(1, this.shakeT / 0.9);
        pos.x += Math.sin(t * 53) * s; pos.y += Math.sin(t * 61 + 2) * s; pos.z += Math.sin(t * 47 + 4) * s * 0.6;
        roll += Math.sin(t * 37) * 4 * s;
    }
    return roll;
};

DsIntro.prototype.applyCamera = function () {
    if (this.state !== 'play' || !this.cam) return;
    var cam = this.cam, t = this.t, E = DsIntro.ease;
    // oyun kamerasının bu karedeki yeri (kontrolcü postUpdate'te koydu)
    var gp = cam.getPosition().clone(), gr = cam.getRotation().clone();
    var pos = new pc.Vec3(), look = new pc.Vec3();
    var tt = Math.min(t, DsIntro.BACK);
    var roll = this.shotPose(tt, pos, look);
    var q = DsIntro.lookQuat(pos, look, roll);
    if (t > DsIntro.BACK) {
        // 3: su seviyesinden havalanıp oyuncunun arkasındaki oyun kamerasına süzülür
        var k = E((t - DsIntro.BACK) / (DsIntro.LAND - DsIntro.BACK));
        var p = new pc.Vec3().lerp(pos, gp, k);
        p.y += Math.sin(k * Math.PI) * 3.5;
        pos = p;
        q = new pc.Quat().slerp(q, gr, E(Math.min(1, k * 1.15)));
    }
    cam.setPosition(pos);
    cam.setRotation(q);
    // bölüm yazısı sinematikten sonra çıksın
    var pk = this.parkour || (this.parkour = this.app.root.findComponents('script').map(function (x) { return x.dsParkour; }).filter(Boolean)[0] || null);
    if (pk && pk.secBanner) { pk.secBanner.enabled = false; pk.sPhase = 0; }
};

DsIntro.lookQuat = function (pos, look, roll) {
    var m = new pc.Mat4().setLookAt(pos, look, pc.Vec3.UP);
    var q = new pc.Quat().setFromMat4(m);
    if (roll) q.mul(new pc.Quat().setFromEulerAngles(0, 0, roll));
    return q;
};

// ---------------------------------------------------------------- bitiş
DsIntro.prototype.finish = function (silent) {
    var app = this.app, ds = app.dontSplash;
    var wasPlaying = this.state === 'play';
    this.state = 'done';
    app.dsIntroPlaying = false;
    if (wasPlaying) {
        if (app.player) app.player.canMove = this.prevMove !== false;
        if (this.hidden) this.hidden.forEach(function (c) { if (c && !c._destroyed) c.enabled = true; });
        // kamera parkura (+z) baksın
        var cam = this.cam;
        if (cam && cam.script) {
            if (cam.script.cameraController && cam.script.cameraController.eulers) { cam.script.cameraController.eulers.x = 0; cam.script.cameraController.eulers.y = 5; }
            if (cam.script.mobileCameraController && cam.script.mobileCameraController.eulers) cam.script.mobileCameraController.eulers.x = 0;
        }
        // kronometre sinematik bitince başlasın
        if (ds && ds.started && !ds.finished && ds.netNow) ds.startTime = ds.netNow();
        // bölüm yazısı şimdi gösterilsin
        var pk = this.parkour;
        if (pk) { pk.secShown = {}; pk.secZone = undefined; pk.secCand = undefined; }
    }
    this.cleanup();
};

DsIntro.prototype.cleanup = function () {
    var app = this.app;
    app.off('prerender', this.applyCamera, this);
    if (this.skipFn) {
        if (app.mouse) app.mouse.off(pc.EVENT_MOUSEDOWN, this.skipFn, this);
        if (app.touch) app.touch.off(pc.EVENT_TOUCHSTART, this.skipFn, this);
        if (app.keyboard) app.keyboard.off(pc.EVENT_KEYDOWN, this.skipFn, this);
        this.skipFn = null;
    }
    if (this.ui) { this.ui.destroy(); this.ui = null; }
    if (this.mon) { this.mon.destroy(); this.mon = null; }
};
