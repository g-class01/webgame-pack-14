var DsGadgets = pc.createScript('dsGadgets');

// DON'T SPLASH eşyaları (DSWorld üzerinde):
//  - Kanca (HOOK): baktığın yöndeki oyuncuyu kendine çeker (suya da çekebilirsin, sudan da kurtarabilirsin)
//  - Buz bombası (ICE): atılır, düştüğü yerin yakınındaki canavarı buz içinde dondurur (hareket edemez)
// Eşyalar başlangıçtaki standlardan alınır (DsStand kind: 'hook' / 'ice'); hakları slotun altında çubukla görünür.
DsGadgets.attributes.add('ropeSound', { type: 'asset', assetType: 'audio', description: 'Kanca atılınca (Steal and Run rope.mp3)' });
DsGadgets.attributes.add('hookHead', { type: 'asset', assetType: 'render', description: 'Kancanın ucu (Steal and Run kanca modeli)' });
DsGadgets.attributes.add('hookMaterial', { type: 'asset', assetType: 'material' });
DsGadgets.HOOK_ITEM = 42;
DsGadgets.ICE_ITEM = 43;
DsGadgets.HOOK_USES = 3;
DsGadgets.ICE_USES = 2;
DsGadgets.HOOK_RANGE = 26;        // m
DsGadgets.HOOK_CONE = 0.93;       // baktığın yönle hedef arasındaki açı (cos ~22°)
DsGadgets.HOOK_COOLDOWN = 1.0;    // sn
DsGadgets.PULL_SPEED = 28;        // çekilen oyuncunun hızı
DsGadgets.PULL_MAX = 0.9;         // en uzun çekilme süresi
DsGadgets.ICE_RADIUS = 13;        // donma yarıçapı
DsGadgets.ICE_COOLDOWN = 0.8;

DsGadgets.prototype.initialize = function () {
    this.app.dsGadgets = this;
    this.uses = {};
    this.uses[DsGadgets.HOOK_ITEM] = 0;
    this.uses[DsGadgets.ICE_ITEM] = 0;
    this.time = 0;
    this.lastHook = -10;
    this.lastIce = -10;
    this.ropes = [];
    this.shots = [];
    this.iceBlocks = [];
    this.pull = null;
    this.mats = {};
    this.hookController();
    var ds = this.ds();
    if (ds && ds.sound && this.ropeSound && !ds.sound.slot('rope')) ds.sound.addSlot('rope', { asset: this.ropeSound.id, volume: 1, autoPlay: false, loop: false, overlap: true });
    var self = this;
    [this.ropeSound, this.hookHead, this.hookMaterial].forEach(function (a) { if (a && !a.loaded) self.app.assets.load(a); });
    this.on('destroy', this.onDestroy, this);
};

DsGadgets.prototype.ds = function () { return this.app.dontSplash; };

// ---------------------------------------------------------------- envanter
DsGadgets.prototype.slotOf = function (id) {
    var inv = this.app.player && this.app.player.inventory;
    if (!inv) return null;
    for (var i = 0; i < inv.slots.length; i++) if (inv.slots[i].item && inv.slots[i].item.id === id) return inv.slots[i];
    return null;
};

DsGadgets.prototype.maxUses = function (id) { return id === DsGadgets.HOOK_ITEM ? DsGadgets.HOOK_USES : DsGadgets.ICE_USES; };

// Stand: reklamdan sonra verilir. Varsa hakkı dolar ve seçilir.
DsGadgets.prototype.give = function (id) {
    var ds = this.ds();
    var inv = this.app.player && this.app.player.inventory;
    if (!ds || !inv) return false;
    if (!ds.hasItem(id) && !ds.giveItem(id)) return false;
    this.uses[id] = this.maxUses(id);
    var idx = inv.slots.findIndex(function (s) { return s.item && s.item.id === id; });
    if (idx >= 0 && inv.selectSlot) inv.selectSlot(idx);
    this.updateLabel(id);
    ds.play('success', 0.6);
    return true;
};

DsGadgets.prototype.canGet = function (id) {
    var ds = this.ds();
    return !(ds && ds.hasItem(id) && (this.uses[id] || 0) >= this.maxUses(id));
};

