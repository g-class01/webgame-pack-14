var DontSplashManager = pc.createScript('dontSplashManager');

// DON'T SPLASH modu: su, yüzme, sıçrama (splash) sesi, kör canavarlar, checkpoint, oda arayüzü ve çıkış.
// Canavarlar sunucu varsa sunucudan (room.state.dsMonsters), yoksa burada yerel olarak simüle edilir.
DontSplashManager.attributes.add('waterLevel', { type: 'number', default: 0 });
DontSplashManager.attributes.add('swimSpeed', { type: 'number', default: 5 });
DontSplashManager.attributes.add('swimJump', { type: 'number', default: 17 });
DontSplashManager.attributes.add('fontAsset', { type: 'asset', assetType: 'font' });
DontSplashManager.attributes.add('splashSound', { type: 'asset', assetType: 'audio' });
DontSplashManager.attributes.add('noiseSound', { type: 'asset', assetType: 'audio' });
DontSplashManager.attributes.add('ambienceSound', { type: 'asset', assetType: 'audio' });
DontSplashManager.attributes.add('attackSound', { type: 'asset', assetType: 'audio' });
DontSplashManager.attributes.add('heartbeatSound', { type: 'asset', assetType: 'audio' });
DontSplashManager.attributes.add('successSound', { type: 'asset', assetType: 'audio' });
DontSplashManager.attributes.add('dropTexture', { type: 'asset', assetType: 'texture' });
DontSplashManager.attributes.add('ringTexture', { type: 'asset', assetType: 'texture' });
DontSplashManager.attributes.add('throwSound', { type: 'asset', assetType: 'audio' });
DontSplashManager.attributes.add('flareSound', { type: 'asset', assetType: 'audio' });
DontSplashManager.attributes.add('valveSound', { type: 'asset', assetType: 'audio' });
DontSplashManager.attributes.add('alarmSound', { type: 'asset', assetType: 'audio' });
DontSplashManager.attributes.add('doorSound', { type: 'asset', assetType: 'audio' });
DontSplashManager.attributes.add('clickSound', { type: 'asset', assetType: 'audio' });

DontSplashManager.attributes.add('pebbleIcon', { type: 'asset', assetType: 'texture' });
DontSplashManager.attributes.add('flareIcon', { type: 'asset', assetType: 'texture' });
DontSplashManager.attributes.add('buttonTexture', { type: 'asset', assetType: 'texture' });

// Bölümler: her biri ayrı su alanı, kendi canavarı ve kendi mekaniği var. Aralarındaki zeminler (16 m)
// güvenli bölge ve checkpoint. Başlangıç zemini z<0, çıkış zemini END_Z'den sonra.
// Sunucudaki DontSplashManager.ts ROOMS ile aynı olmalı (z0+3 .. z1-3).
// İki salon: 1. salon z -30..877, sonundaki kapı 2. salona (HALL2_Z kadar ileride, aynı model) ışınlar.
// Kolaydan zora: geniş karolar -> normal -> hafıza -> çöken -> küçük karolar -> üç şerit | batan -> çöken koşu -> karışık -> uzun atlayış -> batan -> derin uç
DontSplashManager.HALL2_Z = 1000;
DontSplashManager.SECTIONS = [
    { z0: 0, z1: 130, name: 'WARM UP', hint: 'Big tiles. Hop across and stay out of the water!', color: [0.55, 0.85, 1] },
    { z0: 146, z1: 276, name: 'THE POOL', hint: "Hop block to block. Don't splash!", color: [0.4, 0.75, 1] },
    { z0: 292, z1: 422, name: 'MEMORY BRIDGE', hint: 'Remember the path, then climb the towers', color: [0.45, 1, 0.6] },
    { z0: 438, z1: 568, name: 'CRUMBLING TILES', hint: 'Cracked tiles fall after you step on them!', color: [1, 0.68, 0.3] },
    { z0: 584, z1: 714, name: 'STEPPING STONES', hint: 'Smaller tiles, longer jumps!', color: [0.55, 0.95, 0.9] },
    { z0: 730, z1: 860, name: 'THREE LANES', hint: 'Pick a lane and keep hopping!', color: [1, 0.4, 0.35] },
    { z0: 1000, z1: 1130, name: 'SINKING TILES', hint: "Don't stand still, tiles sink under you!", color: [0.78, 0.55, 1] },
    { z0: 1146, z1: 1276, name: 'CRUMBLE RUN', hint: 'Keep running, the floor is falling apart!', color: [1, 0.55, 0.2] },
    { z0: 1292, z1: 1422, name: 'MIXED TILES', hint: 'Every tile is a surprise!', color: [1, 0.85, 0.3] },
    { z0: 1438, z1: 1568, name: 'SHAKY GROUND', hint: 'Cracking and sinking tiles. Keep moving!', color: [1, 0.6, 0.45] },
    { z0: 1584, z1: 1714, name: 'LONG JUMPS', hint: 'Wider gaps. Jump at full speed!', color: [1, 0.35, 0.45] },
    { z0: 1730, z1: 1860, name: 'CRUMBLE CHAOS', hint: 'Almost every tile falls apart!', color: [1, 0.5, 0.15] },
    { z0: 2000, z1: 2130, name: 'SINKING SPRINT', hint: "Sprint! Don't let the tiles pull you under!", color: [0.7, 0.45, 1] },
    { z0: 2146, z1: 2276, name: 'CRUMBLE MAZE', hint: 'Cracked tiles hide in every lane!', color: [1, 0.3, 0.4] },
    { z0: 2292, z1: 2422, name: 'NIGHTMARE MIX', hint: 'Tiny tiles. Big jumps. Good luck!', color: [0.9, 0.3, 0.9] },
    { z0: 2438, z1: 2568, name: 'ZIGZAG', hint: 'Tiles are scattered. Find your path!', color: [1, 0.3, 0.5] },
    { z0: 2584, z1: 2714, name: 'SINK OR SWIM', hint: 'Sinking tiles everywhere. Keep moving!', color: [0.65, 0.45, 1] },
    { z0: 2730, z1: 2860, name: 'THE DEEP END', hint: 'Everything at once. Hold your breath!', color: [1, 0.25, 0.25] },
    { z0: 3000, z1: 3130, name: 'LAST STAND', hint: 'Almost there. Every mistake counts!', color: [1, 0.2, 0.3] },
    { z0: 3146, z1: 3276, name: 'FINAL ESCAPE', hint: 'The exit is right ahead. RUN!', color: [1, 0.15, 0.15] }
];
DontSplashManager.END_Z = 3276;
DontSplashManager.ROOMS = DontSplashManager.SECTIONS.map(function (s) { return { name: s.name, z0: s.z0, z1: s.z1 }; });
// Canavarların gezdiği su alanları (her bölümde bir canavar, birbirine geçmez)
DontSplashManager.MONSTER_AREAS = DontSplashManager.SECTIONS.map(function (s) { return { z0: s.z0 + 3, z1: s.z1 - 3 }; });
// k. bölümden önceki zemin (k=0: başlangıç zemini)
DontSplashManager.floorBefore = function (k) {
    var S = DontSplashManager.SECTIONS;
    if (k <= 0) return { z0: -30, z1: S[0].z0 };
    // 2. salonun ilk bölümü: önceki bölümle arasında salon değişiyor, zemin salonun başlangıç zemini
    if (S[k].z0 - S[k - 1].z1 > 40) return { z0: S[k].z0 - 30, z1: S[k].z0 };
    return { z0: S[k - 1].z1, z1: S[k].z0 };
};
// Canavara göre: ayak hizası, oyuncuyu tuttuğu el kemiği, yakalarken atılma mesafesi
// (PoolMaw: yatay, suda yüzen yaratık; oyuncuyu ağzında tutar)
DontSplashManager.MONSTER_LOOK = {};
DontSplashManager.MONSTER_HOLD = ['Grab_Socket', 'Throat', 'Head'];
DontSplashManager.MONSTER_MOUTH = ['Mouth_Socket', 'Throat', 'Head'];
// Yeme animasyonu (catch_eat, 4 sn) zamanlaması: el uzanır, tutar, kaldırır, ağza atar, yutar
DontSplashManager.CATCH_LOCAL = { x: -1.1, z: 4.6 };   // Catch_Point, canavar kökünün ölçeksiz uzayında
DontSplashManager.EAT = { reach: 0.42, grab: 0.62, toMouth: 1.42, inMouth: 1.62, menu: 2.5, len: 4 };
DontSplashManager.MONSTER_LUNGE = 7.6;      // canavar 1.8 ölçekte (eskisi 1.2'de 5.2)
DontSplashManager.MONSTER_HOLD_DY = 2.3;   // tutma noktasından ayağa: kafa yumruğun içinde, gövde altta sallanır
DontSplashManager.MONSTER_STRIDE = 22;     // yürüme animasyonu 1x hızda, ölçek 1 iken ayağın geriye kayma hızı (m/sn)   // ağız kemiğinden karakter köküne
// Steal and Run sopası (Stick şablonu ve PlayerController.roll ile birebir)
DontSplashManager.BAT_COOLDOWN = 0.8;
DontSplashManager.ROLL_TIME = 1.5;        // min(10 * 150, 2500) ms
DontSplashManager.ROLL_SPIN = 6;          // rad/sn (angularVelocity = yön * 6)
DontSplashManager.ROLL_DAMP = 0.7;        // angularDamping
DontSplashManager.ROLL_ANIM = 314398405;  // Steal and Run Roll animasyonu
DontSplashManager.DUST_TEX = 314541374;   // HitFx dokusu
DontSplashManager.SND_SWOOSH = 314541372;
DontSplashManager.SND_PUNCH = 314541373;
DontSplashManager.SND_OOF = 314541371;
DontSplashManager.STUN_TIME = 6;
DontSplashManager.MAX_PEBBLES = 3;
DontSplashManager.MAX_FLARES = 2;
DontSplashManager.POOL_HALF = 61;         // havuzun yarı genişliği (su burada)
DontSplashManager.POOL_X = 58;            // canavarın gezebileceği x sınırı
DontSplashManager.PATROL_SPEED = 7;
DontSplashManager.DOWN_BTN_Y = 0;          // yakalanma menüsü: Continue ekranın ortasında, Restart altında
// yakalanma menüsünün görünümü: üstte kafatası, altında yan yana yeşil Restart ve mor Continue (reklam), en altta süre çubuğu
DontSplashManager.DOWN_LOOK = {
    restartSprite: 196470375,   // btn-dark-grn
    continueSprite: 196470376,  // btn-dark-ind (mor)
    skullTex: 220594184, skullColor: new pc.Color(1, 0.86, 0.66), skullSize: 150, skullY: 85,
    dx: 228, btnY: -60, barY: -145,
    width: 900                  // iki butonun kapladığı genişlik (dar ekranda panel buna göre küçülür)
};
DontSplashManager.RETREAT_SPEED = 14;    // yakaladıktan sonra uzaklaşma (sunucudaki RETREAT_SPEED)
DontSplashManager.HUNT_SPEED = 70;        // sıçrama/çakıl: sesin geldiği yere deli gibi koşar
DontSplashManager.NOTICE_TIME = 0.2;      // sesi duyunca koşmadan önce çok kısa duraklama
DontSplashManager.HUNT_ARRIVE = 1.0;      // ne kadar uzakta olursa olsun sese en geç bu kadar sn'de varır (sunucuyla aynı)
// Bölümlere göre zorluk (sunucudaki HUNT_RAMP ile aynı): ilk bölümde canavar sese daha geç varır, son bölümde en hızlı
DontSplashManager.HUNT_RAMP = [
    { arrive: 2.4, k: 0.32 }, { arrive: 2.33, k: 0.36 }, { arrive: 2.25, k: 0.39 }, { arrive: 2.18, k: 0.43 }, { arrive: 2.11, k: 0.46 },
    { arrive: 2.03, k: 0.50 }, { arrive: 1.96, k: 0.53 }, { arrive: 1.88, k: 0.57 }, { arrive: 1.81, k: 0.61 }, { arrive: 1.74, k: 0.64 },
    { arrive: 1.66, k: 0.68 }, { arrive: 1.59, k: 0.71 }, { arrive: 1.52, k: 0.75 }, { arrive: 1.44, k: 0.79 }, { arrive: 1.37, k: 0.82 },
    { arrive: 1.29, k: 0.86 }, { arrive: 1.22, k: 0.89 }, { arrive: 1.15, k: 0.93 }, { arrive: 1.07, k: 0.96 }, { arrive: 1.0, k: 1.00 }
];
DontSplashManager.NOISE_SPEED = 50;       // yüzme sesi
DontSplashManager.SEARCH_SPEED = 8;       // vardığı yerde etrafı arar
DontSplashManager.SEARCH_TIME = 3;
DontSplashManager.PEBBLE_ITEM = 40;       // ItemDatabase'deki çakıl
DontSplashManager.BAT_ITEM = 41;          // ItemDatabase'deki sopa
DontSplashManager.MAX_PEBBLE_STACK = 9;
DontSplashManager.SHIELD_TIME = 30;
DontSplashManager.REVIVE_SHIELD = 5;      // Continue ile dönünce kalkan (sn)       // reklamla alınan kalkan
DontSplashManager.DOWN_TIME = 8;          // yakalanınca devam/baştan seçimi için süre
DontSplashManager.BAT_RANGE = 4;          // Steal and Run Stick: hitRange
DontSplashManager.BAT_PUSH = 10;          // Steal and Run Stick: pushStrength
DontSplashManager.BAT_USES = 10;          // reklamla alınan sopanın vuruş hakkı
DontSplashManager.START_COUNTDOWN = 10;   // çevrimdışı bekleme (sunucuda roundTimer)
DontSplashManager.CATCH_RADIUS = 4.4;      // büyük canavar: ağzı daha geniş alanı kapar
DontSplashManager.SWIM_JUMP_DELAY = 0.8;     // sudan zıplayabilmek için suda kalma süresi
DontSplashManager.SWIM_JUMP_COOLDOWN = 1.2;  // iki zıplama arası
DontSplashManager.SWIM_CHAIN_WINDOW = 3;     // son sudan zıplayıştan bu kadar sn içinde tekrar zıplamak gecikmeli
DontSplashManager.STILL_NOISE_TIME = 1.8;    // suda dururken ses aralığı (sn)
DontSplashManager.WATER_CATCH_GRACE = 0.5;   // sudan çıktıktan sonra bu kadar süre hâlâ yakalanabilir
DontSplashManager.MONSTER_Y = -3.0;         // canavarın ayak hizası (havuz tabanı)
DontSplashManager.STATE = { PATROL: 0, HUNT: 1, SEARCH: 2, ATTACK: 3, STUN: 4 };

DontSplashManager.prototype.initialize = function () {
    var app = this.app;
    app.dontSplash = this;
    // Envanter için (LoadManager bu sahneyi lobi saydığı için atamıyor)
    if (!app.itemDatabase) {
        var idb = app.root.findByName('ItemDatabase');
        if (idb && idb.script && idb.script.itemDatabase) app.itemDatabase = idb.script.itemDatabase;
    }
    this.player = app.root.findByName('Player');
    this.ctrl = this.player.script.playerController;
    this.hookInventorySave();
    this.hookMenus();
    this.spawns = app.root.findByName('Spawns');

    this.inWater = false;
    this.lastNoise = 0;
    this.lastSwimJump = 0;
    this.caught = false;
    this.finished = false;
    this.deaths = 0;
    this.started = false;
    this.startTime = 0;
    this.checkpoint = -1;          // -1: başlangıç
    this.checkpointPos = this.spawns ? this.spawns.getPosition().clone() : new pc.Vec3(0, 2.5, -6);
    this.time = 0;
    this.waterZones = [];
    this.curWaterLevel = this.waterLevel;
    this.deadlyTime = 0;
    this.localSeed = Math.floor(Math.random() * 1e9);
    this.items = { pebble: 0, flare: 0 };
    this.projectiles = [];
    this.mobileUse = false;
    this.phase = 'connecting';     // connecting -> waiting -> open (kapı açık) -> run (güvenli alandan çıktı)
    this.netDecided = false;
    this.localCountdown = DontSplashManager.START_COUNTDOWN;

    this.setupWater();
    this.setupStart();
    this.setupMovers();
    this.setupSinking();
    this.setupCheckpoints();
    this.setupExit();
    this.setupMonsters();
    this.setupSound();
    this.setupHud();
    this.setupNetwork();
    this.hookController();
    this.setupItemsUi();
    this.setupPickups();
    this.navRects = this.collectNavRects();
    this.splashPool = [];
    // Efekt dokuları önceden yüklensin
    [this.dropTexture, this.ringTexture].forEach(function (a) { if (a && !a.loaded) app.assets.load(a); });

    this.on('destroy', this.onDestroy, this);
};

DontSplashManager.prototype.postInitialize = function () {
    this.setupStaticBatching();
};

// ---------------------------------------------------------------- OPTİMİZASYON
// DSWorld'de script olduğu için PerformanceTweaks buradaki sabit parçaları birleştirmiyordu.
// Hareket etmeyen duvar/zemin/tavan/ışık panelleri malzemeye ve ~40 m'lik bölgelere göre
// statik batch'lere toplanır: çizim çağrısı azalır, uzak bölgeler yine kamera dışında elenir.
DontSplashManager.BATCH_EXCLUDED_TAGS = ['DSMemTile', 'DSPusher', 'DSValve', 'DSSinking', 'DSRotator', 'DSMover', 'DSSlider'];
DontSplashManager.BATCH_EXCLUDED_NAMES = /^(Water|R8Water|GateDoor|ExitGate|Portal_Door|CodePlate\d*|PlateTrigger|Monsters|Wheel)$/;   // Portal_Door: çıkış kapısı açılınca döner
DontSplashManager.prototype.setupStaticBatching = function () {
    var batcher = this.app.batcher;
    if (!batcher) return;
    var group = batcher.getGroupByName('DSStatic') || batcher.addGroup('DSStatic', false, 40);
    var root = this.entity, worldLayer = pc.LAYERID_WORLD, tags = DontSplashManager.BATCH_EXCLUDED_TAGS, names = DontSplashManager.BATCH_EXCLUDED_NAMES;
    var count = 0;
    root.findComponents('render').forEach(function (r) {
        if (!r.enabled || !r.entity.enabled) return;
        if (r.batchGroupId != null && r.batchGroupId !== -1) return;
        if (r.layers.length !== 1 || r.layers[0] !== worldLayer) return;
        var mis = r.meshInstances;
        if (!mis || !mis.length) return;
        for (var i = 0; i < mis.length; i++) if (mis[i].skinInstance || mis[i].morphInstance || mis[i].instancingData) return;
        for (var e = r.entity; e && e !== root; e = e.parent) {
            if (e.rigidbody && e.rigidbody.type !== pc.BODYTYPE_STATIC) return;
            if (e.anim || e.animation || e.element || e.particlesystem || e.sprite) return;
            if (names.test(e.name)) return;
            for (var t = 0; t < tags.length; t++) if (e.tags.has(tags[t])) return;
        }
        r.batchGroupId = group.id;
        count++;
    });
    this.staticBatched = count;
};

DontSplashManager.prototype.onDestroy = function () {
    if (this.app.dontSplash === this) this.app.dontSplash = null;
    if (this.overlay) this.overlay.destroy();
    if (this.vignette) this.vignette.destroy();
    if (this.downMenu) this.downMenu.destroy();
    if (this.winMenu) this.winMenu.destroy();
    this.app.endUI = false;
    if (this.downOpen || this.winOpen) { this.app.deadMenuEnabled = false; this.app.fire('lockCamera', false); }
    if (this._dropTex) { this._dropTex.destroy(); this._dropTex = null; }
    if (this.itemsUi) this.itemsUi.destroy();
    this.clearPebbles();
    this.app.off('Connected', this.onNetConnected, this);
    this.app.off('ConnectionFailed', this.onNetFailed, this);
    this.unbindRoom();
};

// ---------------------------------------------------------------- BAŞLANGIÇ (güvenli alan)
// Agar/Catch gibi: oyuncular güvenli odada bekler, sayaç bitince kapı açılır,
// oyuncu odadan kendisi çıkınca süresi başlar.
DontSplashManager.prototype.setupStart = function () {
    this.startGate = this.entity.findByName('StartGate');
    this.gateBase = this.startGate ? this.startGate.getLocalPosition().clone() : null;
    this.gateOpen = 0;
    this.app.on('Connected', this.onNetConnected, this);
    this.app.on('ConnectionFailed', this.onNetFailed, this);
    if (this.app.room) this.netDecided = true;
};

DontSplashManager.prototype.onNetConnected = function () { this.netDecided = true; };
DontSplashManager.prototype.onNetFailed = function () { this.netDecided = true; };

// Sunucudaki başlangıç durumu: 0 bekleniyor, 1 geri sayım, 2 başladı. Çevrimdışı/eski sunucu: yerel sayaç.
DontSplashManager.prototype.serverPhase = function () {
    var room = this.app.room;
    if (room && room.name === 'DontSplash' && room.state && room.state.dsState !== undefined) return room.state.dsState;
    return -1;
};

