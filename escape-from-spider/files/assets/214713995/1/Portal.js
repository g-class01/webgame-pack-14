var Portal = pc.createScript('portal');
Portal.attributes.add("door", { type: "entity" });
Portal.attributes.add("enterTrigger", { type: "entity" });
Portal.attributes.add("nextSceneName", { type: "string" });

// Kapıya değince oyuncu idle'da durur, kamera kapıya dönüp mor portal yüzeyine dalar, sonra ekran kararır.
Portal.DIVE_TURN = 0.45;      // kameranın kapıya dönüp önüne gelme süresi (sn)
Portal.DIVE_PUSH = 0.6;       // portal yüzeyine dalma süresi (sn)
Portal.DIVE_FADE_AT = 0.25;   // dalma başladıktan kaç sn sonra kararma başlasın
Portal.DIVE_FRONT = 5;        // dalmadan önce kapının kaç metre önüne gelsin
Portal.DIVE_FOV_ADD = 18;     // dalarken FOV artışı (hız hissi)
Portal.DIVE_RISE = 2;         // ön noktanın kapı ortasından yüksekliği
Portal.LOCKED_COOLDOWN = 1.5; // kilitli kapı uyarısı tekrar süresi (sn)

Portal.prototype.initialize = function () {
    this.entity.collision.on("triggerenter", this.openDoor, this);
    this.entity.collision.on("triggerleave", this.closeDoor, this);
    this.enterTrigger.collision.on("triggerenter", this.nextChapterCollision, this);
    this.lastLockedWarn = -100;
    // Lobi kapıları mor yüzeylidir; dalış ve kilitli kapı davranışı sadece onlarda
    this.isLobbyPortal = !!this.entity.findByName("PortalSurface");

    // Kilitli kapı uyarısı kapının önündeki beyaz halkaya girince çalışır
    var ring = this.entity.findByName("RingTrigger");
    if (ring && ring.collision) {
        ring.collision.on("triggerenter", function (other) {
            if (other.tags.has("Player") && this.isLocked()) this.lockedFeedback();
        }, this);
    }

    // Lobide kilitli chapter kapılarındaki asma kilit, kilit açıksa gizlenir
    var lockVisual = this.entity.findByName("LockVisual");
    if (lockVisual) lockVisual.enabled = this.isLocked();
};

Portal.prototype.isLocked = function () {
    if (this.nextSceneName == "Chapter2") return Utils.getItem("chapterOneFinished") != "true";
    if (this.nextSceneName == "Chapter3") return Utils.getItem("chapterTwoFinished") != "true";
    return false;
};

Portal.prototype.nextChapterCollision = async function (other) {
    if (!other.tags.has("Player")) return;
    if (this.entering) return;
    if (this.isLocked()) {
        if (this.isLobbyPortal) this.lockedFeedback();
        else this.app.fire('WarningTextController:setWarning', this.nextSceneName == "Chapter2" ? "Complete Chapter 1 to unlock!" : "Complete Chapter 2 to unlock!", 7, new pc.Color(1, 0, 0, 1));
        return;
    }
    if (this.nextSceneName == "") {
        this.app.fire('WarningTextController:setWarning', "Like the game to speedup updates!", 7, new pc.Color(1, 0, 0, 1));
        return;
    }
    this.entering = true;
    this.entity.collision.off("triggerenter", this.openDoor, this);
    this.entity.collision.off("triggerleave", this.closeDoor, this);

    var self = this;
    var diving = this.startDive(other);
    if (!diving) this.app.player.controller.setFrozen(true);

    // Odadan çıkış arka planda başlar, animasyon bitince beklenir
    var leaving = this.app.room ? this.app.room.leave().catch(function () {}) : Promise.resolve();
    await new Promise(function (resolve) {
        if (!diving) resolve();
        else self.diveDone = resolve;
    });
    await Promise.race([leaving, new Promise(function (r) { setTimeout(r, 1500); })]);

    //load next chapter stop sounds and disconnect
    this.app.musicPlayer.stop();
    this.app.ambienceManager.stop();
    this.app.scenes.changeScene(this.nextSceneName);
};