DsGadgets.prototype.consume = function (id) {
    this.uses[id] = Math.max(0, (this.uses[id] || 0) - 1);
    this.updateLabel(id);
    if (this.uses[id] > 0) return;
    var ds = this.ds();
    var inv = this.app.player && this.app.player.inventory;
    var guard = 5;
    while (inv && ds && ds.hasItem(id) && guard-- > 0) inv.removeItem(id);
    this.app.fire('WarningTextController:setWarning', id === DsGadgets.HOOK_ITEM ? 'Your hook is used up! Get a new one at the HOOK stand.' : 'No ice bombs left! Get more at the ICE stand.', 3, new pc.Color(1, 0.6, 0.2, 1));
};

// Kalan hak: slotun altında çubuk (sopadaki gibi)
DsGadgets.prototype.updateLabel = function (id) {
    var slot = this.slotOf(id);
    if (!slot || !slot.entity) return;
    var root = slot.entity.findByName('DsDurability');
    if (!root) {
        root = new pc.Entity('DsDurability');
        root.addComponent('element', { type: 'group', anchor: new pc.Vec4(0.5, 0, 0.5, 0), pivot: new pc.Vec2(0.5, 0.5), width: 68.35, height: 32, useInput: false });
        var bg = new pc.Entity('Bg');
        bg.addComponent('element', { type: 'image', anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5), pivot: new pc.Vec2(0.5, 0.5), width: 52, height: 6, color: new pc.Color(0, 0, 0), useInput: false });
        bg.setLocalPosition(0, 3.8, 0);
        var fill = new pc.Entity('Fill');
        fill.addComponent('element', { type: 'image', anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5), pivot: new pc.Vec2(0.5, 0.5), width: 50, height: 4, color: id === DsGadgets.ICE_ITEM ? new pc.Color(0.45, 0.85, 1) : new pc.Color(1, 0.75, 0.2), useInput: false });
        fill.setLocalPosition(0, 3.817, 0);
        root.addChild(bg);
        root.addChild(fill);
        slot.entity.addChild(root);
    }
    var f = root.findByName('Fill');
    if (f && f.element) f.element.width = 50 * pc.math.clamp((this.uses[id] || 0) / this.maxUses(id), 0, 1);
};

// ---------------------------------------------------------------- yardımcılar
DsGadgets.prototype.mat = function (key, make) {
    if (!this.mats[key]) { var m = new pc.StandardMaterial(); make(m); m.update(); this.mats[key] = m; }
    return this.mats[key];
};

DsGadgets.prototype.handPos = function () {
    var hand = this.app.player && this.app.player.interact && this.app.player.interact.rightHand;
    var ds = this.ds();
    return hand ? hand.getPosition().clone() : ds.player.getPosition().clone().add(new pc.Vec3(0, 0.6, 0));
};

DsGadgets.prototype.remoteOf = function (sid) {
    var rps = this.app.network && this.app.network.remotePlayers;
    var w = rps && rps[sid];
    var e = w && w.entity;
    if (!e || e._destroyed) return null;
    return { e: e, rc: e.script && e.script.remotePlayerController };
};

// Bir oyuncunun el (yoksa göğüs) konumu: bizsek kendi elimiz
DsGadgets.prototype.playerPoint = function (sid) {
    var room = this.app.room;
    if (room && sid === room.sessionId) return this.handPos();
    var r = this.remoteOf(sid);
    if (!r) return null;
    var hand = r.rc && r.rc.rightHand;
    return hand ? hand.getPosition().clone() : r.e.getPosition().clone().add(new pc.Vec3(0, 0.6, 0));
};

DsGadgets.prototype.serverVer = function () {
    var ds = this.ds();
    return ds && ds.serverVer ? ds.serverVer() : 0;
};

DsGadgets.prototype.swingAnim = function () {
    var ds = this.ds();
    var anim = ds && ds.ctrl && ds.ctrl._animComponent;
    if (!anim) return;
    // kol animasyonu oyunun yumruk sesini de çalıyor: atış/kanca için sustur
    if (ds.muteHitSound) ds.muteHitSound(0.9);
    anim.setBoolean('hit', true);
    setTimeout(function () { anim.setBoolean('hit', false); }, 450);
};