// Girince direkt başlar: bekleme, geri sayım, bariyer ve süre yok
DontSplashManager.prototype.updateStart = function (dt) {
    if (this.phase !== 'run') {
        this.phase = 'run';
        this.started = true;
        this.startTime = this.netNow();
    }
    if (this.startGate && this.startGate.enabled) this.startGate.enabled = false;
    var ui = this.app.ui;
    if (ui && !this.finished) {
        if (ui.timerText && ui.timerText.enabled) ui.timerText.enabled = false;
        if (ui.waitingText && ui.waitingText.enabled) ui.waitingText.enabled = false;
    }
    // Tek kullanımlık eşyalarda "1/3" gibi sayaç gösterilmesin
    if (this.powerupUi === undefined) this.powerupUi = this.app.root.findByName('PowerupUIs') || null;
    if (this.powerupUi && this.powerupUi.enabled) this.powerupUi.enabled = false;
};

// Sunucudaki Don't Splash sürümü (eski sunucu yeni mesajları tanımaz)
DontSplashManager.prototype.serverVer = function () {
    var room = this.app.room;
    return room && room.name === 'DontSplash' && room.state ? (room.state.dsVer || 0) : 0;
};

// ---------------------------------------------------------------- SU
DontSplashManager.prototype.setupWater = function () {
    this.water = this.entity.findByName('Water');
    this.waterMat = null;
    this.waterMats = [];
    var self = this;
    // her salonun kendi su yüzeyi var (Water, Water_H2)
    this.entity.children.filter(function (e) { return /^Water/.test(e.name); }).forEach(function (w) {
        if (!w.render || !w.render.meshInstances.length) return;
        // Malzemeyi kopyala ki kaydırma sadece bu sahnede olsun
        var m = w.render.meshInstances[0].material.clone();
        var s = w.getLocalScale();
        m.diffuseMapTiling = new pc.Vec2(s.x / 20, s.z / 20);
        m.emissiveMapTiling = new pc.Vec2(s.x / 20, s.z / 20);
        m.update();
        w.render.meshInstances[0].material = m;
        self.waterMats.push(m);
    });
    this.waterMat = this.waterMats[0] || null;
};

DontSplashManager.prototype.updateWater = function (dt) {
    if (!this.waterMats || !this.waterMats.length) return;
    var t = this.time;
    for (var i = 0; i < this.waterMats.length; i++) {
        var m = this.waterMats[i];
        m.diffuseMapOffset = new pc.Vec2(t * 0.012, t * 0.02);
        m.emissiveMapOffset = new pc.Vec2(-t * 0.01, t * 0.015);
        m.update();
    }
};

// ---------------------------------------------------------------- HAREKETLİ PLATFORMLAR
// Zaman Date.now()'a bağlı: tüm oyuncularda aynı konumda olurlar.
DontSplashManager.prototype.setupMovers = function () {
    this.rotators = this.entity.findByTag('DSRotator').map(function (e) {
        return { e: e, speed: e.tags.has('DSReverse') ? -22 : 22, base: e.getLocalEulerAngles().y };
    });
    var i = 0;
    this.sliders = this.entity.findByTag('DSSlider').map(function (e) {
        var p = e.getLocalPosition().clone();
        return { e: e, base: p, amp: 8, period: 7, phase: (i++) * 1.4 };
    });
};

DontSplashManager.prototype.netNow = function () {
    return Date.now() / 1000;
};

DontSplashManager.prototype.updateMovers = function () {
    var now = this.netNow();
    for (var i = 0; i < this.rotators.length; i++) {
        var r = this.rotators[i];
        r.e.setLocalEulerAngles(0, (r.base + now * r.speed) % 360, 0);
    }
    for (var j = 0; j < this.sliders.length; j++) {
        var s = this.sliders[j];
        var off = Math.sin((now / s.period) * Math.PI * 2 + s.phase) * s.amp;
        if (s.axis === 'z') s.e.setLocalPosition(s.base.x, s.base.y, s.base.z + off);
        else s.e.setLocalPosition(s.base.x + off, s.base.y, s.base.z);
    }
};

// Oyuncunun altındaki hareketli platform (yoksa null)
DontSplashManager.prototype.findMoverUnderPlayer = function () {
    var pos = this.player.getPosition();
    var to = pos.clone(); to.y -= 1.6;
    // raycastFirst oyuncunun kendi kapsülüne çarpar, o yüzden tüm sonuçlar taranır
    var hits = this.app.systems.rigidbody.raycastAll(pos, to);
    for (var h = 0; h < hits.length; h++) {
        if (hits[h].entity && hits[h].entity.tags.has('DSMover')) return hits[h].entity;
    }
    return null;
};

// Platformun verilen noktadaki hızı (kayan: x yönü, dönen: açısal hız x yarıçap)
DontSplashManager.prototype.moverVelocityAt = function (mover, p) {
    var now = this.netNow();
    for (var j = 0; j < this.sliders.length; j++) {
        var s = this.sliders[j];
        if (s.e === mover) {
            var w = Math.PI * 2 / s.period;
            var vel = Math.cos(now * w + s.phase) * s.amp * w;
            return s.axis === 'z' ? new pc.Vec3(0, 0, vel) : new pc.Vec3(vel, 0, 0);
        }
    }
    for (var i = 0; i < this.rotators.length; i++) {
        var r = this.rotators[i];
        if (mover.isDescendantOf(r.e)) {
            var c = r.e.getPosition();
            var om = r.speed * pc.math.DEG_TO_RAD;
            return new pc.Vec3(om * (p.z - c.z), 0, -om * (p.x - c.x));
        }
    }
    return new pc.Vec3();
};

// ---------------------------------------------------------------- BATAN KAROLAR
DontSplashManager.prototype.setupSinking = function () {
    this.sinkers = this.entity.findByTag('DSSinking').map(function (e) {
        if (e.rigidbody) e.rigidbody.type = 'kinematic';
        return { e: e, baseY: e.getLocalPosition().y, y: e.getLocalPosition().y, stand: 0, state: 0, wait: 0, half: e.getLocalScale().x / 2 + 0.4, top: 0 };
    });
};

DontSplashManager.prototype.standingPositions = function () {
    var list = [this.player.getPosition()];
    var room = this.app.room;
    if (room && room.state && room.state.players) {
        var me = room.sessionId;
        room.state.players.forEach(function (p, sid) {
            if (sid !== me && p.position) list.push(new pc.Vec3(p.position.x, p.position.y, p.position.z));
        });
    }
    return list;
};

DontSplashManager.prototype.updateSinking = function (dt) {
    if (!this.sinkers.length) return;
    var players = this.standingPositions();
    for (var i = 0; i < this.sinkers.length; i++) {
        var s = this.sinkers[i];
        var c = s.e.getPosition();
        var top = c.y + s.e.getLocalScale().y / 2;
        var on = false;
        for (var k = 0; k < players.length; k++) {
            var p = players[k];
            var feet = p.y - 1.0;
            if (Math.abs(p.x - c.x) < s.half && Math.abs(p.z - c.z) < s.half && feet > top - 0.5 && feet < top + 0.6) { on = true; break; }
        }
        if (s.state === 0) {              // bekliyor
            s.stand = on ? s.stand + dt : Math.max(0, s.stand - dt);
            // basılınca hafif titreme
            var shake = s.stand > 0 ? Math.sin(this.time * 60) * 0.04 * Math.min(1, s.stand * 3) : 0;
            s.e.setLocalPosition(s.e.getLocalPosition().x, s.baseY + shake, s.e.getLocalPosition().z);
            if (s.stand > 0.45) s.state = 1;
        } else if (s.state === 1) {       // batıyor
            s.y -= dt * 2.2;
            if (s.y < s.baseY - 3.2) { s.y = s.baseY - 3.2; s.state = 2; s.wait = 2.5; }
            s.e.setLocalPosition(s.e.getLocalPosition().x, s.y, s.e.getLocalPosition().z);
        } else if (s.state === 2) {       // dipte bekliyor
            s.wait -= dt;
            if (s.wait <= 0) s.state = 3;
        } else if (s.state === 3) {       // geri çıkıyor
            s.y += dt * 2.5;
            if (s.y >= s.baseY) { s.y = s.baseY; s.state = 0; s.stand = 0; }
            s.e.setLocalPosition(s.e.getLocalPosition().x, s.y, s.e.getLocalPosition().z);
        }
    }
};

// ---------------------------------------------------------------- CHECKPOINT / ÇIKIŞ
DontSplashManager.prototype.setupCheckpoints = function () {
    var self = this;
    this.checkpoints = this.entity.findByTag('DSCheckpoint');
    this.checkpoints.sort(function (a, b) { return a.getPosition().z - b.getPosition().z; });
    this.checkpoints.forEach(function (cp, i) {
        cp.collision.on('triggerenter', function (other) {
            if (other !== self.player || self.caught || self.finished) return;
            if (i <= self.checkpoint) return;
            self.checkpoint = i;
            var p = cp.getPosition();
            self.checkpointPos = new pc.Vec3(p.x, p.y + 0.5, p.z);
            self.play('success', 0.6);
            // Checkpointte çakıl dolar, bazılarında işaret fişeği verilir
            var gifts = [];
            if (self.items.pebble < DontSplashManager.MAX_PEBBLES) { self.items.pebble = DontSplashManager.MAX_PEBBLES; gifts.push('pebbles refilled'); }
            if ((i === 3 || i === 6) && self.items.flare < DontSplashManager.MAX_FLARES) { self.items.flare++; gifts.push('+1 flare'); }
            self.updateItemsUi();
            self.app.fire('WarningTextController:setWarning', 'Checkpoint!' + (gifts.length ? ' (' + gifts.join(', ') + ')' : ''), 2.5, new pc.Color(0, 1, 0, 1));
        });
    });
};

// Bölümler arasındaki güvenli zeminler checkpoint: ilk kez basınca Restart (reklamsız) buradan başlatır
DontSplashManager.prototype.updateFloorCheckpoint = function () {
    if (this.caught || this.finished) return;
    var S = DontSplashManager.SECTIONS;
    var p = this.player.getPosition();
    if (p.y < 1.6) return;
    for (var k = S.length - 1; k >= 1; k--) {
        var f = DontSplashManager.floorBefore(k);
        if (p.z < f.z0 + 0.6 || p.z > f.z1 - 0.6) continue;
        if (k <= this.checkpoint) return;
        this.checkpoint = k;
        this.checkpointPos = new pc.Vec3(pc.math.clamp(p.x, -50, 50), 2.5, (f.z0 + f.z1) / 2);
        this.play('success', 0.6);
        this.app.fire('WarningTextController:setWarning', 'Checkpoint! (' + k + '/' + S.length + ' sections cleared)', 2.5, new pc.Color(0, 1, 0, 1));
        return;
    }
};

DontSplashManager.prototype.setupExit = function () {
    var self = this;
    // 1. salonun sonundaki kapı: 2. salonun başlangıç zeminine ışınlar
    this.entity.findByTag('DSPortal').forEach(function (pt) {
        if (!pt.collision) return;
        pt.collision.on('triggerenter', function (other) {
            if (other !== self.player || self.caught || self.finished || self.portalT > self.time - 1) return;
            self.portalT = self.time;
            self.toHall2();
        });
    });
    this.entity.findByTag('DSExit').forEach(function (ex) {
        ex.collision.on('triggerenter', function (other) {
            if (other !== self.player || self.caught || self.finished) return;
            self.finish();
        });
    });
};

// Sonraki salona geçiş: kısa kararma, o salonun başlangıç zeminine ışınlanma, checkpoint
DontSplashManager.prototype.toHall2 = function () {
    var S = DontSplashManager.SECTIONS, k = -1, pz = this.player.getPosition().z, hall = 1;
    for (var i = 1; i < S.length; i++) {
        if (S[i].z0 - S[i - 1].z1 <= 40) continue;
        hall++;
        if (S[i].z0 > pz) { k = i; break; }   // oyuncunun önündeki ilk salon
    }
    if (k < 0) return;
    var f = DontSplashManager.floorBefore(k);
    var p = new pc.Vec3(0, 2.5, f.z0 + 9);
    if (k > this.checkpoint) { this.checkpoint = k; this.checkpointPos = p.clone(); }
    this.respawn(p);
    // siyahtan açılarak yeni salon görünür
    this.flash(new pc.Color(0, 0, 0), 0);
    this.overlayAlpha = 1;
    this.play('success', 0.6);
    this.app.fire('WarningTextController:setWarning', 'HALL ' + hall + '! (' + k + '/' + S.length + ' sections cleared)', 3, new pc.Color(0, 1, 0, 1));
};

DontSplashManager.prototype.finish = function () {
    this.finished = true;
    this.funnelEnd('complete');
    if (this.runMeasured && window.pokiMeasure) { window.pokiMeasure('level', 'dontsplash-run', 'complete'); this.runMeasured = false; }
    var t = this.started ? this.netNow() - this.startTime : 0;
    this.finishTime = t;
    this.play('success', 1);
    if (this.app.player) this.app.player.canMove = false;
    this.ctrl._direction && this.ctrl._direction.set(0, 0, 0);
    Utils.setItem('dontSplashFinished', 'true');
    var best = parseFloat(Utils.getItem('dontSplashBest') || '0');
    if (!best || t < best) Utils.setItem('dontSplashBest', String(t));
    var self = this;
    var ui = this.app.ui;
    var hb = this.sound && this.sound.slot('heartbeat');
    if (hb && hb.isPlaying) hb.stop();
    if (this.itemsUi) this.itemsUi.enabled = false;
    if (this.app.player && this.app.player.stats) {
        this.app.player.stats.caught = this.caughtCount || 0;
        this.app.player.stats.die = this.drownCount || 0;
    }
    this.app.fire('AddCoin', DontSplashManager.WIN_COINS);
    this.openWinMenu();
    if (this.app.gamePlayStarted === true && !this.app.isWatchingAd && typeof PokiSDK !== 'undefined') {
        try { PokiSDK.gameplayStop(); } catch (e) { }
        this.app.gamePlayStarted = false;
    }
};

// Kazanma paneli: oyunun ölüm panelinin görünümü (aynı butonlar) + Catch'teki başlık yazısı
DontSplashManager.WIN_COINS = 100;
DontSplashManager.prototype.buildWinMenu = function () {
    var src = this.app.root.findByName('DeadMenu');
    if (!src) return null;
    var menu = src.clone();
    menu.name = 'DSWinMenu';
    src.parent.addChild(menu);
    var hide = ['SpectateControls', 'Image'];
    menu.children.forEach(function (c) { if (hide.indexOf(c.name) >= 0) c.enabled = false; });
    var self = this;
    var again = menu.findByName('RewardedAdButton');
    var lobby = menu.findByName('RespawnButton');
    // Lobby, Play Again ile birebir aynı buton (Continue görseli, reklam simgesi yok)
    if (again && lobby && again.element) {
        // ikisi de panelin ortasında alt alta (ölüm ekranındaki gibi), aynı boyutta
        var grp = again.parent;
        var sc = again.getLocalScale().x * (grp && grp !== menu ? grp.getLocalScale().x : 1);
        again.reparent(menu);
        again.element.anchor = new pc.Vec4(0.5, 0.5, 0.5, 0.5);
        again.element.pivot = new pc.Vec2(0.5, 0.5);
        again.setLocalScale(sc, sc, sc);
        again.setLocalPosition(0, -165, 0);
        var nl = this.cloneButton(again, 'RespawnButton', 'Lobby');
        menu.addChild(nl);
        nl.setLocalScale(sc, sc, sc);
        nl.setLocalPosition(0, -300, 0);
        lobby.destroy();
        lobby = nl;
        // renkler ölüm ekranıyla aynı: yeşil Play Again, mor Lobby
        again.element.spriteAsset = DontSplashManager.DOWN_LOOK.restartSprite;
        lobby.element.spriteAsset = DontSplashManager.DOWN_LOOK.continueSprite;
    }
    if (again) {
        this.labelButton(again, 'Play Again');
        if (again.button) again.button.on('click', function () { self.playAgain(); });
    }
    if (lobby && lobby.button) lobby.button.on('click', function () { self.goLobby(); });
    this.juiceButton(again, 0);
    this.juiceButton(lobby, 1.6);
    // Yazılar: Catch'teki kazanma başlığının görünümü
    var cw = this.app.ui && this.app.ui.catchWin;
    var tTitle = cw && cw.findByName('Title');
    var tSmall = cw && cw.findByName('ClickText');
    var addText = function (tpl, name, text, y, size) {
        var e;
        if (tpl) { e = tpl.clone(); e.enabled = true; }
        else {
            e = new pc.Entity(name);
            e.addComponent('element', { type: 'text', fontAsset: self.fontAsset ? self.fontAsset.id : null, fontSize: size, color: new pc.Color(1, 1, 1), outlineColor: new pc.Color(0, 0, 0, 1), outlineThickness: 0.6 });
        }
        e.name = name;
        menu.addChild(e);
        var el = e.element;
        el.anchor = new pc.Vec4(0.5, 0.5, 0.5, 0.5);
        el.pivot = new pc.Vec2(0.5, 0.5);
        el.alignment = new pc.Vec2(0.5, 0.5);
        el.autoWidth = true; el.autoHeight = true;
        el.text = text;
        if (size) el.fontSize = size;
        e.setLocalPosition(0, y, 0);
        e.setLocalScale(1, 1, 1);
        return e;
    };
    this.winTitle = addText(tTitle, 'WinTitle', 'You escaped!', 175, 0);
    this.winStats = addText(tSmall, 'WinStats', '', 92, 0);
    this.winSoon = addText(tSmall, 'WinSoon', 'New zones coming soon!', 30, 0);
    if (this.winSoon && this.winSoon.element) this.winSoon.element.color = new pc.Color(1, 0.85, 0.2);
    menu.enabled = false;
    return menu;
};

DontSplashManager.prototype.openWinMenu = function () {
    if (!this.winMenu) this.winMenu = this.buildWinMenu();
    var menu = this.winMenu;
    if (!menu) return;
    if (this.winStats && this.winStats.element) this.winStats.element.text = 'Caught: ' + (this.caughtCount || 0) + '    Coins +' + DontSplashManager.WIN_COINS;
    this.closeOtherMenus();
    this.winOpen = true;
    this.flash(new pc.Color(0, 0, 0), 0.55);
    this.app.endUI = true;
    this.app.deadMenuEnabled = true;
    this.app.fire('lockCamera', true);
    menu.enabled = true;
    this.slideIn(menu, 0.45);
};

DontSplashManager.prototype.closeWinMenu = function () {
    if (this.winMenu) this.winMenu.enabled = false;
    this.winOpen = false;
    this.app.endUI = false;
    this.app.deadMenuEnabled = false;
    this.app.fire('lockCamera', false);
    this.flash(new pc.Color(0, 0, 0), 0);
};

// Baştan: aynı odada başlangıca dön
DontSplashManager.prototype.playAgain = function () {
    if (!this.finished || this.leaving) return;
    this.funnel = -1; this.runMeasured = false;
    this.play('click', 0.7);
    this.closeWinMenu();
    if (typeof watchCommercial === 'function') watchCommercial();   // tekrar oynarken ara reklam (Poki)
    this.finished = false;
    this.caughtCount = 0;
    this.drownCount = 0;
    this.deaths = 0;
    this.startTime = this.netNow();
    this.checkpoint = -1;
    if (this.spawns) this.checkpointPos = this.spawns.getPosition().clone();
    this.graceUntil = 0;
    this.respawn(this.spawns ? this.spawns.getPosition().clone() : this.checkpointPos);
    if (this.app.player) this.app.player.canMove = true;
    if (!this.app.gamePlayStarted && typeof PokiSDK !== 'undefined') {
        try { PokiSDK.gameplayStart(); } catch (e) { }
        this.app.gamePlayStarted = true;
    }
};

DontSplashManager.prototype.goLobby = async function () {
    if (this.leaving) return;
    this.leaving = true;
    this.play('click', 0.7);
    if (this.app.room) { try { await Promise.race([this.app.room.leave(), new Promise(function (r) { setTimeout(r, 2000); })]); } catch (e) { } }
    if (this.app.musicPlayer) this.app.musicPlayer.stop();
    if (this.app.ambienceManager) this.app.ambienceManager.stop();
    this.app.endUI = false;
    this.app.deadMenuEnabled = false;
    this.app.scenes.changeScene('Lobby');
};