// Kilitli kapı: açılmaz, hafif pop yapar ve uyarı çıkar
Portal.prototype.lockedFeedback = function () {
    var now = Date.now() / 1000;
    if (now - this.lastLockedWarn < Portal.LOCKED_COOLDOWN) return;
    this.lastLockedWarn = now;

    var msg = this.nextSceneName == "Chapter2" ? "Locked! Complete Chapter 1 to unlock." : "Locked! Complete Chapter 2 to unlock.";
    this.app.fire('WarningTextController:setWarning', msg, 3, new pc.Color(1, 0, 0, 1));
    if (this.entity.sound && this.entity.sound.slot("close")) this.entity.sound.play("close");

    var target = this.door;
    if (!target) return;
    if (!this.doorBaseScale) this.doorBaseScale = target.getLocalScale().clone();
    var base = this.doorBaseScale;
    if (this.popTween) this.popTween.stop();
    target.setLocalScale(base);
    var self = this;
    var s = { v: 0 };
    this.popTween = this.app.tween(s).to({ v: 1 }, 0.35, pc.Linear)
        .onUpdate(function () {
            // 0 -> büyü -> geri yaylan
            var k = Math.sin(s.v * Math.PI) * (1 - s.v * 0.5) * 0.07;
            target.setLocalScale(base.x * (1 + k), base.y * (1 + k), base.z * (1 + k));
        })
        .onComplete(function () { target.setLocalScale(base); self.popTween = null; })
        .start();
};

Portal.prototype.findCamera = function () {
    var best = null;
    var cams = this.app.root.findComponents('camera');
    for (var i = 0; i < cams.length; i++) {
        var c = cams[i];
        if (!c.enabled || !c.entity.enabled) continue;
        if (!best || c.priority >= best.priority) best = c;
    }
    return best ? best.entity : null;
};

Portal.prototype.startDive = function (playerEntity) {
    // Sadece mor yüzeyi olan kapılarda (lobi) dalış var, chapter içi kapılar eskisi gibi
    var surface = this.entity.findByName("PortalSurface");
    if (!surface) return false;
    var cam = this.findCamera();
    if (!cam) return false;

    var target = surface.getPosition().clone();
    var camPos = cam.getPosition().clone();
    // Yüzey sadece ön tarafından (up yönü) görünür
    var normal = surface.up.clone();

    // Oyuncu olduğu yerde idle'da dursun
    var player = playerEntity || this.app.root.findByName('Player');
    if (this.app.player) this.app.player.canMove = false;
    var ctrl = this.app.player && this.app.player.controller;
    if (ctrl) {
        if (ctrl._direction) ctrl._direction.set(0, 0, 0);
        if (ctrl._animComponent) ctrl._animComponent.setBoolean("walk", false);
        if (ctrl.setIsWalking) ctrl.setIsWalking(false);
    }
    if (player && player.rigidbody) {
        var v = player.rigidbody.linearVelocity;
        player.rigidbody.linearVelocity = new pc.Vec3(0, Math.min(v.y, 0), 0);
    }

    // Kamerayı oyuncu scriptlerinden ayır
    if (cam.script) {
        ['cameraController', 'mobileCameraController'].forEach(function (name) {
            var s = cam.script[name];
            if (s && s.enabled) s.enabled = false;
        });
    }

    // İsim yazısı hemen gizlenir, model kamera yaklaşınca
    var playerRenders = [];
    if (player) {
        player.findComponents('element').forEach(function (el) { if (!el.entity.isDescendantOf(cam)) el.enabled = false; });
        player.findComponents('render').forEach(function (r) { if (r.enabled && !r.entity.isDescendantOf(cam)) playerRenders.push(r); });
    }

    // Ön nokta biraz yukarıda: kamera oyuncunun başının üstünden süzülerek kapıya dalar
    var front = target.clone().add(normal.clone().mulScalar(Portal.DIVE_FRONT));
    front.y += Portal.DIVE_RISE;
    var startRot = cam.getRotation().clone();
    // Kamera kapının arkasındaysa duvarın içinden geçmesin: ön tarafa al
    var side = camPos.clone().sub(target).dot(normal);
    if (side < 1) {
        camPos.add(normal.clone().mulScalar(Math.max(Portal.DIVE_FRONT + 3, 1 - side * 2)));
        startRot = this.lookRotation(camPos, target);
    }
    var end = target.clone().add(normal.clone().mulScalar(cam.camera.nearClip + 0.25));
    var playerSide = player ? player.getPosition().clone().sub(target).dot(normal) : 0;

    this.dive = {
        cam: cam,
        player: player,
        playerRenders: playerRenders,
        playerSide: playerSide,
        normal: normal,
        target: target,
        t: 0,
        startPos: camPos,
        startRot: startRot,
        front: front,
        end: end,
        lookRot: this.lookRotation(front, target),
        fov: cam.camera.fov,
        fadeStarted: false
    };
    return true;
};