// ---------------------------------------------------------------- KANCA
DsGadgets.prototype.useHook = function () {
    var ds = this.ds();
    if (!ds || ds.caught || ds.finished || (ds.isRolling && ds.isRolling())) return false;
    if (this.time - this.lastHook < DsGadgets.HOOK_COOLDOWN) return false;
    if ((this.uses[DsGadgets.HOOK_ITEM] || 0) <= 0) return false;
    this.lastHook = this.time;
    var cam = this.app.root.findByName('Camera');
    var dir = cam ? cam.forward.clone() : ds.player.forward.clone();
    dir.normalize();
    var eye = cam ? cam.getPosition() : ds.player.getPosition();
    var me = ds.player.getPosition();
    // En iyi hedef: menzilde, baktığın yöne en yakın açıdaki oyuncu
    var best = null, bestDot = DsGadgets.HOOK_CONE;
    var rps = this.app.network && this.app.network.remotePlayers;
    for (var key in rps || {}) {
        var r = rps[key] && rps[key].entity;
        var rc = r && r.script && r.script.remotePlayerController;
        if (!r || r._destroyed || !r.enabled) continue;
        var p = r.getPosition().clone().add(new pc.Vec3(0, 0.5, 0));
        if (p.distance(me) > DsGadgets.HOOK_RANGE || p.distance(me) < 2) continue;
        var to = p.clone().sub(eye).normalize();
        var dot = to.dot(dir);
        if (dot > bestDot) { bestDot = dot; best = { sid: (rc && rc.sessionId) || key, p: p }; }
    }
    this.swingAnim();
    ds.playP('rope', 1, 0.95, 1.05);
    ds.playP('swoosh', 0.6, 1.2, 1.4);
    var room = this.app.room;
    if (best) {
        if (this.serverVer() >= 8) {
            var h = this.handPos();
            ds.sendNet('Client:DS:Hook', { t: best.sid, x: +h.x.toFixed(2), y: +h.y.toFixed(2), z: +h.z.toFixed(2) });
        }
        this.addRope(room ? room.sessionId : null, best.sid, null, 0.55);
    } else {
        // ıska: kanca boşluğa atılır
        var miss = this.handPos().add(dir.clone().mulScalar(DsGadgets.HOOK_RANGE * 0.8));
        this.addRope(room ? room.sessionId : null, null, miss, 0.3);
    }
    this.consume(DsGadgets.HOOK_ITEM);
    return true;
};

// Sunucudan: biri birini çekti (çekilen bizsek bize uygulanır)
DsGadgets.prototype.onHook = function (msg) {
    if (!msg || typeof msg.t !== 'string') return;
    var room = this.app.room;
    var meSid = room && room.sessionId;
    if (msg.from !== meSid) {
        this.addRope(msg.from, msg.t, null, 0.6);
        var src = this.playerPoint(msg.from), mine = this.ds() && this.ds().player.getPosition();
        var v = src && mine ? Math.max(0, 1 - src.distance(mine) / 40) : 0;
        if (v > 0 && msg.t !== meSid) this.ds().playP('rope', v, 0.95, 1.05);
    }
    if (msg.t !== meSid) return;
    var ds = this.ds();
    if (!ds || ds.caught || ds.finished || (ds.shieldActive && ds.shieldActive())) return;
    this.pull = { from: msg.from, x: msg.x, y: msg.y, z: msg.z, t: 0 };
    ds.playP('oof', 1, 1, 1.1);
    ds.playP('swoosh', 0.8, 0.7, 0.8);
    if (ds.hitFx) ds.hitFx(ds.player.getPosition());
};

// Kontrolcüden sonra (fizikten önce): çekilen oyuncunun hızı
DsGadgets.prototype.hookController = function () {
    var ds = this.ds();
    if (!ds || ds._gadgetHooked) return;
    ds._gadgetHooked = true;
    var self = this;
    var orig = ds.afterController;
    ds.afterController = function (dt) {
        orig.call(this, dt);
        var g = self.app.dsGadgets;
        if (g && !g._destroyed) g.applyPull(dt);
    };
};