// ---------------------------------------------------------------- CANAVARLAR
DontSplashManager.prototype.setupMonsters = function () {
    var R = DontSplashManager.MONSTER_AREAS;
    this.monsters = [];
    for (var i = 0; i < R.length; i++) {
        var e = this.entity.findByName('Monster' + (i + 1));
        if (!e) continue;
        var p = e.getPosition();
        var look = DontSplashManager.MONSTER_LOOK[e.name] || { y: DontSplashManager.MONSTER_Y, hold: DontSplashManager.MONSTER_HOLD, lunge: DontSplashManager.MONSTER_LUNGE };
        this.monsters.push({
            e: e, room: i, look: look,
            x: p.x, z: p.z, rot: 0,
            state: DontSplashManager.STATE.PATROL,
            tx: p.x, tz: p.z, wait: Math.random() * 2, timer: 0,
            vis: { x: p.x, z: p.z, rot: 0 }
        });
    }
};

// z'deki oyuncunun bölümü: içinde olduğu ya da önündeki ilk bölüm
DontSplashManager.prototype.curSection = function (z) {
    var S = DontSplashManager.SECTIONS;
    for (var k = 0; k < S.length; k++) if (z < S[k].z1) return k;
    return S.length;
};

// i. bölümün canavarı görünsün mü (oyuncu z'de)
DontSplashManager.prototype.monsterShown = function (i, z) {
    if (this.app.dsIntroPlaying) return false;
    var cur = this.curSection(z);
    return i === cur || (i === cur - 1 && z < DontSplashManager.SECTIONS[i].z1 + 6);
};

// Sıçrama efekti bu noktada gösterilsin mi: sadece bulunduğun ve az önce geçtiğin bölüm
DontSplashManager.prototype.fxVisibleAt = function (p) {
    var pz = this.player.getPosition().z;
    if (Math.abs(p.z - pz) > 150) return false;
    var i = this.roomIndexAt(p.z);
    if (i < 0) return true;
    var cur = this.curSection(pz);
    return i === cur || i === cur - 1;
};

DontSplashManager.prototype.roomIndexAt = function (z) {
    var R = DontSplashManager.ROOMS;
    for (var i = 0; i < R.length; i++) if (z >= R[i].z0 - 0.5 && z <= R[i].z1 + 0.5) return i;
    return -1;
};

// z'deki canavar alanı (yoksa -1)
DontSplashManager.prototype.areaIndexAt = function (z) {
    var A = DontSplashManager.MONSTER_AREAS;
    for (var i = 0; i < A.length; i++) if (z >= A[i].z0 - 0.5 && z <= A[i].z1 + 0.5) return i;
    return -1;
};

// Ortak tohum: çevrimiçiyse sunucudan, değilse yerel (hafıza köprüsü ve şifre için)
DontSplashManager.prototype.getSeed = function () {
    var room = this.app.room;
    if (room && room.name === 'DontSplash' && room.state && room.state.dsSeed) return room.state.dsSeed;
    return this.localSeed;
};