Portal.prototype.lookRotation = function (eye, target) {
    var m = new pc.Mat4().setLookAt(eye, target, pc.Vec3.UP);
    return new pc.Quat().setFromMat4(m);
};

Portal.easeInOut = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
Portal.easeIn = function (t) { return t * t * t; };

Portal.prototype.update = function (dt) {
    var d = this.dive;
    if (!d || d.finished) return;
    d.t += Math.min(dt, 0.05);
    var cam = d.cam;
    var pos = new pc.Vec3();
    var rot = new pc.Quat();

    // Oyuncu kaymasın
    if (d.player && d.player.rigidbody) {
        var v = d.player.rigidbody.linearVelocity;
        if (v.x !== 0 || v.z !== 0) d.player.rigidbody.linearVelocity = new pc.Vec3(0, Math.min(v.y, 0), 0);
    }

    if (d.t < Portal.DIVE_TURN) {
        var a = Portal.easeInOut(d.t / Portal.DIVE_TURN);
        pos.lerp(d.startPos, d.front, a);
        rot.slerp(d.startRot, d.lookRot, a);
    } else {
        var tb = Math.min((d.t - Portal.DIVE_TURN) / Portal.DIVE_PUSH, 1);
        var b = Portal.easeIn(tb);
        pos.lerp(d.front, d.end, b);
        rot.copy(d.lookRot);
        cam.camera.fov = d.fov + Portal.DIVE_FOV_ADD * b;

        // Kararma dalış bitmeden başlar, ekran tam morla dolarken kararır
        // (nextChapterCollision devam edip changeScene çağırır, SceneTransition karartır)
        if (!d.fadeStarted && d.t - Portal.DIVE_TURN >= Portal.DIVE_FADE_AT && this.diveDone) {
            d.fadeStarted = true;
            var done = this.diveDone;
            this.diveDone = null;
            done();
        }
        if (tb >= 1) d.finished = true;
    }

    // Kamera oyuncunun içinden geçeceği an oyuncu modeli gizlenir
    if (d.playerRenders.length && pos.clone().sub(d.target).dot(d.normal) < d.playerSide + 0.8) {
        d.playerRenders.forEach(function (r) { r.enabled = false; });
        d.playerRenders = [];
    }

    cam.setPosition(pos);
    cam.setRotation(rot);
};

Portal.prototype.openDoor = function () {
    // Lobide kilitli kapı açılmaz
    if (this.isLobbyPortal && this.isLocked()) return;
    // Lobide kapıya yaklaşınca bu modun dosyalarını öncelikli indir
    if (this.nextSceneName) this.app.fire('prefetch:scene', this.nextSceneName);
    this.entity.sound.play("open");
    if (this.doorTween)
        this.doorTween.stop();
    this.doorTween = this.door
        .tween(this.door.getLocalEulerAngles())
        .rotate(new pc.Vec3(0, 0, 55), 1, pc.ElasticOut) // Smooth magical ease-out
        .start();
}

Portal.prototype.closeDoor = function () {
    if (this.isLobbyPortal && this.isLocked()) return;
    this.entity.sound.play("close");
    if (this.doorTween)
        this.doorTween.stop();
    this.doorTween = this.door
        .tween(this.door.getLocalEulerAngles())
        .rotate(new pc.Vec3(0, 0, 180), 0.2, pc.Linear) // Bouncy magical effect
        .start();
}