DsGadgets.prototype.applyPull = function (dt) {
    var pl = this.pull;
    if (!pl) return;
    var ds = this.ds();
    if (!ds || ds.caught || ds.finished) { this.pull = null; return; }
    pl.t += dt;
    var tgt = this.playerPoint(pl.from) || new pc.Vec3(pl.x, pl.y, pl.z);
    var me = ds.player.getPosition();
    var dx = tgt.x - me.x, dz = tgt.z - me.z, d = Math.hypot(dx, dz);
    var rb = ds.player.rigidbody;
    if (d < 2.2 || pl.t > DsGadgets.PULL_MAX) {
        // vardı: momentum yumuşakça bitsin
        var v0 = rb.linearVelocity.clone();
        rb.linearVelocity = new pc.Vec3(v0.x * 0.3, Math.min(v0.y, 4), v0.z * 0.3);
        this.pull = null;
        return;
    }
    var sp = Math.min(DsGadgets.PULL_SPEED, d / 0.12);
    // hafif yay: kalkar, hedefin biraz üstüne doğru gider
    var vy = pc.math.clamp((tgt.y + 0.8 - me.y) * 5 + 3, -6, 12);
    rb.linearVelocity = new pc.Vec3(dx / d * sp, vy, dz / d * sp);
    if (ds.ctrl) { ds.ctrl._jumped = true; ds.ctrl._timeSinceLastJump = 0; }
};

// İp: iki uç arasında ince kutu + uçta kanca
DsGadgets.prototype.addRope = function (fromSid, toSid, toPoint, life) {
    var rope = this.ropes.find(function (r) { return !r.busy; });
    if (!rope) {
        var root = new pc.Entity('HookRope');
        var line = new pc.Entity('Line');
        line.addComponent('render', { type: 'box', castShadows: false, receiveShadows: false });
        line.render.material = this.mat('rope', function (m) { m.diffuse = new pc.Color(0.25, 0.2, 0.12); m.emissive = new pc.Color(0.35, 0.28, 0.16); m.useFog = true; });
        var head = new pc.Entity('Head');
        if (this.hookHead) {
            // Steal and Run'daki kanca modeli; boyutu yüklenince ~0.6 m'ye ayarlanır
            head.addComponent('render', { type: 'asset', asset: this.hookHead.id, materialAssets: this.hookMaterial ? [this.hookMaterial.id] : [], castShadows: false, receiveShadows: false });
            head.autoSize = 0.6;
        } else {
            head.addComponent('render', { type: 'cone', castShadows: false, receiveShadows: false });
            head.render.material = this.mat('hook', function (m) { m.diffuse = new pc.Color(0.6, 0.6, 0.65); m.emissive = new pc.Color(0.5, 0.5, 0.55); m.useFog = true; });
            head.setLocalScale(0.35, 0.45, 0.35);
        }
        root.addChild(line);
        root.addChild(head);
        this.app.root.addChild(root);
        rope = { root: root, line: line, head: head, busy: false };
        this.ropes.push(rope);
    }
    rope.busy = true;
    rope.t = 0;
    rope.life = life;
    rope.from = fromSid;
    rope.to = toSid;
    rope.toPoint = toPoint;
    rope.root.enabled = true;
    this.updateRope(rope);
};

DsGadgets.prototype.updateRope = function (r) {
    var a = this.playerPoint(r.from);
    var b = r.to ? this.playerPoint(r.to) : r.toPoint;
    if (!a || !b) { r.busy = false; r.root.enabled = false; return; }
    // çıkış: ilk 0.12 sn'de uç hedefe uzanır
    var k = Math.min(1, r.t / 0.12);
    var end = a.clone().lerp(a, b, k);
    var mid = a.clone().add(end).mulScalar(0.5);
    var len = Math.max(0.01, a.distance(end));
    r.line.setPosition(mid);
    r.line.lookAt(end);
    r.line.setLocalScale(0.06, 0.06, len);
    r.head.setPosition(end);
    r.head.lookAt(a);
    if (r.head.autoSize) DsGadgets.fitSize(r.head, r.head.autoSize);
    else r.head.rotateLocal(-90, 0, 0);
};

// Modelin en uzun kenarı 'size' metre olsun (model yüklenince bir kez)
DsGadgets.fitSize = function (e, size) {
    if (e._fitted) return true;
    var mis = e.render && e.render.meshInstances;
    if (!mis || !mis.length) return false;
    var aabb = new pc.BoundingBox();
    aabb.copy(mis[0].aabb);
    for (var i = 1; i < mis.length; i++) aabb.add(mis[i].aabb);
    var h = aabb.halfExtents, m = Math.max(h.x, h.y, h.z) * 2;
    if (!(m > 1e-5)) return false;
    var s = e.getLocalScale().clone().mulScalar(size / m);
    e.setLocalScale(s);
    e._fitted = true;
    return true;
};