DontSplashManager.random = function (seed) {
    var t = seed >>> 0;
    return function () {
        t = (t + 0x6D2B79F5) >>> 0;
        var r = Math.imul(t ^ (t >>> 15), 1 | t);
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
};

// Odaya özel su (ör. vana odasında yükselen su)
DontSplashManager.prototype.registerWaterZone = function (zone) {
    this.waterZones.push(zone);
};

DontSplashManager.prototype.waterAt = function (pos) {
    for (var i = 0; i < this.waterZones.length; i++) {
        var z = this.waterZones[i];
        if (pos.x >= z.x0 && pos.x <= z.x1 && pos.z >= z.z0 && pos.z <= z.z1) return { level: z.getLevel(), zone: z };
    }
    return { level: this.waterLevel, zone: null };
};

// Sunucunun yönettiği canavar sayısı (eski sunucuda daha az olabilir; kalanlar yerelde simüle edilir)
DontSplashManager.prototype.serverMonsterCount = function () {
    return this.netMode() === 2 ? Math.min(this.monsters.length, this.app.room.state.dsMonsters.length) : 0;
};

// 0: yerel (çevrimdışı ya da eski sunucu), 2: emir tabanlı sunucu (dsVer >= 3)
DontSplashManager.prototype.netMode = function () {
    if (!this.isOnline()) return 0;
    return this.app.room.state.dsVer >= 3 ? 2 : 0;
};

// Sunucu emirlerini (seq değişince) uygula ve aradaki hareketi yerelde simüle et.
// Konum sürekli gönderilmez; bu sayede ağ trafiği neredeyse sıfır.
DontSplashManager.prototype.syncServerMonsters = function (dt) {
    var S = DontSplashManager.STATE, R = DontSplashManager.MONSTER_AREAS, X = DontSplashManager.POOL_X;
    var list = this.app.room.state.dsMonsters;
    var n = Math.min(this.monsters.length, list.length);
    var ppos = this.player.getPosition();
    // Gerçek geçen süre: kare takılması / arka plandaki sekme canavarı sunucudan geride bırakmasın
    var nowT = performance.now();
    if (this.syncT) dt = Math.min(5, Math.max(0, (nowT - this.syncT) / 1000));
    this.syncT = nowT;
    for (var i = 0; i < n; i++) {
        var m = this.monsters[i], sm = list[i];
        if (!sm) continue;
        // Yakaladı sandık ama sunucu kabul etmedi (kalkan vb.): sunucudaki emre geri dön
        if (m.predictT && m.seq === sm.seq && nowT - m.predictT > 1500) {
            m.predictT = 0;
            m.seq = -1;
        }
        if (m.seq !== sm.seq) {
            m.seq = sm.seq;
            m.predictT = 0;
            var first = m.synced !== true;
            var predictedAttack = m.state === S.ATTACK && sm.state === S.ATTACK;
            // Küçük farklar yumuşak kalsın, büyük farkta konumu düzelt
            if (!predictedAttack && (first || Math.hypot(sm.x - m.x, sm.z - m.z) > 1.5)) {
                // Aynı emrin tazelemesi: sunucu konumu gecikmeli gelir; çok hızlı koşarken geri ışınlanmasın
                var sameOrder = !first && sm.spd > 0 && sm.state === m.state && sm.tx === m.tx && sm.tz === m.tz;
                var ahead = sameOrder && Math.hypot(m.tx - m.x, m.tz - m.z) < Math.hypot(sm.tx - sm.x, sm.tz - sm.z);
                if (!ahead) { m.x = sm.x; m.z = sm.z; }
            }
            // İlk senkron: canavar doğduğu yerden kayarak gelmesin
            if (first && m.vis) { m.vis.x = sm.x; m.vis.z = sm.z; m.vis.rot = sm.rot; }
            m.synced = true;
            if (sm.state === S.HUNT && m.state !== S.HUNT && !first) m.notice = DontSplashManager.NOTICE_TIME;
            m.tx = sm.tx; m.tz = sm.tz;
            m.spd = sm.spd;
            m.state = sm.state;
            if (!(sm.spd > 0) && !predictedAttack) m.rot = sm.rot;
            // sunucu da aynı yolu izler (aynı ızgara + aynı başlangıç/hedef)
            m.path = sm.spd > 0 && sm.state !== S.ATTACK && sm.state !== S.STUN ? this.navPath(m.room, m.x, m.z, m.tx, m.tz) : [];
        }
        var room = R[m.room];
        var moving = false;
        if (m.notice > 0) {
            // Duydu: sese doğru (yolun ilk noktasına) döner, kısa bir an bekler
            m.notice -= dt;
            var np = DontSplashManager.nextPoint(m);
            m.rot = Math.atan2(np[0] - m.x, np[1] - m.z) * pc.math.RAD_TO_DEG;
        } else if (m.spd > 0 && m.state !== S.ATTACK && m.state !== S.STUN) {
            if (!m.path) m.path = this.navPath(m.room, m.x, m.z, m.tx, m.tz);
            var ox = m.x, oz = m.z;
            DontSplashManager.moveAlong(m, m.spd * dt);
            var mdx = m.x - ox, mdz = m.z - oz;
            if (mdx * mdx + mdz * mdz > 1e-8) {
                m.rot = Math.atan2(mdx, mdz) * pc.math.RAD_TO_DEG;
                moving = true;
            }
        }
        m.x = pc.math.clamp(m.x, -X, X);
        m.z = pc.math.clamp(m.z, room.z0 + 1, room.z1 - 1);
        m.moving = moving;

        // Yakalanma kendi istemcimizde hesaplanır (gördüğün canavar seni yakalar), sunucuya bildirilir
        if (m.state !== S.ATTACK && m.state !== S.STUN && this.catchable() && !this.caught && !this.isShielded() && this.areaIndexAt(ppos.z) === i &&
            Math.hypot(ppos.x - m.x, ppos.z - m.z) < DontSplashManager.CATCH_RADIUS) {
            m.state = S.ATTACK; m.spd = 0;
            m.predictT = nowT;
            m.rot = Math.atan2(ppos.x - m.x, ppos.z - m.z) * pc.math.RAD_TO_DEG;
            this.sendNet('Client:DS:Caught', { m: i, x: ppos.x, z: ppos.z });
            this.onCaught(i);
        }
    }
};

// Suda ya da sudan yeni zıplamış (suyun hemen üstünde) oyuncu yakalanabilir
DontSplashManager.prototype.catchable = function () {
    if (this.inWater) return true;
    if (this.time - (this.lastInWaterTime || -99) > DontSplashManager.WATER_CATCH_GRACE) return false;
    return this.player.getPosition().y - 1 < (this.curWaterLevel || this.waterLevel) + 2.5;
};

DontSplashManager.prototype.isOnline = function () {
    var room = this.app.room;
    return !!(room && room.name === 'DontSplash' && room.state && room.state.dsMonsters && room.state.dsMonsters.length);
};

// Yerel simülasyon (sunucu yoksa). Sunucudaki mantığın aynısı.
DontSplashManager.prototype.simulateMonsters = function (dt, from) {
    var S = DontSplashManager.STATE, R = DontSplashManager.MONSTER_AREAS, X = DontSplashManager.POOL_X;
    var ppos = this.player.getPosition();
    for (var i = from || 0; i < this.monsters.length; i++) {
        var m = this.monsters[i];
        var room = R[m.room];
        m.timer -= dt;
        if (m.state === S.ATTACK || m.state === S.STUN) {
            if (m.timer <= 0) {
                if (m.state === S.ATTACK) {
                    // Sunucudaki gibi: yakaladıktan sonra uzaklaşır. Eskiden av yolunun kalanını izleyip
                    // öldüğün yere geri gidiyor, baştan başlayınca orada bekliyordu.
                    var bx = m.x, bz = m.z, bd = -1;
                    for (var k = 0; k < 8; k++) {
                        var cx = pc.math.random(-X, X), cz = pc.math.random(room.z0 + 2, room.z1 - 2);
                        var cd = Math.hypot(cx - m.x, cz - m.z);
                        if (cd > bd) { bd = cd; bx = cx; bz = cz; }
                    }
                    m.state = S.PATROL; m.wait = 0; m.tx = bx; m.tz = bz;
                    m.path = this.navPath(m.room, m.x, m.z, bx, bz);
                    m.retreat = true;
                } else {
                    m.state = S.SEARCH; m.timer = 1.2; m.path = [];   // sunucuda da yerinde arar
                }
            }
            m.moving = false;
            continue;
        }
        if (m.state === S.SEARCH) {
            if (m.timer <= 0) { m.state = S.PATROL; m.wait = 0.5; m.tx = m.x; m.tz = m.z; m.path = []; }
        }
        var speed = 0;
        var hasPath = m.path && m.path.length;
        if (m.state === S.SEARCH) {
            if (hasPath) speed = DontSplashManager.SEARCH_SPEED;
        } else if (m.state === S.PATROL) {
            if (m.wait > 0) { m.wait -= dt; }
            else {
                speed = m.retreat ? DontSplashManager.RETREAT_SPEED : DontSplashManager.PATROL_SPEED;
                if (!hasPath) {
                    m.retreat = false;
                    m.tx = pc.math.random(-X, X);
                    m.tz = pc.math.random(room.z0 + 2, room.z1 - 2);
                    m.path = this.navPath(m.room, m.x, m.z, m.tx, m.tz);
                    m.wait = pc.math.random(0.8, 2.5);
                    speed = 0;
                }
            }
        } else if (m.state === S.HUNT && m.notice > 0) {
            m.notice -= dt;
            var hp = DontSplashManager.nextPoint(m);
            m.rot = Math.atan2(hp[0] - m.x, hp[1] - m.z) * pc.math.RAD_TO_DEG;
        } else if (m.state === S.HUNT) {
            speed = m.huntSpeed || DontSplashManager.HUNT_SPEED;
            if (!hasPath) {
                // Sesin geldiği yere vardı: yakınında ara
                m.state = S.SEARCH; m.timer = DontSplashManager.SEARCH_TIME; speed = 0;
                var a = Math.random() * Math.PI * 2;
                m.tx = pc.math.clamp(m.x + Math.sin(a) * 3.5, -X, X);
                m.tz = pc.math.clamp(m.z + Math.cos(a) * 3.5, room.z0 + 1, room.z1 - 1);
                m.path = this.navPath(m.room, m.x, m.z, m.tx, m.tz);
            }
        }
        if (speed > 0) {
            var ox = m.x, oz = m.z;
            DontSplashManager.moveAlong(m, speed * dt);
            if ((m.x - ox) * (m.x - ox) + (m.z - oz) * (m.z - oz) > 1e-8) m.rot = Math.atan2(m.x - ox, m.z - oz) * pc.math.RAD_TO_DEG;
        }
        m.x = pc.math.clamp(m.x, -X, X);
        m.z = pc.math.clamp(m.z, room.z0 + 1, room.z1 - 1);
        m.moving = speed > 0;

        // Suda olan oyuncuyu yakala (yerelde sadece kendimiz)
        if (this.catchable() && !this.caught && !this.isShielded() && this.areaIndexAt(ppos.z) === i && Math.hypot(ppos.x - m.x, ppos.z - m.z) < DontSplashManager.CATCH_RADIUS) {
            m.state = S.ATTACK; m.timer = DontSplashManager.EAT.len;   // yeme animasyonu bitene kadar yerinden kıpırdamaz
            m.rot = Math.atan2(ppos.x - m.x, ppos.z - m.z) * pc.math.RAD_TO_DEG;
            this.onCaught(i);
        }
    }
};

DontSplashManager.prototype.alertMonster = function (x, z, big) {
    var r = this.areaIndexAt(z);
    if (r < 0) return;
    var S = DontSplashManager.STATE;
    // Sunucunun yönettiği canavarlar atlanır
    var mode = this.netMode();
    for (var i = mode === 2 ? 0 : this.serverMonsterCount(); i < this.monsters.length; i++) {
        var m = this.monsters[i];
        if (m.room !== r || m.state === S.ATTACK || m.state === S.STUN) continue;
        var tx = pc.math.clamp(x, -DontSplashManager.POOL_X, DontSplashManager.POOL_X);
        var tz = pc.math.clamp(z, DontSplashManager.MONSTER_AREAS[r].z0 + 1, DontSplashManager.MONSTER_AREAS[r].z1 - 1);
        // Uzaktaysa çok daha hızlı koşar: her yerden HUNT_ARRIVE sn'de gelir; av sırasında yavaşlamaz
        var ramp = DontSplashManager.HUNT_RAMP[r] || { arrive: DontSplashManager.HUNT_ARRIVE, k: 1 };
        // blokların etrafından dolaşır; uzun yol varış süresini uzatmasın diye hız yol uzunluğuna göre
        var path = this.navPath(m.room, m.x, m.z, tx, tz);
        var spd = Math.max((big ? DontSplashManager.HUNT_SPEED : DontSplashManager.NOISE_SPEED) * ramp.k, DontSplashManager.pathLen(m.x, m.z, path) / ramp.arrive);
        if (m.state === S.HUNT) spd = Math.max(spd, m.huntSpeed || 0);
        if (m.state !== S.HUNT) m.notice = DontSplashManager.NOTICE_TIME;
        m.state = S.HUNT;
        m.spd = spd;
        m.tx = tx;
        m.tz = tz;
        m.path = path;
        m.huntSpeed = spd;
    }
};

// ---------------------------------------------------------------- YOL BULMA (DsNav)
// Canavar bloklara girmeden suyun üstünde dolaşır: bölüm başına 1 m'lik ızgara + A* (DsNav.js).
// Sunucu (dsNav.ts) aynı kodu ve aynı blok listesini kullanır; aynı emirden aynı yolu bulur.
// Bloklar sahnedeki ilk yerleriyle alınır (hareketli bloklar oynamadan), 0.01'e yuvarlanır.
DontSplashManager.prototype.collectNavRects = function () {
    var out = [], rooms = this.entity.findByName('Rooms');
    var r2 = function (v) { return Math.round(v * 100) / 100; };
    if (rooms) rooms.children.forEach(function (e) {
        if (!e.collision || !e.render) return;
        var p = e.getPosition(), s = e.getLocalScale();
        out.push([r2(p.x), r2(p.z), r2(s.x / 2), r2(s.z / 2)]);
    });
    return out;
};
DontSplashManager.prototype.navGrids = function () {
    if (this._nav !== undefined) return this._nav;
    this._nav = typeof DsNav !== 'undefined' && this.navRects ? DsNav.build(this.navRects, DontSplashManager.MONSTER_AREAS, DontSplashManager.POOL_X) : null;
    return this._nav;
};
// (sx,sz) -> (tx,tz) ara noktaları; ızgara yoksa düz çizgi
DontSplashManager.prototype.navPath = function (area, sx, sz, tx, tz) {
    var g = this.navGrids();
    g = g && g[area];
    return g ? g.findPath(sx, sz, tx, tz) : [[tx, tz]];
};
// yol boyunca dist kadar ilerler (DsNav.step ile aynı)
DontSplashManager.moveAlong = function (m, dist) {
    while (dist > 0 && m.path && m.path.length) {
        var p = m.path[0], dx = p[0] - m.x, dz = p[1] - m.z, d = Math.hypot(dx, dz);
        if (d <= dist) { m.x = p[0]; m.z = p[1]; dist -= d; m.path.shift(); }
        else { m.x += dx / d * dist; m.z += dz / d * dist; dist = 0; }
    }
};
DontSplashManager.pathLen = function (sx, sz, path) {
    var L = 0, x = sx, z = sz;
    for (var i = 0; i < path.length; i++) { L += Math.hypot(path[i][0] - x, path[i][1] - z); x = path[i][0]; z = path[i][1]; }
    return L;
};
// sıradaki ara nokta (yoksa hedef)
DontSplashManager.nextPoint = function (m) {
    return m.path && m.path.length ? m.path[0] : [m.tx, m.tz];
};

// Canavarın görünen gövdesi blokların dışında kalır (sadece görsel; yakalama mantığı değişmez)
// Görsel itme yarıçapı: bölümlerdeki 5 m'lik geçitlerin yarısından küçük olmalı, yoksa iki bloğun arasında
// bir o yana bir bu yana itilip titriyordu (yol bulma yarıçapı DsNav RAD = 1.8)
DontSplashManager.MONSTER_RADIUS = 2.3;
DontSplashManager.prototype.monsterBlockers = function () {
    if (this._blockers) return this._blockers;
    var list = [];
    var add = function (root) {
        if (!root) return;
        root.children.forEach(function (e) {
            if (!e.collision || !e.render) return;
            var p = e.getPosition(), s = e.getLocalScale();
            list.push({ x: p.x, z: p.z, hx: s.x / 2, hz: s.z / 2 });
        });
    };
    add(this.entity.findByName('Rooms'));
    add(this.entity.findByName('Parkour'));
    this._blockers = list;
    return list;
};
DontSplashManager.prototype.pushOutOfBlocks = function (v, r) {
    var L = this.monsterBlockers();
    for (var pass = 0; pass < 2; pass++) {
        for (var i = 0; i < L.length; i++) {
            var b = L[i];
            var dx = v.x - b.x, dz = v.z - b.z, ex = b.hx + r, ez = b.hz + r;
            if (Math.abs(dx) >= ex || Math.abs(dz) >= ez) continue;
            if (ex - Math.abs(dx) < ez - Math.abs(dz)) v.x = b.x + (dx < 0 ? -ex : ex);
            else v.z = b.z + (dz < 0 ? -ez : ez);
        }
    }
};

// Görsel: konumları yumuşakça takip et, animasyonu duruma göre seç
DontSplashManager.prototype.updateMonsterVisuals = function (dt) {
    var online = this.netMode() === 1;
    var list = online ? this.app.room.state.dsMonsters : null;
    var S = DontSplashManager.STATE;
    var nearest = 999;
    var ppos = this.player.getPosition();
    for (var i = 0; i < this.monsters.length; i++) {
        var m = this.monsters[i];
        var src = m;
        var fromServer = online && i < list.length && list[i];
        if (fromServer) {
            var sm = list[i];
            src = { x: sm.x, z: sm.z, rot: sm.rot, state: sm.state, moving: sm.moving };
        }
        var v = m.vis;
        var k = Math.min(1, dt * (fromServer ? 8 : (src.state === S.HUNT ? 45 : 20)));   // hızlı koşarken geride kalmasın
        v.x += (src.x - v.x) * k;
        v.z += (src.z - v.z) * k;
        // Dururken/ararken blokların içinde kalmasın (bloğun üstündeki oyuncunun içine giriyordu).
        // Koşarken itilmez (ışınlanıyor gibi görünüyordu); itme yumuşak bir ofsetle uygulanır.
        var runFast = src.state === S.HUNT && src.moving;
        var tox = 0, toz = 0;
        if (!runFast) {
            var pv = { x: v.x, z: v.z };
            this.pushOutOfBlocks(pv, DontSplashManager.MONSTER_RADIUS);
            tox = pv.x - v.x; toz = pv.z - v.z;
        }
        var ko = Math.min(1, dt * 3);
        m.offX = (m.offX || 0) + (tox - (m.offX || 0)) * ko;
        m.offZ = (m.offZ || 0) + (toz - (m.offZ || 0)) * ko;
        var dr = ((src.rot - v.rot + 540) % 360) - 180;
        v.rot += dr * Math.min(1, dt * 6);
        var eating = m.eatUntil > this.time && m.eatPose;
        if (eating) { v.x = m.eatPose.x; v.z = m.eatPose.z; v.rot = m.eatPose.rot; m.offX = 0; m.offZ = 0; }
        // Avlanırken biraz yükselir, devriyede daha çok suya gömülü
        var targetY = (m.look ? m.look.y : DontSplashManager.MONSTER_Y) + (src.state === S.HUNT || src.state === S.ATTACK ? 0.6 : -0.6);
        v.y = v.y === undefined ? targetY : v.y + (targetY - v.y) * Math.min(1, dt * 2);
        // Sadece bulunduğun bölümün canavarı görünür (ilerideki bölümlerinki gizli, giriş sinematiğinde hiçbiri);
        // gizliyken çizilmez/animasyonu hesaplanmaz. Görününce sudan yükselerek belirir.
        var far = (!this.monsterShown(i, ppos.z) && m !== this.holdMonster) || Math.hypot(v.x - ppos.x, v.z - ppos.z) > 170;
        if (m.e.enabled === far) { m.e.enabled = !far; if (!far) v.y = targetY - 5; }
        if (far) { m._px = undefined; continue; }
        var px = v.x + m.offX, pz = v.z + m.offZ;
        // Ekrandaki gerçek hız (adım animasyonu buna göre oynar, ayaklar kaymasın)
        if (m._px !== undefined && dt > 0) {
            var vs = Math.min(80, Math.hypot(px - m._px, pz - m._pz) / dt);
            m.vspd = (m.vspd || 0) + (vs - (m.vspd || 0)) * Math.min(1, dt * 8);
        }
        m._px = px; m._pz = pz;
        m.e.setPosition(px, v.y, pz);
        m.e.setEulerAngles(0, v.rot, 0);
        var anim = eating ? 'Eat' : (src.state === S.ATTACK ? 'Attack' : (src.state === S.STUN ? 'Stun' : (src.moving ? 'Walk' : 'Idle')));
        var ms = m.e.script && m.e.script.dsMonster;
        var aspd = anim === 'Walk' ? pc.math.clamp((m.vspd || 0) / (DontSplashManager.MONSTER_STRIDE * m.e.getLocalScale().x), 0.25, 3) : 1;
        if (ms) ms.setAnim(anim, aspd);
        if (src.state === S.HUNT) nearest = Math.min(nearest, Math.hypot(ppos.x - v.x, ppos.z - v.z));
    }
    // Avlanan canavar yakınsa kalp atışı
    var hb = this.sound && this.sound.slot('heartbeat');
    if (hb) {
        var want = false;   // kalp atışı artık DsAtmosphere'de: canavar yaklaşınca ritimli tık-tık + kırmızı kenar
        if (want && !hb.isPlaying) hb.play();
        if (!want && hb.isPlaying) hb.stop();
        if (want) hb.volume = pc.math.clamp(1 - nearest / 25, 0.15, 0.9);
    }
};

// ---------------------------------------------------------------- YÜZME / SPLASH
DontSplashManager.prototype.updateSwim = function (dt) {
    var pos = this.player.getPosition();
    var feet = pos.y - 1.0;
    var w = this.waterAt(pos);
    var wl = w.level;
    this.curWaterLevel = wl;
    var inPool = Math.abs(pos.x) < DontSplashManager.POOL_HALF;
    var nowIn = inPool && feet < wl - 0.15;
    var rb = this.player.rigidbody;
    // Ölümcül su (vana odası): içinde kalırsan yakalanırsın
    if (nowIn && w.zone && w.zone.deadly && !this.caught) {
        this.deadlyTime += dt;
        if (this.deadlyTime > 1.2) { this.deadlyTime = 0; this.onCaught(-1, 'The water got you.'); return; }
    } else {
        this.deadlyTime = 0;
    }
    if (nowIn && !this.inWater) this.waterEnterTime = this.time;
    if (nowIn) this.lastInWaterTime = this.time;
    if (nowIn && !this.inWater && !this.caught) {
        var vy = rb.linearVelocity.y;
        this.splash(new pc.Vec3(pos.x, wl, pos.z), true, Math.abs(vy));
        if (this.netMode() === 1) this.sendNet('Client:DS:InWater', { v: true });
        // Suya girişin sıçraması canavarı zaten çağırdı: ilk yüzme sesi en erken 1.5 sn sonra
        // (yoksa sıçramadan hemen sonraki ses canavarı tam oyuncunun üstüne yönlendiriyordu)
        this.lastNoise = this.time + 0.6;
        // Suda yavaş yüzülür
        if (this.dryMoveSpeed === undefined) this.dryMoveSpeed = this.ctrl.moveSpeed;
        this.ctrl.moveSpeed = this.swimSpeed;
    } else if (!nowIn && this.inWater) {
        if (this.netMode() === 1) this.sendNet('Client:DS:InWater', { v: false });
        if (this.dryMoveSpeed !== undefined) this.ctrl.moveSpeed = this.dryMoveSpeed;
    }
    this.inWater = nowIn;
    if (!nowIn || this.caught) return;

    // Yüzerken hareket ses çıkarır
    var v = rb.linearVelocity.clone();
    var hs = Math.hypot(v.x, v.z);
    // Suda hareketsiz durmak da ses çıkarır (su içinde çırpınma), daha seyrek: suda beklemek güvenli olmasın,
    // canavar sesin geldiği yere gelip oyuncuyu bulsun
    var gap = hs > 1.5 ? 0.9 : DontSplashManager.STILL_NOISE_TIME;
    if (this.time - this.lastNoise > gap) {
        this.lastNoise = this.time;
        this.splash(new pc.Vec3(pos.x, wl, pos.z), false, 0);
    }
};

// Kontrolcünün update'inden hemen sonra (fizik adımından önce) çalışır:
// platform taşıma ve su fiziği burada hıza eklenir.
DontSplashManager.prototype.hookController = function () {
    var self = this;
    var ctrl = this.ctrl;
    if (!ctrl || ctrl._dsHooked) return;
    ctrl._dsHooked = true;
    // Savurma animasyonundaki vuruş anı (Steal and Run: _animComponent.on("hitEvent"))
    var an = ctrl._animComponent;
    if (an && !an._dsHitHooked) {
        an._dsHitHooked = true;
        an.on('hitEvent', function () { var d = self.app.dontSplash; if (d) d.onHitEvent(); });
    }
    var orig = ctrl.update;
    ctrl.update = function (dt) {
        orig.call(this, dt);
        var ds = self.app.dontSplash;
        if (ds && ds.entity && !ds.entity._destroyed) { ds.afterController(dt); ds.applyRolls(dt, false); }
    };
};

DontSplashManager.prototype.afterController = function (dt) {
    if (this.caught || this.finished) return;
    var rb = this.player.rigidbody;
    var v = rb.linearVelocity.clone();
    var changed = false;

    // Hareketli platformun üstündeyse onunla birlikte git
    if (!this.inWater) {
        var mover = this.findMoverUnderPlayer();
        if (mover) {
            var mv = this.moverVelocityAt(mover, this.player.getPosition());
            v.x += mv.x; v.z += mv.z;
            changed = true;
        }
    }

    if (this.inWater) {
        var pos = this.player.getPosition();
        // Kontrolcü yerdeyken yukarı hızı siler; suda 'zıplamış' sayılsın ki kaldırma kuvveti çalışsın
        this.ctrl._jumped = true;
        this.ctrl._timeSinceLastJump = 0;
        var floatY = this.curWaterLevel - 0.4;   // bele kadar suda
        var jumping = this.time - this.lastSwimJump < 0.45;
        if (!jumping) {
            if (pos.y < floatY) v.y = Math.max(v.y * 0.6, Math.min(8, (floatY - pos.y) * 7));
            else if (v.y < -1) v.y *= 0.5;
            // Sudan zıpla: kenara/platforma çıkmak için
            var wantJump = this.ctrl.isPressSpace || (this.app.keyboard && this.app.keyboard.isPressed(pc.KEY_SPACE));
            // İlk zıplayış hemen olur; az önce sudan zıpladıysa (zincirleme zıplama) bir süre suda kalmak gerekir
            var chained = this.time - this.lastSwimJump < DontSplashManager.SWIM_CHAIN_WINDOW;
            var settled = !chained || this.time - (this.waterEnterTime || 0) > DontSplashManager.SWIM_JUMP_DELAY;
            if (wantJump && settled && pos.y > floatY - 0.8 && this.time - this.lastSwimJump > DontSplashManager.SWIM_JUMP_COOLDOWN) {
                this.lastSwimJump = this.time;
                v.y = this.swimJump;
            }
        }
        changed = true;
    }

    // Sopayla vurulunca yuvarlanma: Steal and Run'daki gibi hız bir kez (x, 0, z) verilir, yuvarlanırken
    // oyuncu kontrol edemez, yatay hız sabit kalır (orada sürtünmesiz top). Bitince normal kontrole döner.
    var roll = this.rollMove;
    if (roll) {
        if (!roll.started) { roll.started = true; v.y = 0; }
        v.x = roll.vx; v.z = roll.vz;
        this.ctrl._jumped = true;
        this.ctrl._timeSinceLastJump = 0;
        changed = true;
    }
    if (changed) rb.linearVelocity = v;
};

DontSplashManager.prototype.splash = function (p, isBig, impact) {
    if (isBig) {
        this.play('splash', pc.math.clamp(0.5 + impact / 30, 0.5, 1));
        this.spawnSplashFx(p, 1);
    } else {
        this.play('noise', 0.35);
        this.spawnSplashFx(p, 0.4);
    }
    var mode = this.netMode();
    if (mode === 2 && !isBig) {
        // Yüzme sesi: sadece canavar alanında ve en fazla 1.8 sn'de bir gönderilir (yerel tahmin de aynı anda)
        if (this.areaIndexAt(p.z) < 0 || this.time - (this.lastNoiseNet || -99) < 1.8) return;
        this.lastNoiseNet = this.time;
    }
    if (mode === 2) this.sendNet(isBig ? 'Client:DS:Splash' : 'Client:DS:Noise', { x: +p.x.toFixed(2), z: +p.z.toFixed(2) });
    else if (mode === 1) this.sendNet(isBig ? 'Client:DS:Splash' : 'Client:DS:Noise', { x: p.x, y: p.y, z: p.z });
    this.alertMonster(p.x, p.z, isBig);
};

// Çakıl suya düştü: canavarı o noktaya çeker (oyuncu yerine)
DontSplashManager.prototype.lure = function (p) {
    this.play('noise', 0.45);
    this.spawnSplashFx(p, 0.55);
    if (this.isOnline()) this.sendNet('Client:DS:Noise', { x: +p.x.toFixed(2), y: 0, z: +p.z.toFixed(2), lure: true });
    this.alertMonster(p.x, p.z, true);
};

// İşaret fişeği: yakındaki canavarı sersemletir
DontSplashManager.prototype.stunNear = function (p, radius) {
    var best = -1, bd = radius;
    for (var i = 0; i < this.monsters.length; i++) {
        var v = this.monsters[i].vis;
        var d = Math.hypot(v.x - p.x, v.z - p.z);
        if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) return false;
    var mode = this.netMode();
    if (best < this.serverMonsterCount()) {
        // Eski sunucu bu mesajı tanımıyorsa bağlantıyı koparır; sadece yeni sunucuya (dsSeed var) gönder
        if (this.app.room.state.dsSeed) this.sendNet('Client:DS:Stun', { m: best });
        else return false;
    }
    if (best < this.serverMonsterCount() && mode !== 2) {
        // eski sunucu: durum sunucudan gelir
    } else { var m = this.monsters[best]; if (m.state !== DontSplashManager.STATE.ATTACK) { m.state = DontSplashManager.STATE.STUN; m.timer = DontSplashManager.STUN_TIME; } }
    return true;
};

DontSplashManager.prototype.showHint = function () {
    if (this.hintShown) return;
    this.hintShown = true;
    this.app.fire('WarningTextController:setWarning', 'It heard you! Get out of the water!', 3.5, new pc.Color(1, 0.3, 0.3, 1));
};

// Sıçrama efekti: damlalar + genişleyen halka
DontSplashManager.prototype.spawnSplashFx = function (p, power) {
    var fx = this.splashPool.find(function (f) { return !f.busy; });
    // Çok sıçrama aynı anda: en eskisi yeniden kullanılır (sınırsız efekt oluşmasın)
    if (!fx && this.splashPool.length >= 16) {
        fx = this.splashPool.reduce(function (a, b) { return a.t > b.t ? a : b; });
    }
    if (!fx) {
        var root = new pc.Entity('SplashFx');
        var drops = new pc.Entity('Drops');
        drops.addComponent('particlesystem', {
            autoPlay: false, loop: false, numParticles: 40, lifetime: 0.9, rate: 0.001, rate2: 0.001,
            emitterShape: pc.EMITTERSHAPE_SPHERE, emitterRadius: 0.6,
            startAngle: 0, startAngle2: 360,
            localVelocityGraph: new pc.CurveSet([[0, 0], [0, 7], [0, 0]]),
            localVelocityGraph2: new pc.CurveSet([[0, 0], [0, 11], [0, 0]]),
            velocityGraph: new pc.CurveSet([[0, -3, 1, -3], [0, 0, 1, -16], [0, -3, 1, -3]]),
            velocityGraph2: new pc.CurveSet([[0, 3, 1, 3], [0, 0, 1, -16], [0, 3, 1, 3]]),
            scaleGraph: new pc.Curve([0, 0.35, 1, 0.15]),
            alphaGraph: new pc.Curve([0, 0.9, 0.7, 0.7, 1, 0]),
            // su rengi: açık mavi, uçlara doğru beyazımsı
            colorGraph: new pc.CurveSet([[0, 0.7, 1, 0.55], [0, 0.9, 1, 0.8], [0, 1, 1, 1]]),
            colorMap: this.dropTex(),
            blendType: pc.BLEND_NORMAL, depthWrite: false, lighting: false
        });
        // Karanlık sis damlaları gri/siyah yapmasın
        if (drops.particlesystem.emitter) { drops.particlesystem.emitter.useFog = false; if (drops.particlesystem.emitter.resetMaterial) drops.particlesystem.emitter.resetMaterial(); }
        root.addChild(drops);
        var ring = new pc.Entity('Ring');
        var rm = new pc.StandardMaterial();
        rm.diffuse = new pc.Color(0, 0, 0);
        rm.emissive = new pc.Color(0.6, 0.85, 1);
        rm.useLighting = false;
        rm.useFog = false;
        if (this.ringTexture && this.ringTexture.resource) {
            rm.emissiveMap = this.ringTexture.resource;
            rm.opacityMap = this.ringTexture.resource;
        }
        rm.blendType = pc.BLEND_NORMAL;
        rm.depthWrite = false;
        rm.opacity = 1;
        rm.update();
        ring.addComponent('render', { type: 'plane', castShadows: false, receiveShadows: false });
        ring.render.meshInstances[0].material = rm;
        root.addChild(ring);
        this.app.root.addChild(root);
        fx = { root: root, drops: drops, ring: ring, mat: rm, busy: false, t: 0 };
        this.splashPool.push(fx);
    }
    fx.busy = true;
    fx.t = 0;
    fx.power = power;
    fx.root.setPosition(p.x, this.waterLevel + 0.05, p.z);
    fx.root.enabled = true;
    fx.drops.setLocalScale(power, power, power);
    fx.drops.particlesystem.reset();
    fx.drops.particlesystem.play();
};

// Yumuşak yuvarlak damla (eski doku kare kare gri görünüyordu)
DontSplashManager.prototype.dropTex = function () {
    if (this._dropTex) return this._dropTex;
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.45, 'rgba(255,255,255,0.85)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    var tex = new pc.Texture(this.app.graphicsDevice, { width: 64, height: 64, format: pc.PIXELFORMAT_RGBA8, mipmaps: true });
    tex.setSource(c);
    this._dropTex = tex;
    return tex;
};

DontSplashManager.prototype.updateSplashFx = function (dt) {
    for (var i = 0; i < this.splashPool.length; i++) {
        var f = this.splashPool[i];
        if (!f.busy) continue;
        f.t += dt;
        var k = Math.min(1, f.t / 1.1);
        var s = (1 + k * 5) * f.power;
        f.ring.setLocalScale(s, 1, s);
        f.mat.opacity = (1 - k) * 0.8;
        f.mat.update();
        if (f.t > 1.2) { f.busy = false; f.root.enabled = false; }
    }
};

// ---------------------------------------------------------------- YAKALANMA
DontSplashManager.prototype.onCaught = function (monsterIndex, subText) {
    if (this.caught || this.finished) return;
    if (this.cine) this.endDeathCine();
    this.caught = true;
    this.deaths++;
    this.funnelEnd('fail');
    var m = this.monsters[monsterIndex];
    this.play('attack', 1);
    if (this.app.player) this.app.player.canMove = false;
    var rb = this.player.rigidbody;
    rb.linearVelocity = pc.Vec3.ZERO;
    // Canavar oyuncuya doğru atılır
    if (m) {
        var p = this.player.getPosition();
        var dir = new pc.Vec3(m.vis.x - p.x, 0, m.vis.z - p.z);
        if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
        dir.normalize().mulScalar(m.look ? m.look.lunge : 2.8);   // canavar büyük, kamera içine girmesin
        m.vis.x = p.x + dir.x; m.vis.z = p.z + dir.z;
        m.vis.rot = Math.atan2(-dir.x, -dir.z) * pc.math.RAD_TO_DEG;
        // Yeni model: kapma noktası (Catch_Point) tam oyuncunun üstüne gelecek şekilde konumlanır
        this.placeForEat(m, p);
        if (monsterIndex >= this.serverMonsterCount() || this.netMode() === 2) { m.x = m.vis.x; m.z = m.vis.z; m.rot = m.vis.rot; }
        // Canavar oyuncuyu eline alır: karakter modeli elin içinde çizilir (animasyondan sonra, gecikmesiz),
        // oyuncunun kendisi (kamera, ağdaki konum) yakalandığı yerde sabit kalır
        this.holdMonster = m;
        this.holdHand = this.monsterHand(m);
        this.eatT = 0;
        this.eatFrom = null;
        m.eatUntil = this.time + DontSplashManager.EAT.len;
        rb.type = pc.BODYTYPE_KINEMATIC;
        var an = this.ctrl && this.ctrl._animComponent;
        if (an) an.setBoolean('caught', true);
    }
    if (m) this.caughtCount = (this.caughtCount || 0) + 1;
    else this.drownCount = (this.drownCount || 0) + 1;
    // Oyunun kendi hasar efekti + kısa kararma
    var dmg = this.app.root.findByName('TakeDamageEffect');
    if (dmg) { dmg.enabled = true; dmg.children.forEach(function (c) { c.enabled = true; }); }
    this.caughtPos = this.player.getPosition().clone();
    this.rollMove = null;
    var self = this;
    // Canavarın elinde bir an kalır, sonra devam (reklam) / baştan seçimi
    setTimeout(function () {
        if (!self.entity || self.entity._destroyed) return;
        if (dmg) dmg.enabled = false;
        self.openDownMenu();
    }, m ? DontSplashManager.EAT.menu * 1000 : 700);
};

// Canavarı, kapma noktası (Catch_Point) verilen konuma gelecek şekilde yerleştirir; yeme bitene kadar orada sabit kalır
DontSplashManager.prototype.placeForEat = function (m, p) {
    var cp = m.e.findByName('Catch_Point');
    var v = m.vis;
    if (cp) {
        // canavarın kendi (ölçeksiz) uzayında kapma noktası: modeldeki Catch_Point (animasyondan bağımsız sabit)
        if (!m.catchLocal) m.catchLocal = DontSplashManager.CATCH_LOCAL;
        var sc = m.e.getLocalScale().x;
        var a = v.rot * pc.math.DEG_TO_RAD, c = Math.cos(a), s = Math.sin(a);
        var lx = m.catchLocal.x * sc, lz = m.catchLocal.z * sc;
        // y ekseni etrafında dönüş (PlayCanvas: x' = x cos + z sin, z' = -x sin + z cos)
        v.x = p.x - (lx * c + lz * s);
        v.z = p.z - (-lx * s + lz * c);
    }
    m.eatPose = { x: v.x, z: v.z, rot: v.rot };
    var ms = m.e.script && m.e.script.dsMonster;
    if (ms && ms.restart) ms.restart('Eat');
    m.offX = 0; m.offZ = 0;
    if (this.monsters.indexOf(m) >= this.serverMonsterCount() || this.netMode() === 2) { m.x = v.x; m.z = v.z; m.rot = v.rot; }
};

// ---------------------------------------------------------------- YAKALANINCA: REKLAMLA DEVAM / BAŞTAN
DontSplashManager.prototype.buildDownMenu = function () {
    var src = this.app.root.findByName('DeadMenu');
    if (!src) return null;
    // Oyunun kendi ölüm paneli kopyalanır (aynı görünüm), butonlar bu moda bağlanır
    var menu = src.clone();
    menu.name = 'DSDownMenu';
    src.parent.addChild(menu);
    var spec = menu.findByName('SpectateControls');
    if (spec) spec.enabled = false;
    var self = this;
    var ad = menu.findByName('RewardedAdButton');
    var re = menu.findByName('RespawnButton');
    var t1 = ad && ad.findByName('Text');
    if (t1 && t1.element) t1.element.text = 'Continue';
    var t2 = re && re.findByName('Text');
    if (t2 && t2.element) t2.element.text = 'Restart';
    // Poki kuralı: Continue (reklam) ve Restart butonları aynı boyutta, yazıları da aynı büyüklükte
    var grp = menu.findByName('ButtonGroup');
    if (ad && re && ad.element && re.element) {
        var sc = ad.getLocalScale().x * (grp ? grp.getLocalScale().x : 1);
        re.element.width = ad.element.width;
        re.element.height = ad.element.height;
        // Restart'ın çerçeve sprite'ı kenar boşluklu olduğu için daha küçük görünüyordu: Continue ile aynı buton görseli
        re.element.spriteAsset = ad.element.spriteAsset;
        re.element.opacity = 1;
        re.setLocalScale(sc, sc, sc);
        if (t1 && t2 && t1.element && t2.element) {
            // Continue yazısı genişliğe sığdırılıp 34'e küçülüyordu, Restart 41'de kalıyordu: ikisi de sabit aynı boyut
            t1.element.autoFitWidth = false;
            t1.element.autoFitHeight = false;
            t1.element.wrapLines = false;   // çeviride uzun yazı iki satıra bölünmesin (grup genişliği yazıya göre ayarlanır)
            t1.element.autoWidth = true;
            t1.element.fontSize = 34;
            t2.element.fontSize = 34;
        }
        // İkisi de ekranın ortasına, alt alta: Continue grubun (yerleşim düzeni) içinden çıkarılır ki konumu elle verilebilsin
        ad.reparent(menu);
        ad.element.anchor = new pc.Vec4(0.5, 0.5, 0.5, 0.5);
        ad.element.pivot = new pc.Vec2(0.5, 0.5);
        ad.setLocalScale(sc, sc, sc);
        ad.setLocalPosition(0, DontSplashManager.DOWN_BTN_Y, 0);
        // Restart, Continue butonunun birebir kopyası olsun (aynı çerçeve, gölge, yazı stili); sadece reklam simgesi yok
        var nr = this.cloneButton(ad, 'RespawnButton', 'Restart');
        menu.addChild(nr);
        nr.setLocalScale(sc, sc, sc);
        re.destroy();
        re = nr;
        // Yan yana: solda yeşil Restart (bedava), sağda mor Continue (reklam simgeli); üstte kafatası
        var L = DontSplashManager.DOWN_LOOK;
        re.element.spriteAsset = L.restartSprite;
        ad.element.spriteAsset = L.continueSprite;
        re.setLocalPosition(-L.dx, L.btnY, 0);
        ad.setLocalPosition(L.dx, L.btnY, 0);
        var skull = menu.children.find(function (c) { return c.name === 'Image' && c.element; });
        if (skull) {
            skull.element.textureAsset = L.skullTex;
            skull.element.color = L.skullColor;
            skull.element.width = skull.element.height = L.skullSize;
            skull.setLocalPosition(0, L.skullY, 0);
            skull.enabled = true;
        }
    }
    if (ad && ad.button) ad.button.on('click', function () { self.downChoice(true); });
    if (re && re.button) re.button.on('click', function () { self.downChoice(false); });
    // Poki kuralı: bu butonlar büyüyüp küçülmez (nabız / üzerine gelince büyüme yok)
    // İkisi de aynı opaklıkta: kopyalanan Restart'ın butonu pasif geliyordu (ölüm panelindeki süre dolmadan), pasif rengi yarı saydamdı
    [ad, re].forEach(function (b) {
        if (!b || !b.button) return;
        b.button.active = true;
        var w = new pc.Color(1, 1, 1, 1);
        b.button.normalTint = w; b.button.hoverTint = w; b.button.pressedTint = new pc.Color(0.9, 0.9, 0.9, 1); b.button.inactiveTint = w;
        if (b.element) b.element.opacity = 1;
    });
    // Süre çubuğu: bitince baştan başlar
    var group = menu.findByName('ButtonGroup');
    var barBg = new pc.Entity('DSDownBar');
    barBg.addComponent('element', {
        type: 'image', anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5), pivot: new pc.Vec2(0.5, 0.5),
        width: 330, height: 14, spriteAsset: 196470298, color: new pc.Color(0, 0, 0), opacity: 0.55, useInput: false
    });
    var fill = new pc.Entity('Fill');
    fill.addComponent('element', {
        type: 'image', anchor: new pc.Vec4(0, 0.5, 0, 0.5), pivot: new pc.Vec2(0, 0.5),
        width: 330, height: 14, spriteAsset: 196470298, color: new pc.Color(0.95, 0.25, 0.2), opacity: 1, useInput: false
    });
    barBg.addChild(fill);
    menu.addChild(barBg);
    barBg.setLocalPosition(0, DontSplashManager.DOWN_LOOK.barY, 0);
    this.downFill = fill;
    menu.enabled = false;
    return menu;
};

// Yakalanma / kazanma paneli açıkken oyunun diğer menüleri (ayarlar, mağaza, emote) açılmasın
DontSplashManager.prototype.hookMenus = function () {
    // app sahneler arası kalıcı: işaret fonksiyonun üstünde, bakılan da o anki mod (lobiden tekrar girince de çalışsın)
    var app = this.app;
    if (typeof app.anyMenuEnabled !== 'function' || app.anyMenuEnabled._ds) return;
    var orig = app.anyMenuEnabled;
    var wrapped = function () {
        var ds = app.dontSplash;
        if (ds && (ds.downOpen || ds.winOpen)) return true;
        return orig.apply(this, arguments);
    };
    wrapped._ds = true;
    app.anyMenuEnabled = wrapped;
};

// Panel açılırken açık olan menüleri kapat (üst üste binmesin)
DontSplashManager.prototype.closeOtherMenus = function () {
    var app = this.app;
    try { if (app.pauseMenu && app.network && app.network.setMenu) app.network.setMenu(false); } catch (e) { }
    try { if (app.menu && app.menu.activeMenu && app.menu.closeMenu) app.menu.closeMenu(); } catch (e) { }
};

// Panel butonları: üstüne gelince büyür, basınca küçülür, dururken hafifçe nefes alır
// Reklam butonunun kopyası: aynı görünüm, reklam simgesi gizli, yazı ortada
DontSplashManager.prototype.cloneButton = function (src, name, text) {
    var b = src.clone();
    b.name = name;
    if (b.script) b.removeComponent('script');
    this.labelButton(b, text);
    return b;
};

DontSplashManager.prototype.labelButton = function (b, text) {
    var ad = b.findByName('Ad');
    if (ad) ad.enabled = false;
    var t = b.findByName('Text'), g = b.findByName('ButtonGroup');
    if (!t || !t.element) return;
    if (g && t.parent === g) {
        var gy = g.getLocalPosition().y;
        t.reparent(b);
        t.element.anchor = new pc.Vec4(0.5, 0.5, 0.5, 0.5);
        t.element.pivot = new pc.Vec2(0.5, 0.5);
        t.element.alignment = new pc.Vec2(0.5, 0.5);
        t.setLocalPosition(0, gy, 0);
    }
    t.element.autoFitWidth = false; t.element.autoFitHeight = false;
    t.element.wrapLines = false;
    t.element.autoWidth = true;
    t.element.text = text;
};

DontSplashManager.prototype.juiceButton = function (e, phase) {
    if (!e || !e.button) return;
    e.button.active = true;   // ölüm panelinde "Respawn" butonu varsayılan kapalı geliyor
    if (e.script && e.script.rewardedButtonAnimation) e.script.rewardedButtonAnimation.enabled = false;
    // Poki kuralı: boyut hiç değişmez; renk sabit beyaz, basınca hafif koyulaşır
    var w = new pc.Color(1, 1, 1, 1);
    e.button.normalTint = w; e.button.hoverTint = w; e.button.pressedTint = new pc.Color(0.9, 0.9, 0.9, 1); e.button.inactiveTint = w;
    if (e.element) e.element.opacity = 1;
};

// Panel aşağıdan kayarak gelir (tween yerine; menü açılıp kapanınca tween'ler durabiliyor)
DontSplashManager.prototype.slideIn = function (menu, dur) {
    menu.setLocalPosition(0, -600, 0);
    menu._dsSlide = { t: 0, dur: dur };
};

DontSplashManager.prototype.updateButtons = function (dt) {
    var menus = [this.downMenu, this.winMenu];
    for (var m = 0; m < menus.length; m++) {
        var mn = menus[m], sl = mn && mn._dsSlide;
        if (!sl || !mn.enabled) continue;
        sl.t = Math.min(1, sl.t + dt / sl.dur);
        var e = 1 - Math.pow(1 - sl.t, 3);
        mn.setLocalPosition(0, -600 * (1 - e), 0);
        if (sl.t >= 1) mn._dsSlide = null;
    }
};

DontSplashManager.prototype.openDownMenu = function () {
    if (!this.caught || this.finished) return;
    if (window.pokiMeasure) window.pokiMeasure('rewarded', 'ds-continue', 'visible');
    if (window.pokiGameplayStop) window.pokiGameplayStop(this.app);
    // Yutulduysa model gizli kalır (yeniden doğunca geri gelir); yutulmadıysa canavar bırakır
    var eaten = this.eatT > DontSplashManager.EAT.inMouth;
    if (!eaten) this.holdMonster = null;
    this.flash(new pc.Color(0, 0, 0), 0.55);
    if (!this.downMenu) this.downMenu = this.buildDownMenu();
    if (!this.downMenu) { this.revive(false); return; }
    this.closeOtherMenus();
    this.downOpen = true;
    this.sideHud(false);
    this.downLeft = DontSplashManager.DOWN_TIME;
    this.app.deadMenuEnabled = true;
    this.app.fire('lockCamera', true);
    var menu = this.downMenu;
    menu.enabled = true;
    this.slideIn(menu, 0.4);
};

// Yakalanma menüsü açıkken soldaki HUD butonları ve telefon kontrolleri gizlenir (yan yana butonlar üstlerine binmesin)
DontSplashManager.prototype.sideHud = function (show) {
    if (!show) {
        if (this._hudHidden) return;
        var gui = this.app.root.findByName('GameUI');
        this._hudHidden = ['LeftCorner', 'MobileControls'].map(function (n) { return gui && gui.findByName(n); })
            .filter(function (e) { return e && e.enabled; });
        this._hudHidden.forEach(function (e) { e.enabled = false; });
    } else if (this._hudHidden) {
        this._hudHidden.forEach(function (e) { e.enabled = true; });
        this._hudHidden = null;
    }
};

DontSplashManager.prototype.updateDownMenu = function (dt) {
    if (!this.downOpen) return;
    // iki buton yan yana: dar ekranda (dik telefon) panel ekrana sığacak kadar küçülür
    var menu = this.downMenu, scr = menu && menu.element && menu.element.screen && menu.element.screen.screen;
    if (scr) {
        var k = Math.min(1, (this.app.graphicsDevice.width / (scr.scale || 1) - 40) / DontSplashManager.DOWN_LOOK.width);
        if (Math.abs(menu.getLocalScale().x - k) > 0.001) menu.setLocalScale(k, k, 1);
    }
    if (!this.app.isWatchingAd) this.downLeft -= dt;
    if (this.downFill) this.downFill.element.width = 330 * Math.max(0, this.downLeft / DontSplashManager.DOWN_TIME);
    if (this.downLeft <= 0) this.revive(false);
};

DontSplashManager.prototype.downChoice = function (useAd) {
    if (!this.downOpen || this.app.isWatchingAd) return;
    this.play('click', 0.7);
    // Baştan: ölüp yeniden başlarken ara reklam (Poki)
    if (!useAd) { this.revive(false); if (typeof watchCommercial === 'function') watchCommercial(); return; }
    var self = this;
    if (window.pokiMeasure) window.pokiMeasure('rewarded', 'ds-continue', 'interact');
    if (typeof watchRewarded === 'function') watchRewarded(function () { if (self.downOpen) self.revive(true); });
    else this.revive(true);
};

DontSplashManager.prototype.revive = function (cont) {
    if (!this.caught) return;
    this.downOpen = false;
    this.sideHud(true);
    if (this.downMenu) this.downMenu.enabled = false;
    this.app.deadMenuEnabled = false;
    this.app.fire('lockCamera', false);
    if (cont) {
        // Yakalandığın yere en yakın platformdan devam; kısa süre kalkanlı (herkes kalkanı görür)
        this.respawn(this.safeSpotNear(this.caughtPos || this.checkpointPos));
        this.giveShield(DontSplashManager.REVIVE_SHIELD);
    } else {
        // Baştan: girişte bekleyen canavar hemen yakalamasın diye aynı kısa koruma
        this.respawn();
        this.graceUntil = this.realTime() + 3;
    }
};

// Verilen noktaya en yakın platform (canavarın dibinde olmasın)
// Devam: yakalandığın yere en yakın, üstüne basılabilen (batmayan) blok. 2. bölgenin blokları da dahil.
// Canavarın dibindeki bloklar ancak başka seçenek yoksa seçilir.
DontSplashManager.prototype.safeSpotNear = function (pos) {
    if (!this.platList) {
        var rooms = this.entity.findByName('Rooms');
        this.platList = rooms ? rooms.children.filter(function (e) {
            return /^PlatB?\d+$/.test(e.name) && !e.tags.has('DSSinking') && !e.tags.has('DSMover') && !!e.collision;
        }) : [];
    }
    // Hafıza köprüsünde düşen köprünün başından devam eder (en yakın blok bitiş platformu olup bulmacayı atlatmasın)
    var ms = this.entity.findByName('MemStart');
    var q = ms && ms.getPosition();
    if (q && pos.z > q.z + 2.6 && pos.z < q.z + 55.6 && Math.abs(pos.x) < 18) {
        return new pc.Vec3(Math.max(-13, Math.min(13, pos.x)), q.y + 1.3, q.z - 1);
    }
    var best = null, bd = 1e9;
    for (var i = 0; i < this.platList.length; i++) {
        var pl = this.platList[i];
        if (!pl.enabled) continue;
        var p = pl.getPosition();
        var d = Math.hypot(p.x - pos.x, p.z - pos.z);
        for (var k = 0; k < this.monsters.length; k++) {
            var mv = this.monsters[k].vis;
            if (Math.hypot(p.x - mv.x, p.z - mv.z) < 10) d += 1000;
        }
        if (d < bd) { bd = d; best = pl; }
    }
    if (!best) return this.checkpointPos;
    var c = best.getPosition();
    return new pc.Vec3(c.x, c.y + best.getLocalScale().y / 2 + 1.3, c.z);
};

// Kalkan (reklam) ya da devam sonrası kısa koruma
DontSplashManager.prototype.isShielded = function () {
    var t = this.realTime();
    return t < (this.shieldUntil || 0) || t < (this.graceUntil || 0);
};

DontSplashManager.prototype.shieldActive = function () {
    return this.realTime() < (this.shieldUntil || 0);
};
// Gerçek saat (sn): kalkan sunucudaki 30 sn ile aynı biter (düşük FPS / arka plandaki sekme kaydırmasın)
DontSplashManager.prototype.realTime = function () {
    return performance.now() / 1000;
};

// sec verilmezse reklamla alınan 30 sn'lik kalkan; Continue ile dönünce kısa (REVIVE_SHIELD) kalkan
DontSplashManager.prototype.giveShield = function (sec) {
    var quiet = !!sec;
    sec = sec || DontSplashManager.SHIELD_TIME;
    this.shieldUntil = Math.max(this.shieldUntil || 0, this.realTime() + sec);
    this.myShield = true;
    // Sunucu isProtected'ı herkese yayar (diğerleri kalkanı görür); eski sunucuda sadece yerelde
    if (this.serverVer() >= 4) this.sendNet('Client:DS:Shield', { sec: sec });
    if (this.ctrl && this.ctrl.setProtected) this.ctrl.setProtected(true);
    if (!quiet) this.play('success', 0.6);
};

// Güvenli bölge: canavarın giremediği zeminler (başlangıç, bölgeler arası, çıkış). Burada sopa vurulmaz.
DontSplashManager.prototype.inSafeZone = function (pos) {
    return this.areaIndexAt(pos.z) < 0;
};

DontSplashManager.prototype.safeZoneWarning = function () {
    this.app.fire('WarningTextController:setWarning', "You can't hit in safe zone", 3, new pc.Color(1, 0, 0, 1));
};

DontSplashManager.prototype.updateShield = function () {
    if (this.myShield && !this.shieldActive()) {
        this.myShield = false;
        if (this.ctrl && this.ctrl.setProtected && this.ctrl.isProtected) this.ctrl.setProtected(false);
    }
};

DontSplashManager.prototype.respawn = function (at) {
    var p = at || this.checkpointPos;
    if (this.cine) this.endDeathCine();
    this.holdMonster = null;
    this.rollMove = null;
    if (this.player.rigidbody.type !== pc.BODYTYPE_DYNAMIC) this.player.rigidbody.type = pc.BODYTYPE_DYNAMIC;
    var an = this.ctrl && this.ctrl._animComponent;
    if (an) an.setBoolean('caught', false);
    this.player.rigidbody.teleport(p.x, p.y, p.z);
    this.player.rigidbody.linearVelocity = pc.Vec3.ZERO;
    if (this.app.room) this.app.room.send('PlayerTeleport', { x: p.x, y: p.y, z: p.z });
    this.inWater = false;
    if (this.netMode() === 1) this.sendNet('Client:DS:InWater', { v: false });
    if (this.dryMoveSpeed !== undefined) this.ctrl.moveSpeed = this.dryMoveSpeed;
    this.caught = false;
    if (this.app.player) this.app.player.canMove = true;
    // Yakalanırken kamera canavara dönüyordu: dirilince hem kamera hem karakter parkura (+z) baksın,
    // yoksa oyuncu geriye koşup önceki bölüme dönüyordu
    var cam = this.camEntity || (this.camEntity = this.app.root.findByName('Camera'));
    var sc = cam && cam.script;
    if (sc && sc.cameraController && sc.cameraController.eulers) sc.cameraController.eulers.x = 0;
    if (sc && sc.mobileCameraController && sc.mobileCameraController.eulers) sc.mobileCameraController.eulers.x = 0;
    if (this.ctrl) {
        this.ctrl._desiredAngle = 0;
        this.ctrl._armatureTargetAngle = 0;
        // karakterin dönüşü _quatLerp'ten yumuşatılarak uygulanıyor: onu da sıfırlamazsak model eski yöne (canavara) bakmaya devam ediyor
        this.ctrl._quatLerp = new pc.Quat();
        if (this.ctrl.body) this.ctrl.body.setRotation(this.ctrl._quatLerp);
    }
    this.flash(new pc.Color(0, 0, 0), 0);
    this.app.fire('ds:respawn', this.checkpoint);
};

// ---------------------------------------------------------------- SES
DontSplashManager.prototype.setupSound = function () {
    if (!this.entity.sound) this.entity.addComponent('sound', { positional: false });
    this.sound = this.entity.sound;
    var add = function (snd, name, asset, opts) {
        if (!asset) return;
        snd.addSlot(name, Object.assign({ asset: asset.id, volume: 1, autoPlay: false, loop: false, overlap: true }, opts || {}));
    };
    add(this.sound, 'splash', this.splashSound);
    add(this.sound, 'noise', this.noiseSound);
    add(this.sound, 'attack', this.attackSound);
    add(this.sound, 'success', this.successSound);
    add(this.sound, 'heartbeat', this.heartbeatSound, { loop: true, overlap: false, volume: 0.5 });
    add(this.sound, 'throw', this.throwSound);
    add(this.sound, 'flare', this.flareSound);
    add(this.sound, 'valve', this.valveSound);
    add(this.sound, 'alarm', this.alarmSound);
    add(this.sound, 'door', this.doorSound);
    add(this.sound, 'click', this.clickSound);
    var self = this;
    [['swoosh', DontSplashManager.SND_SWOOSH], ['punch', DontSplashManager.SND_PUNCH], ['oof', DontSplashManager.SND_OOF]].forEach(function (s) {
        var a = self.app.assets.get(s[1]);
        if (a) { add(self.sound, s[0], a); if (!a.loaded) self.app.assets.load(a); }
    });
    // Sürekli çalan havuz uğultusu (şşş) kaldırıldı; ortam sesi damlalar, canavar ve su sesleri
};