// ---------------------------------------------------------------- BUZ BOMBASI
DsGadgets.prototype.throwIce = function (onRelease) {
    var ds = this.ds();
    if (!ds || ds.caught || ds.finished) return false;
    if (this.time - this.lastIce < DsGadgets.ICE_COOLDOWN) return false;
    if ((this.uses[DsGadgets.ICE_ITEM] || 0) <= 0) return false;
    this.lastIce = this.time;
    this.swingAnim();
    var self = this;
    setTimeout(function () {
        if (!self.entity || self.entity._destroyed) return;
        var cam = self.app.root.findByName('Camera');
        var dir = cam ? cam.forward.clone() : ds.player.forward.clone();
        dir.y = Math.max(dir.y, -0.2);
        dir.normalize();
        var start = self.handPos().add(new pc.Vec3(dir.x, 0, dir.z).normalize().mulScalar(0.4));
        var e = new pc.Entity('IceBomb');
        e.addComponent('render', { type: 'box', castShadows: false, receiveShadows: false });
        e.render.material = self.mat('iceShot', function (m) { m.diffuse = new pc.Color(0.6, 0.9, 1); m.emissive = new pc.Color(0.35, 0.7, 0.9); m.opacity = 0.85; m.blendType = pc.BLEND_NORMAL; });
        e.setLocalScale(0.45, 0.45, 0.45);
        e.setPosition(start);
        self.app.root.addChild(e);
        self.shots.push({ e: e, v: dir.mulScalar(24).add(new pc.Vec3(0, 7, 0)), t: 0 });
        ds.playP('throw', 0.8, 1.1, 1.2);
        self.consume(DsGadgets.ICE_ITEM);
        if (onRelease) onRelease();
    }, 200);
    return true;
};

DsGadgets.prototype.updateShots = function (dt) {
    var ds = this.ds();
    for (var i = this.shots.length - 1; i >= 0; i--) {
        var s = this.shots[i];
        s.t += dt;
        var p0 = s.e.getPosition().clone();
        s.v.y -= 22 * dt;
        var p1 = p0.clone().add(s.v.clone().mulScalar(dt));
        s.e.setPosition(p1);
        s.e.rotateLocal(400 * dt, 300 * dt, 0);
        // bloğa çarptı mı
        var hit = this.app.systems.rigidbody.raycastFirst(p0, p1);
        var water = ds ? (ds.curWaterLevel !== undefined ? ds.curWaterLevel : 0) : 0;
        var land = null;
        if (hit && hit.entity && hit.entity.tags && hit.entity.tags.has('Ground')) land = hit.point;
        else if (p1.y <= water) land = new pc.Vec3(p1.x, water, p1.z);
        else if (s.t > 4) land = p1;
        if (land) {
            s.e.destroy();
            this.shots.splice(i, 1);
            this.freezeAt(land);
        }
    }
};

DsGadgets.prototype.freezeAt = function (p) {
    var ds = this.ds();
    if (!ds) return;
    this.iceBurst(p);
    ds.playP('punch', 0.7, 1.4, 1.6);
    ds.playP('flare', 0.5, 1.5, 1.7);
    var ok = ds.stunNear(p, DsGadgets.ICE_RADIUS);
    if (ok) this.app.fire('WarningTextController:setWarning', 'FROZEN!', 1.5, new pc.Color(0.5, 0.9, 1, 1));
};