DontSplashManager.prototype.playP = function (name, volume, p0, p1) {
    var slot = this.sound && this.sound.slot(name);
    if (!slot) return;
    slot.volume = volume === undefined ? 1 : volume;
    slot.pitch = pc.math.random(p0 || 1, p1 || 1);
    slot.play();
};

DontSplashManager.prototype.play = function (name, volume) {
    var slot = this.sound && this.sound.slot(name);
    if (!slot) return;
    slot.volume = volume === undefined ? 1 : volume;
    slot.play();
};

// ---------------------------------------------------------------- ARAYÜZ
DontSplashManager.prototype.setupHud = function () {
    var ui = this.app.root.findByName('GameUI');
    if (!ui) return;
    // Süre ve oda bilgisi oyunun kendi TimerText / WaitingText yazılarında gösterilir.
    // Burada sadece kararma perdesi var.
    this.overlay = new pc.Entity('DSOverlay');
    this.overlay.addComponent('element', {
        type: 'image', anchor: new pc.Vec4(0, 0, 1, 1), pivot: new pc.Vec2(0.5, 0.5), margin: new pc.Vec4(0, 0, 0, 0),
        color: new pc.Color(0, 0, 0), opacity: 0, useInput: false
    });
    ui.addChild(this.overlay);
    this.overlayAlpha = 0;
    // Kenar kararması (oyunun örümcek efektindeki vignette görseli)
    this.vignette = new pc.Entity('DSVignette');
    this.vignette.addComponent('element', {
        type: 'image', anchor: new pc.Vec4(0, 0, 1, 1), pivot: new pc.Vec2(0.5, 0.5), margin: new pc.Vec4(0, 0, 0, 0),
        spriteAsset: 196470330, color: new pc.Color(0, 0, 0), opacity: 0, useInput: false
    });
    ui.insertChild(this.vignette, 0);
    this.vignette.enabled = false;
    this.vignetteAlpha = 0;
    this.overlayTarget = 0;
};

// Yakalanınca oyuncu canavarın elinde durur
DontSplashManager.prototype.monsterHand = function (m) {
    if (!m || !m.e) return null;
    if (!m.hand) {
        var names = m.look ? m.look.hold : DontSplashManager.MONSTER_HOLD;
        for (var hn = 0; hn < names.length && !m.hand; hn++) m.hand = m.e.findByName(names[hn]);
    }
    return m.hand;
};

// Eldeki karakter: modelin konumu bu karenin animasyonundan sonra elden alınır (postUpdate), gecikme olmaz.
// Yerel oyuncu ve sunucunun "yakaladı" dediği uzak oyuncular için aynı.
DontSplashManager.prototype.holdBodyAt = function (body, hand, m, t, from) {
    if (!body || body._destroyed || !hand) return;
    var E = DontSplashManager.EAT;
    var h = hand.getPosition();
    var x = h.x, y = h.y - DontSplashManager.MONSTER_HOLD_DY, z = h.z, sc = 1;
    var mouth = t !== undefined ? this.monsterMouth(m) : null;
    if (t !== undefined && mouth) {
        var ss = function (a) { a = pc.math.clamp(a, 0, 1); return a * a * (3 - 2 * a); };
        if (t < E.grab && from) {
            // el uzanırken: karakter yerinden ele doğru çekilir
            var k = ss((t - E.reach) / (E.grab - E.reach));
            x = from.x + (x - from.x) * k; y = from.y + (y - from.y) * k; z = from.z + (z - from.z) * k;
        } else if (t >= E.toMouth) {
            // elden ağza: ağzın içine girer ve küçülerek kaybolur (yutuldu)
            var mp0 = mouth.getPosition();
            var k2 = ss((t - E.toMouth) / (E.inMouth - E.toMouth));
            x += (mp0.x - x) * k2; y += (mp0.y - 0.6 - y) * k2; z += (mp0.z - z) * k2;
            sc = t >= E.inMouth ? 0.001 : 1 - 0.85 * k2;
        }
    }
    if (body._dsBaseScale === undefined) body._dsBaseScale = body.getLocalScale().x;
    var bs = body._dsBaseScale * sc;
    body.setLocalScale(bs, bs, bs);
    body.setPosition(x, y, z);
    var mp = m.e.getPosition();
    body.setEulerAngles(0, Math.atan2(mp.x - h.x, mp.z - h.z) * pc.math.RAD_TO_DEG, 0);
};

DontSplashManager.prototype.monsterMouth = function (m) {
    if (!m || !m.e) return null;
    if (m.mouth === undefined) {
        m.mouth = null;
        var names = DontSplashManager.MONSTER_MOUTH;
        for (var i = 0; i < names.length && !m.mouth; i++) m.mouth = m.e.findByName(names[i]);
    }
    return m.mouth;
};

// Yakalanınca (birinci/üçüncü şahıs fark etmez) sinematik: siyah bantlar, kamera yandan,
// kendi karakterini canavarın eline alınıp ağzına atılırken izlersin. Dirilince oyun kamerasına döner.
DontSplashManager.prototype.eatCamera = function () {
    var m = this.holdMonster, t = this.eatT;
    var on = this.caught && m && t !== undefined && t !== null && this.ctrl && this.ctrl.body;
    if (!on) { if (this.cine) this.endDeathCine(); return; }
    var cam = this.camEntity || (this.camEntity = this.app.root.findByName('Camera'));
    var mouth = this.monsterMouth(m);
    if (!cam || !mouth) return;
    var E = DontSplashManager.EAT;
    var ss = function (a) { a = pc.math.clamp(a, 0, 1); return a * a * (3 - 2 * a); };
    var c = this.cine || this.startDeathCine(cam, m);
    var dt = pc.math.clamp(t - c.lastT, 0, 0.1);
    c.lastT = t;
    // bakılan nokta: eldeki karakterle ağzın arası, yutulunca ağız; yeme bitince sabit kalır
    var body = this.ctrl.body.getPosition(), mo = mouth.getPosition();
    var tgt = new pc.Vec3();
    if (t > E.inMouth) tgt.copy(mo);
    else tgt.lerp(body, mo, t < E.grab ? 0.25 : 0.5);
    if (t < E.len) c.look.lerp(c.look, tgt, 1 - Math.exp(-dt * 5));
    else {
        // yeme bitti: kamera yerinde kalır, uzaklaşan canavarı gözüyle takip eder
        if (!c.endPos) c.endPos = (c.pos || cam.getPosition()).clone();   // sekme arkadayken hiç çizilmediyse c.pos yok
        var mpe = m.e.getPosition();
        c.endLook = c.endLook || c.look.clone();
        c.endLook.lerp(c.endLook, new pc.Vec3(mpe.x, Math.max(mpe.y + 2, this.waterLevel + 1), mpe.z), 1 - Math.exp(-dt * 2));
    }
    // yandan, biraz önden ve yukarıdan; yavaşça yaklaşır
    var dist = 14 - 4 * ss(t / E.inMouth) - 1.5 * ss((t - E.inMouth) / 1.5);
    var pos = c.look.clone()
        .add(c.side.clone().mulScalar(dist))
        .add(c.fwd.clone().mulScalar(dist * 0.45));
    pos.y += 2.2 + dist * 0.12;
    pos.x = pc.math.clamp(pos.x, -57, 57);
    pos.y = Math.max(pos.y, this.waterLevel + 1.2);
    // oyun kamerasından yumuşak geçiş
    var b = ss(t / 0.45);
    var look = c.look.clone();
    if (b < 1) { pos.lerp(c.fromPos, pos, b); look.lerp(c.fromLook, look, b); }
    if (c.endPos) { pos.copy(c.endPos); look.copy(c.endLook); }
    c.pos = pos.clone();
    // tutunca ve yutunca sarsıntı
    var sh = 0;
    if (t > E.grab) sh += 0.22 * Math.max(0, 1 - (t - E.grab) / 0.4);
    if (t > E.inMouth) sh += 0.32 * Math.max(0, 1 - (t - E.inMouth) / 0.5);
    if (sh > 0) { pos.x += (Math.random() - 0.5) * sh; pos.y += (Math.random() - 0.5) * sh; pos.z += (Math.random() - 0.5) * sh; }
    cam.setPosition(pos);
    cam.lookAt(look);
    // siyah bantlar
    var barH = 80 * ss(t / 0.4);
    if (c.barTop) { c.barTop.element.height = barH; c.barBot.element.height = barH; }
};

DontSplashManager.prototype.startDeathCine = function (cam, m) {
    var c = { lastT: this.eatT || 0 };
    var p = this.caughtPos || this.player.getPosition();
    var mp = m.e.getPosition();
    // canavardan oyuncuya yön; kamera hangi yanda olursa salonun ortasına (duvardan uzağa) düşer
    c.fwd = new pc.Vec3(p.x - mp.x, 0, p.z - mp.z);
    if (c.fwd.lengthSq() < 0.01) c.fwd.set(0, 0, 1);
    c.fwd.normalize();
    c.side = new pc.Vec3(c.fwd.z, 0, -c.fwd.x);
    if (Math.abs(p.x + c.side.x * 10) > Math.abs(p.x - c.side.x * 10)) c.side.mulScalar(-1);
    c.fromPos = cam.getPosition().clone();
    c.fromLook = c.fromPos.clone().add(cam.forward.clone().mulScalar(10));
    c.look = new pc.Vec3().lerp(p, mp, 0.3);
    c.look.y = p.y + 1.5;
    // birinci şahıs: kol/eşya (kameraya bağlı) gizlenir, kendi karakterin görünür
    c.hand = cam.findByName('DsHand');
    c.handWas = c.hand ? c.hand.enabled : false;
    if (c.hand) c.hand.enabled = false;
    c.shown = [];
    var pcn = this.ctrl;
    if (this.app.isFPS && pcn) {
        ['playerRendererEntity', 'faceSprite', 'mainSkins'].forEach(function (k) {
            var e = pcn[k];
            if (e && !e.enabled) { e.enabled = true; c.shown.push(e); }
        });
    }
    // bantlar (menüden önce çizilsin diye GameUI'nin en başına)
    var ui = this.app.root.findByName('GameUI');
    if (ui) {
        if (!this.cineBars) {
            var mk = function (name, ay, py) {
                var e = new pc.Entity(name);
                e.addComponent('element', { type: 'image', anchor: new pc.Vec4(0, ay, 1, ay), pivot: new pc.Vec2(0.5, py), margin: new pc.Vec4(0, 0, 0, 0), height: 0, color: new pc.Color(0, 0, 0), opacity: 1, useInput: false });
                ui.insertChild(e, 0);
                return e;
            };
            this.cineBars = [mk('DsCineTop', 1, 1), mk('DsCineBot', 0, 0)];
        }
        c.barTop = this.cineBars[0]; c.barBot = this.cineBars[1];
        c.barTop.enabled = c.barBot.enabled = true;
        c.barTop.element.height = c.barBot.element.height = 0;
    }
    this.cine = c;
    return c;
};

DontSplashManager.prototype.endDeathCine = function () {
    var c = this.cine;
    this.cine = null;
    if (!c) return;
    if (c.hand && !c.hand._destroyed) c.hand.enabled = c.handWas;
    if (this.app.isFPS) c.shown.forEach(function (e) { if (e && !e._destroyed) e.enabled = false; });
    if (c.barTop) { c.barTop.enabled = false; c.barBot.enabled = false; }
};

DontSplashManager.prototype.faceCamera = function (target, dt) {
    var cam = this.camEntity || (this.camEntity = this.app.root.findByName('Camera'));
    var sc = cam && cam.script;
    // telefonda dönen kamera mobileCameraController (cameraController orada kapalı)
    var c = sc && (sc.mobileCameraController && sc.mobileCameraController.enabled && sc.mobileCameraController.eulers ? sc.mobileCameraController : sc.cameraController);
    if (!c || !c.eulers) return;
    var p = this.player.getPosition();
    var yaw = Math.atan2(target.x - p.x, target.z - p.z) * pc.math.RAD_TO_DEG;
    var k = Math.min(1, (dt || 0.016) * 4);
    var d = ((yaw - c.eulers.x + 540) % 360) - 180;
    c.eulers.x += d * k;
    // eğim: hedefe (eldeki karakter / ağız) bakacak kadar yukarı
    var cp = cam.getPosition();
    var pitch = pc.math.clamp(-Math.atan2(target.y - cp.y, Math.max(1, Math.hypot(target.x - cp.x, target.z - cp.z))) * pc.math.RAD_TO_DEG, -45, 10);
    c.eulers.y += (pitch - c.eulers.y) * k;
};

DontSplashManager.prototype.releaseBody = function (body) {
    if (!body || body._destroyed) return;
    body.setLocalPosition(0, -1, 0);
    if (body._dsBaseScale !== undefined) { var b = body._dsBaseScale; body.setLocalScale(b, b, b); }
};

DontSplashManager.prototype.updateHold = function (dt) {
    if (this.caught && this.holdMonster && this.holdHand && this.ctrl && this.ctrl.body) {
        // Oyuncu (kamera) yakalandığı yerde kalır, kamera yumuşakça canavara döner; model elde, sonra ağızda
        this.eatT = (this.eatT || 0) + dt;
        var body = this.ctrl.body;
        if (!this.eatFrom) this.eatFrom = body.getPosition().clone();
        var mo = this.monsterMouth(this.holdMonster);
        // üçüncü şahısta kamera önce canavara, tutulunca eldeki karaktere, sonra ağza bakar
        var look = this.holdMonster.e.getPosition().clone().add(new pc.Vec3(0, 3, 0));
        if (this.eatT > DontSplashManager.EAT.reach && mo) look = this.eatT > DontSplashManager.EAT.toMouth ? mo.getPosition() : body.getPosition().clone().add(new pc.Vec3(0, 1, 0));
        this.faceCamera(look, dt);
        if (this.eatT >= DontSplashManager.EAT.reach || !this.monsterMouth(this.holdMonster)) this.holdBodyAt(body, this.holdHand, this.holdMonster, this.eatT, this.eatFrom);
        this.holdingBody = body;
    } else if (this.holdingBody) {
        this.releaseBody(this.holdingBody);
        this.holdingBody = null;
        this.eatT = null; this.eatFrom = null; this.eatCamFrom = null;
    }
    var rh = this.remoteHolds;
    if (!rh) return;
    for (var sid in rh) {
        var r = rh[sid];
        var body = r.rc && r.rc.playerBody;
        if (!body || body._destroyed || this.time > r.until) { this.releaseBody(body); delete rh[sid]; continue; }
        var rt = this.time - r.t0;
        if (!r.from) r.from = body.getPosition().clone();
        if (rt >= DontSplashManager.EAT.reach || !this.monsterMouth(r.m)) this.holdBodyAt(body, this.monsterHand(r.m), r.m, rt, r.from);
    }
};

// Sunucu: başka bir oyuncu bir canavara yakalandı -> o oyuncunun modeli bende de o canavarın elinde
DontSplashManager.prototype.onRemoteGrab = function (msg) {
    var room = this.app.room;
    if (!msg || !room || msg.s === room.sessionId) return;
    var m = this.monsters[msg.m];
    var rps = this.app.network && this.app.network.remotePlayers;
    var w = rps && rps[msg.s];
    var rc = w && w.entity && w.entity.script && w.entity.script.remotePlayerController;
    if (!m || !rc) return;
    if (!this.remoteHolds) this.remoteHolds = {};
    // yerel oyuncu bu canavarın ağzında değilse: canavar uzaktaki oyuncuyu yer
    if (!(this.caught && this.holdMonster === m)) {
        var bp = rc.playerBody ? rc.playerBody.getPosition() : rc.entity.getPosition();
        m.vis.rot = Math.atan2(bp.x - m.vis.x, bp.z - m.vis.z) * pc.math.RAD_TO_DEG;
        this.placeForEat(m, bp);
        m.eatUntil = this.time + DontSplashManager.EAT.len;
    }
    this.remoteHolds[msg.s] = { rc: rc, m: m, t0: this.time, until: this.time + DontSplashManager.EAT.menu + 0.6 };
};

// Canavar sana doğru koşarken ekran kenarları kararır
DontSplashManager.prototype.updateVignette = function (dt) {
    if (!this.vignette) return;
    var S = DontSplashManager.STATE;
    var pp = this.player.getPosition();
    var target = 0;
    for (var i = 0; i < this.monsters.length; i++) {
        var m = this.monsters[i];
        var d = Math.hypot(m.vis.x - pp.x, m.vis.z - pp.z);
        if (m.state === S.HUNT && d < 80 && Math.hypot(m.tx - pp.x, m.tz - pp.z) < 18) target = Math.max(target, 0.3 + 0.45 * (1 - d / 80));
        else if (m.state === S.SEARCH && d < 20) target = Math.max(target, 0.25);
    }
    if (this.caught) target = 0.8;
    if (this.finished) target = 0;
    var k = Math.min(1, dt * (target > this.vignetteAlpha ? 4 : 1.5));
    this.vignetteAlpha += (target - this.vignetteAlpha) * k;
    this.vignette.element.opacity = this.vignetteAlpha;
    var on = this.vignetteAlpha > 0.01;
    if (this.vignette.enabled !== on) this.vignette.enabled = on;
};

DontSplashManager.prototype.flash = function (color, alpha) {
    if (!this.overlay) return;
    this.overlay.element.color = color;
    this.overlayTarget = alpha;
};

DontSplashManager.prototype.formatTime = function (t) {
    t = Math.max(0, t);
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
};

DontSplashManager.prototype.updateHud = function (dt) {
    var ui = this.app.ui;
    if (!this.overlay) return;
    var k = Math.min(1, dt * (this.overlayTarget > this.overlayAlpha ? 8 : 3));
    this.overlayAlpha += (this.overlayTarget - this.overlayAlpha) * k;
    this.overlay.element.opacity = this.overlayAlpha;
    this.overlay.enabled = this.overlayAlpha > 0.003;
};

// ---------------------------------------------------------------- AĞ
DontSplashManager.prototype.sendNet = function (type, msg) {
    var room = this.app.room;
    if (room && room.name === 'DontSplash') {
        try { room.send(type, msg); } catch (e) { }
    }
};

DontSplashManager.prototype.setupNetwork = function () {
    this.boundRoom = null;
};

DontSplashManager.prototype.bindRoom = function () {
    var room = this.app.room;
    if (!room || room === this.boundRoom || room.name !== 'DontSplash') return;
    this.unbindRoom();
    this.boundRoom = room;
    var self = this;
    this.roomHandlers = [
        room.onMessage('Server:DS:Splash', function (msg) {
            // Başka oyuncunun sıçraması: efekt + mesafeye göre ses
            var p = new pc.Vec3(msg.x, self.waterLevel, msg.z);
            var d = p.distance(self.player.getPosition());
            if (self.fxVisibleAt(p)) self.spawnSplashFx(p, msg.big ? 1 : 0.4);
            if (d < 60) self.play(msg.big ? 'splash' : 'noise', (msg.big ? 0.8 : 0.3) * (1 - d / 60));
        }),
        room.onMessage('Server:DS:Caught', function (msg) {
            if (msg.session === room.sessionId) self.onCaught(msg.m);
        }),
        room.onMessage('Server:DS:Bat', function (msg) { self.onBatHit(msg); }),
        room.onMessage('Server:DS:Grab', function (msg) { self.onRemoteGrab(msg); }),
        // Başka oyuncu sopa savurdu: savurma sesi onun yerinden
        room.onMessage('Server:DS:Swing', function (msg) {
            var rps = self.app.network && self.app.network.remotePlayers;
            var w = msg && rps && rps[msg.s];
            if (!w || !w.entity) return;
            var v = Math.max(0, 1 - w.entity.getPosition().distance(self.player.getPosition()) / 40);
            if (v > 0) self.playP('swoosh', v, 0.8, 1.2);
        })
    ];
    if (this.inWater && this.netMode() === 1) this.sendNet('Client:DS:InWater', { v: true });
};

DontSplashManager.prototype.unbindRoom = function () {
    if (this.roomHandlers) this.roomHandlers.forEach(function (off) { if (typeof off === 'function') off(); });
    this.roomHandlers = null;
    this.boundRoom = null;
};