// Buz parçaları + buz halkası
DsGadgets.prototype.iceBurst = function (p) {
    if (!this.burst) {
        var e = new pc.Entity('IceBurst');
        var ds = this.ds();
        e.addComponent('particlesystem', {
            autoPlay: false, loop: false, numParticles: 50, lifetime: 0.8, rate: 0.001, rate2: 0.001,
            emitterShape: pc.EMITTERSHAPE_SPHERE, emitterRadius: 0.8, startAngle: 0, startAngle2: 360,
            localVelocityGraph: new pc.CurveSet([[0, -9], [0, 4], [0, -9]]),
            localVelocityGraph2: new pc.CurveSet([[0, 9], [0, 13], [0, 9]]),
            velocityGraph: new pc.CurveSet([[0, 0], [0, 0, 1, -18], [0, 0]]),
            scaleGraph: new pc.Curve([0, 0.45, 1, 0.15]),
            alphaGraph: new pc.Curve([0, 1, 0.7, 0.8, 1, 0]),
            colorGraph: new pc.CurveSet([[0, 0.75, 1, 0.9], [0, 0.95, 1, 1], [0, 1, 1, 1]]),
            colorMap: ds && ds.dropTex ? ds.dropTex() : null, blendType: pc.BLEND_ADDITIVEALPHA, depthWrite: false, lighting: false
        });
        if (e.particlesystem.emitter) { e.particlesystem.emitter.useFog = false; if (e.particlesystem.emitter.resetMaterial) e.particlesystem.emitter.resetMaterial(); }
        this.app.root.addChild(e);
        this.burst = e;
    }
    this.burst.setPosition(p.x, p.y + 0.3, p.z);
    this.burst.particlesystem.reset();
    this.burst.particlesystem.play();
};

// Donmuş canavar: etrafında saydam buz kütlesi
DsGadgets.prototype.updateIce = function (dt) {
    var ds = this.ds();
    if (!ds || !ds.monsters) return;
    var S = DontSplashManager.STATE;
    var self = this;
    var mat = this.mat('iceBlock', function (m) {
        m.diffuse = new pc.Color(0.55, 0.85, 1); m.emissive = new pc.Color(0.2, 0.45, 0.6);
        m.opacity = 0.55; m.blendType = pc.BLEND_NORMAL; m.depthWrite = false; m.useFog = true;
    });
    for (var i = 0; i < ds.monsters.length; i++) {
        var m = ds.monsters[i];
        var b = this.iceBlocks[i];
        if (!b) {
            var e = new pc.Entity('IceBlock');
            e.addComponent('render', { type: 'box', castShadows: false, receiveShadows: false });
            e.render.material = mat;
            e.enabled = false;
            self.app.root.addChild(e);
            b = this.iceBlocks[i] = { e: e, k: 0 };
        }
        var frozen = m.state === S.STUN;
        b.k = pc.math.clamp(b.k + (frozen ? dt * 6 : -dt * 3), 0, 1);
        var on = b.k > 0.01;
        if (b.e.enabled !== on) b.e.enabled = on;
        if (!on) continue;
        var v = m.vis;
        var s = 0.6 + 0.4 * b.k;
        var shake = frozen ? 0 : Math.sin(this.time * 60) * 0.15;     // kırılırken titrer
        b.e.setPosition(v.x + (m.offX || 0) + shake, 1.6, v.z + (m.offZ || 0));
        b.e.setEulerAngles(0, v.rot || 0, 0);
        b.e.setLocalScale(5.2 * s, 9 * s, 5.2 * s);
    }
};

// ---------------------------------------------------------------- döngü
DsGadgets.prototype.bindRoom = function () {
    var room = this.app.room;
    if (room === this.boundRoom) return;
    if (this.offHook) { try { this.offHook(); } catch (e) { } this.offHook = null; }
    this.boundRoom = room;
    if (!room || room.name !== 'DontSplash') return;
    var self = this;
    this.offHook = room.onMessage('Server:DS:Hook', function (msg) { self.onHook(msg); });
};

DsGadgets.prototype.update = function (dt) {
    this.time += dt;
    this.bindRoom();
    for (var i = 0; i < this.ropes.length; i++) {
        var r = this.ropes[i];
        if (!r.busy) continue;
        r.t += dt;
        if (r.t > r.life) { r.busy = false; r.root.enabled = false; continue; }
        this.updateRope(r);
    }
    this.updateShots(dt);
    this.updateIce(dt);
};

DsGadgets.prototype.onDestroy = function () {
    if (this.app.dsGadgets === this) this.app.dsGadgets = null;
    if (this.offHook) { try { this.offHook(); } catch (e) { } }
    this.ropes.forEach(function (r) { r.root.destroy(); });
    this.shots.forEach(function (s) { s.e.destroy(); });
    this.iceBlocks.forEach(function (b) { if (b) b.e.destroy(); });
    if (this.burst) this.burst.destroy();
    var ds = this.app.dontSplash;
    if (ds) ds._gadgetHooked = false;
};