// Odalar duvarla ayrı: sadece bulunduğun oda, bir önceki ve sonraki iki oda çizilir (kapılardan görünenler)
DontSplashManager.prototype.updateRoomCulling = function () {
    var R = DontSplashManager.ROOMS;
    var z = this.player.getPosition().z;
    var cur = 0;
    for (var i = 0; i < R.length; i++) if (z >= R[i].z0 - 8) cur = i;
    this.cullTimer = (this.cullTimer || 0) - 1;
    if (cur === this.cullRoom && this.cullTimer > 0) return;
    this.cullRoom = cur;
    this.cullTimer = 30;   // yeni oluşan batch'ler için ara ara tekrar uygula
    var lo = cur === 0 ? -40 : R[cur - 1].z0 - 2;
    var hi = R[Math.min(R.length - 1, cur + 2)].z1 + 2;
    var apply = function (mi) {
        var c = mi.aabb.center.z, h = mi.aabb.halfExtents.z;
        mi.visible = c + h >= lo && c - h <= hi;
    };
    if (!this.cullRenders) {
        var monsters = this.entity.findByName('Monsters');
        this.cullRenders = this.entity.findComponents('render').filter(function (r) { return !monsters || !r.entity.isDescendantOf(monsters); });
    }
    for (var k = 0; k < this.cullRenders.length; k++) {
        var r = this.cullRenders[k];
        if (r.batchGroupId != null && r.batchGroupId !== -1) continue;
        var mis = r.meshInstances;
        for (var m = 0; m < mis.length; m++) apply(mis[m]);
    }
    var list = this.app.batcher && this.app.batcher._batchList;
    if (list) for (var b = 0; b < list.length; b++) if (list[b].meshInstance) apply(list[b].meshInstance);
};

// ---------------------------------------------------------------- DÖNGÜ
// Poki istatistiği: her bölüm bir seviye (start -> complete | fail), koşunun tamamı da ayrı (start -> complete)
// Bir deneme için tek sonuç gönderilir; yakalanınca 'fail', bölümün sonundaki zemine varınca 'complete'.
DontSplashManager.prototype.updateFunnel = function () {
    if (!window.pokiMeasure || this.finished || this.caught || this.app.dsIntroPlaying || !this.player) return;
    var S = DontSplashManager.SECTIONS, z = this.player.getPosition().z;
    if (this.funnel === undefined) this.funnel = -1;
    if (this.funnel >= 0 && z > S[this.funnel].z1) this.funnelEnd('complete');
    if (this.funnel >= 0) return;
    for (var k = 0; k < S.length; k++) {
        if (z > S[k].z0 && z < S[k].z1) {
            if (k === this.funnelDone) return;   // aynı bölüm az önce bitti (geri yürüdü)
            this.funnel = k;
            if (!this.runMeasured && k === 0) { this.runMeasured = true; window.pokiMeasure('level', 'dontsplash-run', 'start'); }
            window.pokiMeasure('level', 'ds-section-' + (k + 1), 'start');
            return;
        }
    }
};

DontSplashManager.prototype.funnelEnd = function (result) {
    if (this.funnel === undefined || this.funnel < 0) return;
    if (window.pokiMeasure) window.pokiMeasure('level', 'ds-section-' + (this.funnel + 1), result);
    this.funnelDone = result === 'complete' ? this.funnel : -1;
    this.funnel = -1;
};

DontSplashManager.prototype.update = function (dt) {
    this.hideForeignItems(dt);
    this.time += dt;
    if (!this.cameraFaced) {
        // Kamera parkura (+z) baksın
        this.cameraFaced = true;
        var cam = this.app.root.findByName('Camera');
        if (cam && cam.script) {
            // telefonda cameraController kapalı ve eulers'ı yok: burada hata verip tüm yöneticiyi durduruyordu
            if (cam.script.cameraController && cam.script.cameraController.eulers) cam.script.cameraController.eulers.x = 0;
            if (cam.script.mobileCameraController && cam.script.mobileCameraController.eulers) cam.script.mobileCameraController.eulers.x = 0;
        }
    }
    this.bindRoom();
    this.updateStart(dt);
    this.updateWater(dt);
    this.updateMovers();
    this.updateSinking(dt);
    if (!this.finished) this.updateSwim(dt);
    if (this.netMode() === 2) this.syncServerMonsters(dt);
    this.simulateMonsters(dt, this.serverMonsterCount());
    this.updateMonsterVisuals(dt);
    this.updateVignette(dt);
    this.updateDownMenu(dt);
    this.updateButtons(dt);
    this.updateShield();
    this.updateSplashFx(dt);
    this.updateItems(dt);
    this.updateHud(dt);
    this.updateFunnel();
    this.updateFloorCheckpoint();
    // Düşerse (harita dışı) son checkpoint'e dön
    if (this.player.getPosition().y < -20 && !this.caught) this.respawn();
};

// ---------------------------------------------------------------- EŞYALAR (çakıl / işaret fişeği) + İPUCU YAZISI
DontSplashManager.prototype.setupItemsUi = function () {
    var ui = this.app.root.findByName('GameUI');
    if (!ui || !this.fontAsset) return;
    this.itemsUi = new pc.Entity('DSItems');
    this.itemsUi.addComponent('element', { type: 'group', anchor: new pc.Vec4(0, 0, 1, 1), pivot: new pc.Vec2(0.5, 0.5), margin: new pc.Vec4(0, 0, 0, 0), useInput: false });
    ui.addChild(this.itemsUi);
    this.promptText = new pc.Entity('PromptText');
    this.promptText.addComponent('element', {
        type: 'text', fontAsset: this.fontAsset.id, text: '', fontSize: 36, color: new pc.Color(1, 1, 1),
        anchor: new pc.Vec4(0.5, 0, 0.5, 0), pivot: new pc.Vec2(0.5, 0.5), alignment: new pc.Vec2(0.5, 0.5), autoWidth: true, autoHeight: true,
        outlineColor: new pc.Color(0, 0, 0, 1), outlineThickness: 1, useInput: false
    });
    this.promptText.setLocalPosition(0, this.app.isMobile ? 430 : 215, 0);
    this.itemsUi.addChild(this.promptText);
    this.promptText.enabled = false;
    this.promptOwner = null;
    // Önceki oyundan kalan çakıl olmasın
    this.clearPebbles();
};

DontSplashManager.prototype.updateItemsUi = function () { };

// ---------------------------------------------------------------- ÇAKIL (oyunun envanteri ile)
DontSplashManager.prototype.pebbleSlot = function () {
    var inv = this.app.player && this.app.player.inventory;
    if (!inv) return null;
    for (var i = 0; i < inv.slots.length; i++) if (inv.slots[i].item && inv.slots[i].item.id === DontSplashManager.PEBBLE_ITEM) return inv.slots[i];
    return null;
};

// Bu moda özel eşyalar (çakıl, sopa, kanca, buz) kalıcı envantere kaydedilmez (sekme kapansa da diğer modlara geçmez).
// Diğer modların kayıtlı eşyaları (satın alınan güçlendirmeler: anahtar, ingiliz anahtarı, fişek tabancası...)
// bu modda işe yaramaz: hotbar'da gösterilmez ama kayıtta aynen kalır (DS'den çıkınca geri gelir).
DontSplashManager.DS_ITEMS = [40, 41, 42, 43];
DontSplashManager.prototype.hookInventorySave = function () {
    var inv = this.app.player && this.app.player.inventory;
    if (!inv || inv._dsSaveHooked) return;
    inv._dsSaveHooked = true;
    var orig = inv.saveData;
    var ids = DontSplashManager.DS_ITEMS;
    var app = this.app, self = this;
    inv.saveData = function () {
        orig.apply(this, arguments);
        if (!app.items || !app.items.list) return;
        var list = app.items.list.filter(function (i) { return ids.indexOf(i.id) < 0; });
        // gizlenen eşyalar kayıttan düşmesin
        var kept = self.keptItems || [];
        for (var k = 0; k < kept.length; k++) {
            if (!list.some(function (i) { return i.id === kept[k].id; })) list.push(kept[k]);
        }
        var same = list.length === app.items.list.length && list.every(function (i, n) { return app.items.list[n] === i; });
        if (!same) app.items.list = list;
    };
};

// Yabancı eşyaları envanterden (sadece görüntü) çıkar; kayıt keptItems ile korunur
DontSplashManager.prototype.hideForeignItems = function (dt) {
    var inv = this.app.player && this.app.player.inventory;
    if (!inv || !inv.slots || !inv.slots.length) return;
    var ids = DontSplashManager.DS_ITEMS;
    var foreign = null;
    for (var i = 0; i < inv.slots.length; i++) {
        var it = inv.slots[i].item;
        if (it && ids.indexOf(it.id) < 0) { foreign = it; break; }
    }
    if (!foreign) return;
    // simgesi yüklenmeden slot silinirse oyunun InventorySlot'u silinmiş slota doku atamaya çalışıp hata verir: yüklenmesini bekle
    var app = this.app;
    var pending = inv.slots.some(function (s) {
        var t = s.item && ids.indexOf(s.item.id) < 0 && s.item.texture != null ? app.assets.get(s.item.texture) : null;
        return t && !t.loaded;
    });
    this.foreignWait = (this.foreignWait || 0) + (dt || 0);
    if (pending && this.foreignWait < 10) return;   // en fazla 10 sn bekle
    this.hookInventorySave();
    if (!this.keptItems) this.keptItems = [];
    var src = (this.app.items && this.app.items.list) || [];
    var guard = 20;
    while (foreign && guard-- > 0) {
        var id = foreign.id;
        if (!this.keptItems.some(function (k) { return k.id === id; })) {
            var rec = src.find(function (r) { return r.id === id; });
            this.keptItems.push(rec ? { id: rec.id, amount: rec.amount } : { id: id, amount: foreign.amount });
        }
        inv.removeItem(id);
        foreign = null;
        for (var j = 0; j < inv.slots.length; j++) {
            var it2 = inv.slots[j].item;
            if (it2 && ids.indexOf(it2.id) < 0) { foreign = it2; break; }
        }
    }
};

// Her eşya envanterde ayrı slot (yığılmaz)
DontSplashManager.prototype.giveItem = function (id) {
    var inv = this.app.player && this.app.player.inventory;
    var db = this.app.itemDatabase;
    if (!inv || !db) return false;
    this.hookInventorySave();
    if (inv.slots.length >= inv.maxSlots) {
        this.app.fire('WarningTextController:setWarning', 'Your inventory reached its slot limit!', 3, new pc.Color(1, 0, 0, 1));
        return false;
    }
    var base = db.items.find(function (i) { return i.id === id; });
    if (!base) return false;
    var slot = inv.addSlot(Object.assign({}, base), 1);
    if (!slot) return false;
    slot.fire('Start');
    inv.saveData();
    return true;
};

DontSplashManager.prototype.givePebble = function () {
    return this.giveItem(DontSplashManager.PEBBLE_ITEM);
};

DontSplashManager.prototype.pebbleCount = function () {
    var inv = this.app.player && this.app.player.inventory;
    if (!inv) return 0;
    var n = 0;
    for (var i = 0; i < inv.slots.length; i++) if (inv.slots[i].item && inv.slots[i].item.id === DontSplashManager.PEBBLE_ITEM) n++;
    return n;
};

// Güvenli bölgelerdeki çakıl standı (reklam): çakılları MAX_PEBBLES'a tamamlar
DontSplashManager.prototype.fillPebbles = function () {
    var n = 0, guard = DontSplashManager.MAX_PEBBLES;
    while (this.pebbleCount() < DontSplashManager.MAX_PEBBLES && guard-- > 0 && this.givePebble()) n++;
    if (n) this.play('success', 0.6);
    return n;
};

DontSplashManager.prototype.hasItem = function (id) {
    var inv = this.app.player && this.app.player.inventory;
    return !!(inv && inv.slots.some(function (s) { return s.item && s.item.id === id; }));
};

// Sopa reklamla alınır, BAT_USES vuruş hakkı vardır (bitince kırılır, standdan yeniden alınır).
// Tek tane olur; varsa hakkı dolar ve seçilir.
DontSplashManager.prototype.giveBat = function () {
    var inv = this.app.player && this.app.player.inventory;
    if (!inv) return false;
    var ok = true;
    if (!this.hasItem(DontSplashManager.BAT_ITEM)) ok = this.giveItem(DontSplashManager.BAT_ITEM);
    if (!ok) return false;
    this.batUses = DontSplashManager.BAT_USES;
    var idx = inv.slots.findIndex(function (s) { return s.item && s.item.id === DontSplashManager.BAT_ITEM; });
    if (idx >= 0 && inv.selectSlot) inv.selectSlot(idx);
    this.updateBatLabel();
    return true;
};

DontSplashManager.prototype.batSlot = function () {
    var inv = this.app.player && this.app.player.inventory;
    if (!inv) return null;
    for (var i = 0; i < inv.slots.length; i++) if (inv.slots[i].item && inv.slots[i].item.id === DontSplashManager.BAT_ITEM) return inv.slots[i];
    return null;
};

// Sopanın kalan hakkı slotun altında çubuk olarak (Steal and Run envanterindeki Durability: siyah zemin, yeşil dolgu)
DontSplashManager.prototype.updateBatLabel = function () {
    var slot = this.batSlot();
    if (!slot || !slot.entity) return;
    var root = slot.entity.findByName('DsDurability');
    if (!root) {
        root = new pc.Entity('DsDurability');
        root.addComponent('element', { type: 'group', anchor: new pc.Vec4(0.5, 0, 0.5, 0), pivot: new pc.Vec2(0.5, 0.5), width: 68.35, height: 32, useInput: false });
        var bg = new pc.Entity('Bg');
        bg.addComponent('element', { type: 'image', anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5), pivot: new pc.Vec2(0.5, 0.5), width: 52, height: 6, color: new pc.Color(0, 0, 0), useInput: false });
        bg.setLocalPosition(0, 3.8, 0);
        var fill = new pc.Entity('Fill');
        fill.addComponent('element', { type: 'image', anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5), pivot: new pc.Vec2(0.5, 0.5), width: 50, height: 4, color: new pc.Color(0.5019607843137255, 1, 0), useInput: false });
        fill.setLocalPosition(0, 3.817, 0);
        root.addChild(bg);
        root.addChild(fill);
        slot.entity.addChild(root);
    }
    var p = pc.math.clamp((this.batUses || 0) / DontSplashManager.BAT_USES, 0, 1);
    var f = root.findByName('Fill');
    if (f && f.element) f.element.width = 50 * p;
};

// Bir savuruş birine değdiyse 1 hak gider (Steal and Run: Inventory:DamageCurrentItem, savuruş başına bir kez)
DontSplashManager.prototype.useBat = function () {
    this.batUses = Math.max(0, (this.batUses || 0) - 1);
    this.updateBatLabel();
    if (this.batUses > 0) return;
    var inv = this.app.player && this.app.player.inventory;
    var guard = 5;
    while (inv && this.hasItem(DontSplashManager.BAT_ITEM) && guard-- > 0) inv.removeItem(DontSplashManager.BAT_ITEM);
    this.app.fire('WarningTextController:setWarning', 'Your bat broke! Get a new one at the BAT stand.', 3, new pc.Color(1, 0.6, 0.2, 1));
};

DontSplashManager.prototype.clearPebbles = function () {
    try {
        var inv = this.app.player && this.app.player.inventory;
        var ids = [DontSplashManager.PEBBLE_ITEM, DontSplashManager.BAT_ITEM, 42, 43];
        for (var k = 0; k < ids.length; k++) {
            var guard = 20;
            while (inv && this.hasItem(ids[k]) && guard-- > 0) inv.removeItem(ids[k]);
        }
        if (this.app.items && this.app.items.list) {
            this.app.items.list = this.app.items.list.filter(function (i) { return ids.indexOf(i.id) < 0; });
        }
    } catch (e) { }
};

// ---------------------------------------------------------------- TAŞ GÖRÜNÜMÜ
// Küre yerine köşeli, düzensiz bir taş (bir kez üretilir, herkes paylaşır)
DontSplashManager.rockMesh = function (device) {
    var cache = DontSplashManager._rock;
    // sahne yeniden yüklenince (oda kur / katıl, lobiden tekrar gir) eski taşlar silinirken paylaşılan mesh de yok ediliyordu
    if (cache && cache.device === device && cache.mesh.vertexBuffer) return cache.mesh;
    var t = (1 + Math.sqrt(5)) / 2;
    var v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
    var f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    var norm = function (p) { var l = Math.hypot(p[0], p[1], p[2]); return [p[0] / l, p[1] / l, p[2] / l]; };
    v = v.map(norm);
    var mid = {};
    var midpoint = function (a, b) {
        var key = a < b ? a + '_' + b : b + '_' + a;
        if (mid[key] !== undefined) return mid[key];
        v.push(norm([(v[a][0] + v[b][0]) / 2, (v[a][1] + v[b][1]) / 2, (v[a][2] + v[b][2]) / 2]));
        mid[key] = v.length - 1;
        return mid[key];
    };
    var f2 = [];
    f.forEach(function (tr) {
        var a = midpoint(tr[0], tr[1]), b = midpoint(tr[1], tr[2]), c = midpoint(tr[2], tr[0]);
        f2.push([tr[0], a, c], [tr[1], b, a], [tr[2], c, b], [a, b, c]);
    });
    var rnd = DontSplashManager.random(1337);
    v = v.map(function (p) {
        var r = 0.5 * (0.8 + rnd() * 0.32);
        return [p[0] * r, p[1] * r * 0.82, p[2] * r];
    });
    var pos = [], nrm = [];
    f2.forEach(function (tr) {
        var A = v[tr[0]], B = v[tr[1]], C = v[tr[2]];
        var ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
        var wx = C[0] - A[0], wy = C[1] - A[1], wz = C[2] - A[2];
        var n = norm([uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx]);
        // dışa baksın
        if (n[0] * A[0] + n[1] * A[1] + n[2] * A[2] < 0) { var tmp = B; B = C; C = tmp; n = [-n[0], -n[1], -n[2]]; }
        [A, B, C].forEach(function (q) { pos.push(q[0], q[1], q[2]); nrm.push(n[0], n[1], n[2]); });
    });
    var mesh = new pc.Mesh(device);
    mesh.setPositions(pos);
    mesh.setNormals(nrm);
    mesh.update(pc.PRIMITIVE_TRIANGLES);
    mesh.incRefCount();   // önbellekteki mesh hiçbir zaman yok edilmesin
    DontSplashManager._rock = { device: device, mesh: mesh };
    return mesh;
};

// Bir render bileşenindeki küreyi taşa çevirir (malzeme korunur)
DontSplashManager.makeRock = function (render) {
    if (!render || render._dsRock) return;
    var mis = render.meshInstances;
    var mat = mis && mis[0] ? mis[0].material : null;
    if (!mat) return;
    render._dsRock = true;
    var mesh = DontSplashManager.rockMesh(pc.app.graphicsDevice);
    render.meshInstances = [new pc.MeshInstance(mesh, mat, render.entity)];
};

// Elindeki eşyayı (envanter sol eline koyar) sağ ele taşır: savurma/atma sağ kolla oynuyor.
// Uzak oyuncularda da aynı ele gider.
DontSplashManager.moveToRightHand = function (entity) {
    var hand = null;
    for (var e = entity.parent; e; e = e.parent) {
        if (e.script && e.script.remotePlayerController) { hand = e.script.remotePlayerController.rightHand; break; }
        if (e.script && e.script.playerController) { hand = pc.app.player && pc.app.player.interact && pc.app.player.interact.rightHand; break; }
    }
    if (!hand || entity.parent === hand) return !!hand;
    entity.reparent(hand);
    return true;
};

// Platformlardaki taş yığınları: üstüne gelince alınır, bir süre sonra yeniden çıkar
DontSplashManager.prototype.setupPickups = function () {
    var self = this;
    this.piles = this.entity.findByTag('DSPebblePile').map(function (e) {
        var pile = { e: e, active: true, t: 0, trig: e.findByName('Trigger') };
        if (pile.trig && pile.trig.collision) {
            pile.trig.collision.on('triggerenter', function (other) {
                if (other !== self.player || !pile.active || self.caught) return;
                if (!self.givePebble()) return;
                pile.active = false;
                pile.t = 25;
                e.children.forEach(function (c) { if (c.render) c.enabled = false; });
                self.play('click', 0.7);
            });
        }
        return pile;
    });
};

DontSplashManager.prototype.updatePickups = function (dt) {
    if (!this.piles) return;
    for (var i = 0; i < this.piles.length; i++) {
        var p = this.piles[i];
        if (p.active) continue;
        p.t -= dt;
        if (p.t <= 0) { p.active = true; p.e.children.forEach(function (c) { if (c.render) c.enabled = true; }); }
    }
};

// Odalar ipucu göstermek için kullanır (ör. "Hold E")
DontSplashManager.prototype.setPrompt = function (owner, text) {
    if (!this.promptText) return;
    if (text) {
        this.promptOwner = owner;
        if (this.promptText.element.text !== text) this.promptText.element.text = text;
        this.promptText.enabled = true;
    } else if (this.promptOwner === owner) {
        this.promptOwner = null;
        this.promptText.enabled = false;
    }
};

DontSplashManager.prototype.isUseHeld = function () {
    return this.mobileUse || (this.app.keyboard && this.app.keyboard.isPressed(pc.KEY_E));
};

// Envanterdeki çakıl eşyası sol tıkta bunu çağırır; atıldıysa true döner
// onRelease: taş elden çıktığı an (envanterden o zaman düşülür)
DontSplashManager.prototype.throwPebble = function (onRelease) {
    if (this.caught || this.finished) return false;
    if (this.time - (this.lastThrow || -10) < 0.6) return false;
    this.lastThrow = this.time;
    // Savurma animasyonu oyunun vuruş sesini (Player/hit) çalar: çakıl atarken susturulur
    this.muteHitSound(0.9);
    // Oyunun vuruş (savurma) animasyonu: sağ kol savurur, taş savurmanın ortasında elden çıkar
    var anim = this.ctrl && this.ctrl._animComponent;
    if (anim) anim.setBoolean('hit', true);
    var self = this;
    setTimeout(function () {
        if (!self.entity || self.entity._destroyed) return;
        self.throwItem('pebble');
        if (onRelease) onRelease();
    }, 220);
    setTimeout(function () { if (anim) anim.setBoolean('hit', false); }, 500);
    return true;
};

DontSplashManager.prototype.muteHitSound = function (sec) {
    var snd = this.player && this.player.sound;
    var slot = snd && snd.slot('hit');
    if (!slot) return;
    if (!slot.play._dsMute) {   // başka bir script play'i yeniden sarmış olabilir: sarmalayıcı yoksa yeniden tak
        var orig = slot.play;
        var muted = function () {
            if (performance.now() < (slot._dsMuteUntil || 0)) return null;
            return orig.apply(slot, arguments);
        };
        muted._dsMute = true;
        slot.play = muted;
    }
    slot._dsMuteUntil = performance.now() + sec * 1000;
};

// ---------------------------------------------------------------- SOPA (diğer oyuncuları iter)
DontSplashManager.prototype.swingBat = function () {
    if (this.caught || this.finished || this.isRolling()) return false;
    // Steal and Run: güvenli bölgede vurulmaz, uyarı çıkar
    if (this.inSafeZone(this.player.getPosition())) { this.safeZoneWarning(); return false; }
    if (this.time - (this.lastSwing || -10) < DontSplashManager.BAT_COOLDOWN) return false;
    this.lastSwing = this.time;
    // Steal and Run: üst gövde Hit animasyonuna 0.1 sn geçişle girer ("hit" ağ üzerinden diğerlerine de gider)
    var anim = this.ctrl && this.ctrl._animComponent;
    if (anim) {
        anim.setBoolean('hit', true);
        var up = anim.findAnimationLayer && anim.findAnimationLayer('UpBody');
        if (up) up.transition('Hit', 0.1);
    }
    this.playP('swoosh', 1, 0.9, 1.1);
    if (this.serverVer() >= 6) this.sendNet('Client:DS:Swing', {});
    // Vuruş, savurma animasyonundaki hitEvent anında (0.5 sn) yapılır; olay gelmezse yedek zamanlayıcı
    var id = this.swingId = (this.swingId || 0) + 1;
    this.pendingHit = id;
    var self = this;
    setTimeout(function () {
        if (!self.entity || self.entity._destroyed || self.pendingHit !== id) return;
        self.pendingHit = 0;
        self.batHit();
    }, 650);
    // "hit" kapanınca üst gövde hemen Idle'a geçer: savurma sonuna kadar oynasın diye animasyon bitene kadar açık
    // kalır (yeni savuruş eski zamanlayıcıyı iptal eder)
    var sw = this.app.assets.get(typeof DsBatItem !== 'undefined' ? DsBatItem.SWING_ANIM : 0);
    var dur = sw && sw.resource && sw.resource.duration ? sw.resource.duration : 1.07;
    clearTimeout(this.hitOffTimer);
    this.hitOffTimer = setTimeout(function () { if (anim) anim.setBoolean('hit', false); }, Math.max(500, (dur - 0.05) * 1000));
    return true;
};

DontSplashManager.prototype.onHitEvent = function () {
    if (!this.pendingHit) return;
    this.pendingHit = 0;
    this.batHit();
};

// Steal and Run'daki gibi: menzildeki (4 m) bütün oyunculara vurur, itme yönü vuranın baktığı yön
DontSplashManager.prototype.batHit = function () {
    if (this.caught || this.finished) return false;
    var me = this.player.getPosition();
    if (this.inSafeZone(me)) { this.safeZoneWarning(); return false; }
    var body = this.ctrl && this.ctrl.body;
    var fw = body ? body.forward.clone().mulScalar(-1) : this.player.forward.clone();
    fw.y = 0;
    if (fw.lengthSq() < 0.0001) fw.set(0, 0, 1);
    fw.normalize();
    var rps = this.app.network && this.app.network.remotePlayers;
    if (!rps) return false;
    var any = false;
    for (var key in rps) {
        var r = rps[key] && rps[key].entity;
        var rc = r && r.script && r.script.remotePlayerController;
        if (!rc || r._destroyed || !r.enabled) continue;
        if (me.distance(r.getPosition()) > DontSplashManager.BAT_RANGE) continue;
        if (this.inSafeZone(r.getPosition())) continue;      // güvenli bölgedekine vurulmaz
        if (this.isRolling(rc.playerBody)) continue;
        any = true;
        if (this.serverVer() >= 4) this.sendNet('Client:DS:Bat', { t: rc.sessionId || key, dx: +fw.x.toFixed(3), dz: +fw.z.toFixed(3) });
    }
    if (any) this.useBat();
    return any;
};

// Sunucu herkese yayar. Vurulan bizsek: "oof" + vuruş efekti + yuvarlanma (1.5 sn, 10 m/sn).
// Başkasıysa onun karakterinde aynı efekt, ses ve yuvarlanma.
DontSplashManager.prototype.onBatHit = function (msg) {
    if (!msg || !isFinite(msg.dx) || !isFinite(msg.dz)) return;
    var room = this.app.room;
    var me = !msg.t || (room && msg.t === room.sessionId);
    var l = Math.hypot(msg.dx, msg.dz) || 1;
    var dx = msg.dx / l, dz = msg.dz / l;
    if (!me) {
        var rps = this.app.network && this.app.network.remotePlayers;
        var w = rps && rps[msg.t];
        var re = w && w.entity;
        var rc = re && re.script && re.script.remotePlayerController;
        if (!re || re._destroyed || !rc) return;
        var p = re.getPosition();
        this.hitFx(p);
        var v = Math.max(0, 1 - p.distance(this.player.getPosition()) / 40);
        if (v > 0) { this.playP('punch', 0.5 * v, 0.8, 1.2); this.playP('oof', v, 1, 1.1); }
        if (rc.playerBody) this.startRoll(rc.playerBody, dx, dz, rc);
        return;
    }
    if (this.caught || this.finished || this.shieldActive()) return;
    this.playP('oof', 1, 1, 1.1);
    this.playP('punch', 0.5, 0.9, 1.1);
    this.hitFx(this.player.getPosition());
    var P = DontSplashManager.BAT_PUSH;
    this.rollMove = { vx: dx * P, vz: dz * P, started: false };
    if (this.ctrl && this.ctrl.body) this.startRoll(this.ctrl.body, dx, dz, null);
};

// Steal and Run'daki HitFx: oyuncunun üstünde kısa, beyaz çizgiler (5 parçacık, 0.12 sn)
DontSplashManager.prototype.hitFx = function (pos) {
    if (!this.hitFxPool) this.hitFxPool = [];
    var fx = this.hitFxPool.find(function (f) { return !f.busy; });
    if (!fx) {
        var tex = this.app.assets.get(DontSplashManager.DUST_TEX);
        if (tex && !tex.loaded) this.app.assets.load(tex);
        var e = new pc.Entity('HitFx');
        e.addComponent('particlesystem', {
            autoPlay: false, loop: false, numParticles: 5, lifetime: 0.12, rate: 0, rate2: 0,
            startAngle: 0, startAngle2: 360, lighting: false, depthWrite: false,
            blendType: pc.BLEND_ADDITIVE, stretch: 20, alignToMotion: false,
            emitterShape: pc.EMITTERSHAPE_SPHERE, emitterRadius: 1, emitterRadiusInner: 0, initialVelocity: 0,
            orientation: pc.PARTICLEORIENTATION_SCREEN, localSpace: false,
            localVelocityGraph: new pc.CurveSet([[0, 0], [0, 0], [0, 0]]),
            localVelocityGraph2: new pc.CurveSet([[0, 0], [0, 0], [0, 0]]),
            velocityGraph: new pc.CurveSet([[0, 0], [0, 0], [0, 0]]),
            velocityGraph2: new pc.CurveSet([[0, 0], [0, 0], [0, 0]]),
            radialSpeedGraph: new pc.Curve([0, -0.25, 0.4627906976744186, -0.5, 1, -0.3125]),
            radialSpeedGraph2: new pc.Curve([0, -0.25, 0.4627906976744186, -0.5, 1, -0.3125]),
            scaleGraph: new pc.Curve([0, 0.0863217463058783, 0.14186046511627906, 0.30625, 1, 0]),
            scaleGraph2: new pc.Curve([0, 0.0863217463058783, 0.14186046511627906, 0.30625, 1, 0]),
            colorGraph: new pc.CurveSet([[1, 1], [1, 1], [1, 1]]),
            alphaGraph: new pc.Curve([0, 1]),
            alphaGraph2: new pc.Curve([0, 1]),
            colorMapAsset: tex ? tex.id : null
        });
        this.app.root.addChild(e);
        fx = { e: e, busy: false };
        this.hitFxPool.push(fx);
    }
    fx.busy = true;
    fx.e.enabled = true;
    fx.e.setPosition(pos.x, pos.y + 0.62, pos.z);
    fx.e.particlesystem.reset();
    fx.e.particlesystem.play();
    setTimeout(function () { fx.busy = false; }, 400);
};

// Yuvarlanma (Steal and Run'daki roll): karakter top gibi kıvrılır (Roll animasyonu) ve itildiği yön
// ekseninde döner. Dönüş hızı orada fizikteki gibi: 6 rad/sn, 0.7 sönümle. 1.5 sn sonra kalkar.
DontSplashManager.prototype.startRoll = function (body, dx, dz, rc) {
    if (!this.rolls) this.rolls = [];
    var anim = rc ? body.anim : (this.ctrl && this.ctrl._animComponent);
    this.assignRollAnim(anim);
    var axis = new pc.Vec3(dx, 0, dz).normalize();
    for (var i = 0; i < this.rolls.length; i++) {
        if (this.rolls[i].body === body) { this.rolls[i].t = 0; this.rolls[i].axis = axis; return; }
    }
    this.rolls.push({ body: body, rc: rc, anim: anim, t: 0, axis: axis });
    if (anim) anim.setBoolean('isRolling', true);
};

DontSplashManager.prototype.assignRollAnim = function (anim) {
    if (!anim || anim._dsRoll) return;
    var a = this.app.assets.get(DontSplashManager.ROLL_ANIM);
    if (!a) return;
    var done = function () {
        if (anim._dsRoll || !a.resource) return;
        try {
            anim.assignAnimation('Roll', a.resource, 'Base');
            anim.assignAnimation('Roll', a.resource, 'UpBody');
            anim._dsRoll = true;
        } catch (e) { }
    };
    if (a.loaded) done(); else { a.ready(done); this.app.assets.load(a); }
};

DontSplashManager.prototype.isRolling = function (body) {
    body = body || (this.ctrl && this.ctrl.body);
    if (!this.rolls || !body) return false;
    for (var i = 0; i < this.rolls.length; i++) if (this.rolls[i].body === body) return true;
    return false;
};

DontSplashManager.prototype.endRoll = function (r) {
    var b = r.body;
    if (b && !b._destroyed) {
        b.setLocalPosition(0, -1, 0);
        if (r.base) b.setRotation(r.base);
    }
    if (r.anim) r.anim.setBoolean('isRolling', false);
    if (!r.rc) this.rollMove = null;
};

DontSplashManager.prototype.applyRolls = function (dt, remoteOnly) {
    if (!this.rolls || !this.rolls.length) return;
    var T = DontSplashManager.ROLL_TIME, K = -Math.log(1 - DontSplashManager.ROLL_DAMP), S = DontSplashManager.ROLL_SPIN;
    var q = new pc.Quat(), v = new pc.Vec3();
    for (var i = this.rolls.length - 1; i >= 0; i--) {
        var r = this.rolls[i];
        if (!!r.rc !== !!remoteOnly) continue;
        var b = r.body;
        if (!b || b._destroyed || (!r.rc && this.caught)) { this.endRoll(r); this.rolls.splice(i, 1); continue; }
        // Taban yön: uzak oyuncuda kontrolcünün hedeflediği yön, yerelde kontrolcünün yazdığı yön
        if (r.rc) {
            r.base = (r.base || new pc.Quat()).setFromEulerAngles(0, (r.rc.yRot || 0) + (r.rc.yRotOffset || 0), 0);
            if (b.parent) r.base = b.parent.getRotation().clone().mul(r.base);
        } else if (this.ctrl && this.ctrl._quatLerp) {
            r.base = this.ctrl._quatLerp.clone();
        } else if (!r.base) {
            r.base = b.getRotation().clone();
        }
        r.t += dt;
        if (r.t >= T) { this.endRoll(r); this.rolls.splice(i, 1); continue; }
        var ang = S / K * (1 - Math.exp(-K * r.t));            // rad
        q.setFromAxisAngle(r.axis, ang * pc.math.RAD_TO_DEG);
        b.setRotation(new pc.Quat().mul2(q, r.base));
        // Orada top (küre) çarpışması karakteri 0.68 m'ye indirir; model o merkezin etrafında döner
        var c = b.parent.getPosition();
        q.transformVector(new pc.Vec3(0, -1, 0), v);
        b.setPosition(c.x + v.x, c.y - 0.32 + v.y, c.z + v.z);
    }
};

DontSplashManager.remoteOf = function (body) {
    for (var e = body; e; e = e.parent) if (e.script && e.script.remotePlayerController) return e.script.remotePlayerController;
    return null;
};

DontSplashManager.prototype.postUpdate = function (dt) {
    this.applyRolls(dt, true);
    this.updateHold(dt);
    if (!this._eatCamHooked) {
        // kamera kontrolcüsünden sonra (çizimden hemen önce) uygulanır
        this._eatCamHooked = true;
        this.app.on('prerender', this.eatCamera, this);
        this.on('destroy', function () { this.app.off('prerender', this.eatCamera, this); }, this);
    }
};

DontSplashManager.prototype.throwItem = function (kind) {
    this.lastThrow = this.time;
    var cam = this.app.root.findByName('Camera');
    var dir = cam ? cam.forward.clone() : this.player.forward.clone();
    // Kamera aşağı bakıyorsa da ileri doğru atılsın
    dir.y = Math.max(dir.y, -0.25);
    dir.normalize();
    // Sağ elden çıkar (eldeki taş görünmez olur, uçan taş aynı yerden başlar)
    var hand = this.app.player && this.app.player.interact && this.app.player.interact.rightHand;
    var start = hand ? hand.getPosition().clone().add(new pc.Vec3(dir.x, 0, dir.z).normalize().mulScalar(0.3))
        : this.player.getPosition().clone().add(new pc.Vec3(0, 1.6, 0)).add(new pc.Vec3(dir.x, 0, dir.z).normalize().mulScalar(0.8));
    var vel = dir.mulScalar(26).add(new pc.Vec3(0, 8, 0));

    var e = new pc.Entity(kind === 'flare' ? 'Flare' : 'Pebble');
    e.addComponent('render', { type: kind === 'flare' ? 'cylinder' : 'sphere', castShadows: false, receiveShadows: false });
    var m = new pc.StandardMaterial();
    if (kind === 'flare') { m.diffuse = new pc.Color(0.9, 0.1, 0.05); m.emissive = new pc.Color(1, 0.25, 0.1); m.emissiveIntensity = 2; }
    else { m.diffuse = new pc.Color(0.35, 0.37, 0.4); }
    m.update();
    e.render.meshInstances[0].material = m;
    if (kind === 'flare') e.setLocalScale(0.25, 0.7, 0.25);
    else { DontSplashManager.makeRock(e.render); e.setLocalScale(0.3, 0.3, 0.3); }
    e.setPosition(start);
    this.app.root.addChild(e);
    this.projectiles.push({ e: e, kind: kind, pos: start.clone(), vel: vel, t: 0, mat: m });
    this.play('throw', 0.6);
};

DontSplashManager.prototype.updateItems = function (dt) {
    this.updatePickups(dt);
    for (var i = this.projectiles.length - 1; i >= 0; i--) {
        var p = this.projectiles[i];
        if (p.landed) {
            p.t += dt;
            if (p.kind === 'flare' && p.light) {
                var flick = Math.sin(p.t * 30) * 0.15 + Math.sin(p.t * 47) * 0.1;
                p.light.light.intensity = 3.5 * (1 + flick);
                if (p.glowMat) { p.glowMat.opacity = 0.5 + flick; p.glowMat.update(); }
                if (p.t > DontSplashManager.STUN_TIME) { if (p.fx) p.fx.destroy(); p.e.destroy(); this.projectiles.splice(i, 1); }
            } else if (p.t > 2) { p.e.destroy(); this.projectiles.splice(i, 1); }
            continue;
        }
        p.t += dt;
        var next = p.pos.clone().add(p.vel.clone().mulScalar(dt));
        p.vel.y -= 25 * dt;
        p.e.rotateLocal(400 * dt, 0, 200 * dt);
        // Katı bir yere çarptı mı (oyuncunun kendisi hariç)
        var hits = this.app.systems.rigidbody.raycastAll(p.pos, next);
        var hit = null;
        for (var h = 0; h < hits.length; h++) {
            if (hits[h].entity === this.player || hits[h].entity.isDescendantOf(this.player)) continue;
            if (hits[h].entity.collision && hits[h].entity.rigidbody) { hit = hits[h]; break; }
        }
        var w = this.waterAt(next);
        if (hit) {
            if (Math.abs(hit.normal.y) > 0.6) { this.land(p, hit.point, false); }
            else {
                // duvara çarptı: sek
                var n = hit.normal;
                var d = p.vel.dot(n);
                p.vel.sub(n.clone().mulScalar(2 * d)).mulScalar(0.4);
                next = hit.point.clone().add(n.clone().mulScalar(0.1));
            }
        } else if (next.y < w.level && Math.abs(next.x) < DontSplashManager.POOL_HALF) {
            this.land(p, new pc.Vec3(next.x, w.level, next.z), true);
        } else if (p.t > 6) {
            p.e.destroy(); this.projectiles.splice(i, 1); continue;
        }
        if (!p.landed) { p.pos.copy(next); p.e.setPosition(next); }
    }
};

DontSplashManager.prototype.land = function (p, point, inWater) {
    p.landed = true;
    p.t = 0;
    p.e.setPosition(point.x, point.y + (inWater ? 0.05 : 0.2), point.z);
    if (p.kind === 'pebble') {
        if (inWater) { this.lure(point); p.e.enabled = false; }
        else this.play('click', 0.5);
        return;
    }
    // İşaret fişeği: kırmızı ışık + yakındaki canavarı sersemletir
    this.play('flare', 0.8);
    var light = new pc.Entity('FlareLight');
    light.addComponent('light', { type: 'omni', color: new pc.Color(1, 0.25, 0.1), intensity: 3.5, range: 18, castShadows: false });
    // Parlayan kırmızı hale (uzaktan görünsün)
    var glow = new pc.Entity('FlareGlow');
    glow.addComponent('render', { type: 'sphere', castShadows: false, receiveShadows: false });
    var gm = new pc.StandardMaterial();
    gm.diffuse = new pc.Color(0, 0, 0); gm.emissive = new pc.Color(1, 0.3, 0.1); gm.useLighting = false;
    gm.blendType = pc.BLEND_ADDITIVE; gm.opacity = 0.55; gm.depthWrite = false; gm.update();
    glow.render.meshInstances[0].material = gm;
    glow.setLocalScale(1.4, 1.4, 1.4);
    var holder = new pc.Entity('FlareFx');
    holder.setPosition(point.x, point.y + 0.5, point.z);
    holder.addChild(light); holder.addChild(glow);
    this.app.root.addChild(holder);
    p.fx = holder; p.glowMat = gm;
    p.light = light;
    p.e.setLocalScale(0.25, 0.7, 0.25);
    var stunned = this.stunNear(point, 8);
    if (stunned) this.app.fire('WarningTextController:setWarning', 'Monster stunned!', 2, new pc.Color(1, 0.6, 0.2, 1));
};
