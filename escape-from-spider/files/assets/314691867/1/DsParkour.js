var DsParkour = pc.createScript('dsParkour');

// Parkur öğeleri (DSWorld üzerinde, dontSplashManager'dan sonra çalışır)
//  - DSCrumble: basınca titrer, sonra düşer; bir süre sonra yerine geri gelir
//  - DSMemTile (Mem_satır_sütun): hafıza köprüsü. Köprüden önceki zemine gelince doğru yol hemen sırayla yanar,
//    oyuncu zeminde durdukça yanık kalır, zeminden çıkınca (köprüye atlayınca) kısa süre sonra söner.
//    sonra söner. Yanlış karoya basınca karo düşer.
//  - Yüksek bloklar (Tall*) sadece geometri: sudan zıplayarak üstlerine çıkılamaz.
DsParkour.attributes.add('memLitMaterial', { type: 'asset', assetType: 'material' });
DsParkour.attributes.add('memWrongMaterial', { type: 'asset', assetType: 'material', description: 'Yanlış karo düşerken' });
DsParkour.attributes.add('crumbleDelay', { type: 'number', default: 0.55, description: 'Basıldıktan kaç sn sonra düşer' });
DsParkour.attributes.add('crumbleRespawn', { type: 'number', default: 3.5 });
DsParkour.attributes.add('memWrongDelay', { type: 'number', default: 0.35, description: 'Yanlış karo düşmeden önce titreme (sn): son anda kaçılabilir' });
DsParkour.attributes.add('memShowStep', { type: 'number', default: 0.22, description: 'Her satırın yanma aralığı (sn)' });
DsParkour.attributes.add('memShowHold', { type: 'number', default: 2.2, description: 'Oyuncu zeminden çıktıktan sonra yolun açık kalma süresi' });
// Hafıza köprüsü başlangıç alanı (bu kutuya girince yol gösterilir). MemStart varsa ona göre hesaplanır.
DsParkour.MEM_ZONE = { x0: -16.5, x1: 16.5, z0: 208.5, z1: 216 };

DsParkour.prototype.initialize = function () {
    var self = this;
    this.time = 0;
    this.blocks = [];
    this.entity.findByTag('DSCrumble').forEach(function (e) { self.blocks.push(self.makeBlock(e, 'crumble')); });

    // Hareketli bloklar (DSMover + DSAxisX/DSAxisZ + ampN + perN): yöneticinin kayan blok listesine eklenir,
    // böylece oyuncuyu üstünde taşır ve tüm oyuncularda aynı anda aynı yerde olur (Date.now'a bağlı)
    var ds0 = this.app.dontSplash;
    if (ds0 && ds0.sliders) {
        var k = 0;
        this.entity.findByTag('DSMover').forEach(function (e) {
            if (e.tags.has('DSSlider') || (!e.tags.has('DSAxisX') && !e.tags.has('DSAxisZ'))) return;
            var num = function (pre, def) {
                var t = e.tags.list().filter(function (x) { return x.indexOf(pre) === 0; })[0];
                var v = t ? parseFloat(t.slice(pre.length)) : NaN;
                return isFinite(v) ? v : def;
            };
            if (e.rigidbody) e.rigidbody.type = pc.BODYTYPE_KINEMATIC;
            ds0.sliders.push({ e: e, base: e.getLocalPosition().clone(), amp: num('amp', 4), period: num('per', 5), phase: (k++) * 1.9, axis: e.tags.has('DSAxisZ') ? 'z' : 'x' });
        });
    }

    this.memRows = [];
    this.entity.findByTag('DSMemTile').forEach(function (e) {
        var m = /^Mem_(\d+)_(\d+)$/.exec(e.name);
        if (!m) return;
        var b = self.makeBlock(e, 'mem');
        b.row = +m[1]; b.col = +m[2];
        if (!self.memRows[b.row]) self.memRows[b.row] = [];
        self.memRows[b.row][b.col] = b;
        self.blocks.push(b);
    });
    this.memCount = this.memRows.length;
    this.memCols = 0;
    this.memRows.forEach(function (r) { if (r) self.memCols = Math.max(self.memCols, r.length); });
    this.memSeed = null;
    this.showT = -1;
    this.lastShow = -100;
    this.inZone = false;
    this.showRow = -1;
    [this.memLitMaterial, this.memWrongMaterial].forEach(function (a) { if (a && !a.loaded) self.app.assets.load(a); });
    var ms = this.entity.findByName('MemStart');
    // köprüden önceki zeminin tamamı (çocuklar beklemeden atlıyor: zemine iner inmez gösterilsin)
    if (ms) { var mp = ms.getPosition(); this.memZone = { x0: mp.x - 45, x1: mp.x + 45, z0: mp.z - 13, z1: mp.z + 3.6 }; }
    else this.memZone = DsParkour.MEM_ZONE;
    if (this.memCount) { try { this.buildBanner(); } catch (e) { console.warn('memBanner', e); } }
    this.secZone = -1;
    this.secShown = {};
    try { this.buildSecBanner(); } catch (e) { console.warn('secBanner', e); }
    this.on('destroy', this.onDestroy, this);
};

DsParkour.prototype.makeBlock = function (e, kind) {
    if (e.rigidbody) e.rigidbody.type = pc.BODYTYPE_KINEMATIC;
    var p = e.getLocalPosition().clone();
    var mi = e.render && e.render.meshInstances[0];
    return { e: e, kind: kind, base: p, baseW: e.getPosition().clone(), state: 0, t: 0, y: p.y, vy: 0, lit: 0, off: 0, ov: 0, wasOn: false, wasShow: false,
        half: e.getLocalScale().x / 2 + 0.35, halfZ: e.getLocalScale().z / 2 + 0.35,
        normalMat: mi ? mi.material : null };
};

// ---------------------------------------------------------------- hafıza yolu
DsParkour.prototype.makePath = function (seed) {
    var rnd = DontSplashManager.random((seed >>> 0) + 911);
    var cols = this.memCols || 3, path = [];
    var c = Math.floor(rnd() * cols), run = 0;
    for (var r = 0; r < this.memCount; r++) {
        path.push(c);
        // sonraki: komşu ya da aynı sütun (çapraz atlanabilir), aynı sütunda en fazla 2 kez üst üste
        var opts = [];
        for (var d = -1; d <= 1; d++) {
            var n = c + d;
            if (n < 0 || n >= cols || (d === 0 && run >= 1)) continue;
            opts.push(n);
        }
        var nc = opts[Math.floor(rnd() * opts.length)];
        run = nc === c ? run + 1 : 0;
        c = nc;
    }
    this.path = path;
    for (var i = 0; i < this.memRows.length; i++) {
        var row = this.memRows[i] || [];
        for (var j = 0; j < row.length; j++) if (row[j]) row[j].safe = (j === path[i]);
    }
};

// look: 0 normal, 1 yanan (yeşil), 2 yanlış (kırmızı)
DsParkour.prototype.setLook = function (b, look) {
    if (b.look === look) return;
    b.look = look;
    b.isLit = look === 1;
    var mi = b.e.render && b.e.render.meshInstances[0];
    if (!mi) return;
    var a = look === 1 ? this.memLitMaterial : (look === 2 ? this.memWrongMaterial : null);
    mi.material = a && a.resource ? a.resource : b.normalMat;
};

// Ekranın üstünde çıkan "MEMORIZE THE PATH!" yazısı (alana girince)
DsParkour.prototype.buildBanner = function () {
    var ui = this.app.root.findByName('GameUI');
    var ds = this.app.dontSplash;
    var font = ds && ds.fontAsset;
    if (!ui || !font) return;
    var root = new pc.Entity('MemBanner');
    root.addComponent('element', { type: 'group', anchor: new pc.Vec4(0.5, 1, 0.5, 1), pivot: new pc.Vec2(0.5, 0.5), width: 900, height: 200, useInput: false });
    root.setLocalPosition(0, -195, 0);
    var mk = function (name, size, color, y) {
        var t = new pc.Entity(name);
        t.addComponent('element', {
            type: 'text', fontAsset: font.id, text: '', fontSize: size, autoWidth: true, autoHeight: true,
            anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5), pivot: new pc.Vec2(0.5, 0.5), color: color,
            outlineColor: new pc.Color(0.02, 0.06, 0.04, 1), outlineThickness: 0.7,
            shadowColor: new pc.Color(0, 0, 0, 0.55), shadowOffset: new pc.Vec2(0.14, -0.14), useInput: false
        });
        t.setLocalPosition(0, y, 0);
        root.addChild(t);
        return t;
    };
    this.bTitle = mk('Title', 78, new pc.Color(0.45, 1, 0.6), 18);
    this.bSub = mk('Sub', 34, new pc.Color(1, 1, 1), -52);
    ui.addChild(root);
    root.enabled = false;
    this.banner = root;
    this.bT = 0; this.bKick = 0; this.bPhase = 0;   // 0 kapalı, 1 ezberle, 2 GO, 3 kayboluyor
};

DsParkour.easeOutBack = function (x) { var c1 = 2.2, c3 = c1 + 1; x = pc.math.clamp(x, 0, 1); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

// Yazılar ekrana sığsın (dar/dikey ekranda ve uzun çevirilerde küçülür)
DsParkour.prototype.fitK = function (root, texts) {
    var scr = root.element && root.element.screen && root.element.screen.screen, d = this.app.graphicsDevice;
    if (!scr || !d) return 1;
    var W = d.width / (scr.scale || 1), mw = 1;
    for (var i = 0; i < texts.length; i++) { var t = texts[i]; if (t && t.element) mw = Math.max(mw, t.element.width); }
    return Math.min(1, (W - 60) / mw);
};

// Dikey ekranda üstteki ilerleme çubuğu aşağı iner: yazılar da onun altında kalsın
DsParkour.prototype.portraitDy = function () {
    var d = this.app.graphicsDevice;
    return d && d.height > d.width * 1.05 ? -120 : 0;
};

// Menü / panel / yakalanma sinematiği açık mı (MENU, market, mağaza, yakalanma / kazanma paneli, reklam, giriş sinematiği)
DsParkour.prototype.uiBusy = function () {
    var a = this.app, ds = a.dontSplash;
    if (a.pauseMenu || a.isWatchingAd || a.roomIDPanelEnabled || a.dsIntroPlaying || (ds && (ds.caught || ds.downOpen || ds.winOpen))) return true;
    try { return typeof a.anyMenuEnabled === 'function' && !!a.anyMenuEnabled(); } catch (e) { return false; }
};

// Uyarı yazısı (WarningText: Checkpoint!, Seni duydu!...) ve ipucu yazısı (Press E...) da menülerin / panellerin
// üstüne binmesin: meşgulken gizlenir, kapanınca (sadece burada gizlenenler) geri açılır
DsParkour.prototype.updateTextLayers = function (ds) {
    if (!this.textLayers) {
        var ui = this.app.root.findByName('GameUI');
        var warn = ui && ui.children.filter(function (c) { return c.name === 'WarningText'; })[0];
        if (!warn || !ds.itemsUi) return;
        this.textLayers = [warn, ds.itemsUi];
    }
    var busy = this.uiBusy(), L = this.textLayers;
    for (var i = 0; i < L.length; i++) {
        var e = L[i];
        if (e._destroyed) continue;
        if (busy) { if (e.enabled) { e.enabled = false; e._dsHid = true; } }
        else if (e._dsHid) { e._dsHid = false; e.enabled = true; }
    }
    if (!busy) this.layoutTexts(ds);
};

// Yazılar birbirine binmesin:
//  - ipucu (Press E...) telefonda sol alttaki sohbet akışının (giriş/çıkış mesajları) üstünde dursun
//  - uyarılar aynı noktadan doğup yukarı süzülüyor: arka arkaya gelenler ve ipucunun üstüne denk gelenler
//    üst üste binmesin. En yeni uyarı yerinde kalır, eskiler gerektiği kadar yukarı kayar.
//    Sadece çizim kayar (pivot); uyarının kendi süzülme / solma animasyonuna dokunulmaz.
//  - uzun uyarı (telefon) soldaki butonlara değmesin: butonların arasına sığar (gerekirse iki satıra bölünür)
//  - yükselen uyarı üstteki bölüm yazısına değmesin: o yazı kalkana kadar gizlenir
DsParkour.PROMPT_Y_MOBILE = 490;
DsParkour.WARN_WRAP_FONT = 34;
DsParkour.prototype.layoutTexts = function (ds) {
    var pt = ds.promptText;
    if (pt && this.app.isMobile && !pt._dsMoved) {
        pt._dsMoved = true;
        var lp = pt.getLocalPosition();
        pt.setLocalPosition(lp.x, DsParkour.PROMPT_Y_MOBILE, lp.z);
    }
    var warn = this.textLayers[0];
    var scr = warn.element && warn.element.screen && warn.element.screen.screen;
    if (!scr || warn.children.length < 2) return;
    var s = scr.scale || 1, gap = 4 * s;
    var wc = warn.element.screenCorners, rootY = (wc[0].y + wc[2].y) / 2;
    // altta kalan engelin üst kenarı (ekran px): ipucu açıksa onun üstü
    var floor = -Infinity;
    if (pt && pt.enabled && pt.element.text) { var c0 = pt.element.screenCorners; floor = Math.max(c0[0].y, c0[2].y) + gap; }
    var list = warn.children;
    for (var i = list.length - 1; i >= 1; i--) {   // 0: şablon, en sondaki en yeni
        var c = list[i], el = c.element;
        if (!el || (!c.enabled && !c._dsCut) || !el.text) continue;
        // uyarı kutusuna sığacak kadar kendiliğinden küçülüyor (autoFitWidth) ama kutu telefonda ekrandan geniş:
        // kutu soldaki butonların arasına daraltılır; tek satıra ancak çok küçülerek sığacaksa iki satıra bölünür
        if (!c._dsFit) {
            c._dsFit = true;
            var avail = (this.app.graphicsDevice.width - 2 * this.sideMargin(s)) / s;
            if (el.autoFitWidth && el.width > avail && avail > 100) {
                var big = el.maxFontSize || el.fontSize, one = (el.textWidth || 0) * big / Math.max(1, el.fontSize);
                el.width = avail;
                if (one > avail) {
                    el.autoFitWidth = false;
                    el.wrapLines = true;
                    el.autoHeight = true;
                    el.fontSize = Math.min(big, DsParkour.WARN_WRAP_FONT);
                }
            }
        }
        var h = el.calculatedHeight || el.fontSize, sh = c._dsShift || 0;
        var half = h * s / 2, cy = rootY + (c.getLocalPosition().y + sh * h) * s;
        if (cy - half < floor) {
            sh += (floor - (cy - half)) / (h * s);
            c._dsShift = sh;
            el.pivot = new pc.Vec2(0.5, 0.5 - sh);
            cy = floor + half;
        }
        c._dsTop = cy + half;
        floor = cy + half + gap;
    }
    // üstteki bölüm / ezberle yazısına (kısa yatay ekranda) yükselen uyarı, o yazı kalkana kadar gizlenir
    var ceil = this.bannerBottom() - gap;
    for (var j = 1; j < list.length; j++) {
        var cj = list[j];
        if (cj._dsTop === undefined || cj._destroyed) continue;
        var cut = cj._dsTop > ceil;
        if (cut !== !!cj._dsCut) { cj._dsCut = cut; cj.enabled = !cut; }
    }
};

// Ekrandaki bölüm / ezberle yazısının alt kenarı (ekran px), yoksa sonsuz
DsParkour.prototype.bannerBottom = function () {
    var y = Infinity;
    [[this.secBanner, [this.sNum, this.sTitle, this.sHint]], [this.banner, [this.bTitle, this.bSub]]].forEach(function (b) {
        if (!b[0] || !b[0].enabled) return;
        b[1].forEach(function (t) {
            if (t && t.element && t.element.text && t.element.opacity > 0.05) t.element.screenCorners.forEach(function (v) { y = Math.min(y, v.y); });
        });
    });
    return y;
};

// Sol kenardaki butonların (Menu, Emote, Market, Camera) sağ kenarı + pay (ekran px)
DsParkour.prototype.sideMargin = function (s) {
    var ui = this.app.root.findByName('GameUI'), m = 0;
    ['LeftCorner', 'ChangeCameraButton'].forEach(function (n) {
        var e = ui && ui.findByName(n);
        if (!e || !e.enabled) return;
        e.findComponents('element').forEach(function (el) {
            if (el.type === 'group' || !el.entity.enabled) return;
            el.screenCorners.forEach(function (v) { m = Math.max(m, v.x); });
        });
    });
    return m + 8 * s;
};

// Menü açıkken yazı gizlenir ve süresi işlemez (menünün üstüne binmesin); menü kapanınca kaldığı yerden devam eder
DsParkour.prototype.holdForUi = function (root) {
    var busy = this.uiBusy();
    if (root.enabled === busy) root.enabled = !busy;
    return busy;
};

DsParkour.prototype.showBanner = function (phase) {
    if (!this.banner) return;
    this.bPhase = phase; this.bT = 0; this.bKick = 0;
    this.banner.enabled = true;
    if (phase === 1) {
        this.bTitle.element.text = 'MEMORIZE THE PATH!';
        this.bTitle.element.color = new pc.Color(0.45, 1, 0.6);
        this.bSub.element.text = 'Watch the glowing tiles...';
    } else if (phase === 2) {
        this.bTitle.element.text = 'GO!';
        this.bTitle.element.color = new pc.Color(1, 0.86, 0.25);
        this.bSub.element.text = 'Wrong tile = SPLASH';
    }
};

DsParkour.prototype.updateBanner = function (dt) {
    if (!this.banner || !this.bPhase) return;
    if (this.holdForUi(this.banner)) return;
    this.bT += dt;
    this.bKick = Math.max(0, this.bKick - dt * 4);
    var t = this.bT, s, op = 1, rot = 0, subOp = 1;
    if (this.bPhase === 1) {
        s = DsParkour.easeOutBack(t / 0.38) * (1 + Math.sin(t * 5) * 0.025) + this.bKick * 0.12;
        rot = Math.sin(t * 3.1) * 1.5;
        subOp = pc.math.clamp((t - 0.25) / 0.3, 0, 1);
        // ekranda kalıp karoları kapatmasın: kısa süre sonra kaybolur
        if (t > 2.2) { this.bPhase = 3; this.bT = 0; }
    } else if (this.bPhase === 2) {
        s = DsParkour.easeOutBack(t / 0.3) * 1.25;
        rot = Math.sin(t * 9) * 3 * Math.max(0, 1 - t);
        if (t > 1.0) { this.bPhase = 3; this.bT = 0; }
    } else {
        s = 1.25 + t * 0.6;
        op = Math.max(0, 1 - t / 0.35);
        if (op <= 0) { this.bPhase = 0; this.banner.enabled = false; return; }
    }
    s *= this.fitK(this.banner, [this.bTitle, this.bSub]);
    this.banner.setLocalScale(s, s, s);
    this.banner.setLocalPosition(0, -195 + this.portraitDy(), 0);
    this.banner.setLocalEulerAngles(0, 0, rot);
    this.bTitle.element.opacity = op;
    this.bSub.element.opacity = op * subOp;
};

// ---------------------------------------------------------------- bölüm yazısı
// Her bölümün önündeki güvenli zemine basınca: "SECTION 2/6", bölüm adı ve yeni mekaniğin ipucu
DsParkour.prototype.buildSecBanner = function () {
    var ui = this.app.root.findByName('GameUI');
    var ds = this.app.dontSplash;
    var font = ds && ds.fontAsset;
    if (!ui || !font) return;
    var root = new pc.Entity('SectionBanner');
    root.addComponent('element', { type: 'group', anchor: new pc.Vec4(0.5, 1, 0.5, 1), pivot: new pc.Vec2(0.5, 0.5), width: 1000, height: 240, useInput: false });
    root.setLocalPosition(0, -215, 0);
    var mk = function (name, size, y) {
        var t = new pc.Entity(name);
        t.addComponent('element', {
            type: 'text', fontAsset: font.id, text: '', fontSize: size, autoWidth: true, autoHeight: true,
            anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5), pivot: new pc.Vec2(0.5, 0.5), color: new pc.Color(1, 1, 1),
            outlineColor: new pc.Color(0.03, 0.03, 0.05, 1), outlineThickness: 0.7,
            shadowColor: new pc.Color(0, 0, 0, 0.55), shadowOffset: new pc.Vec2(0.14, -0.14), useInput: false
        });
        t.setLocalPosition(0, y, 0);
        root.addChild(t);
        return t;
    };
    this.sNum = mk('Num', 34, 66);
    this.sTitle = mk('Title', 80, 8);
    this.sHint = mk('Hint', 32, -60);
    ui.addChild(root);
    root.enabled = false;
    this.secBanner = root;
    this.sPhase = 0; this.sT = 0;
};

DsParkour.prototype.showSection = function (k) {
    var S = DontSplashManager.SECTIONS;
    if (!this.secBanner || !S[k]) return;
    var c = S[k].color || [1, 1, 1];
    this.sNum.element.text = 'SECTION ' + (k + 1) + '/' + S.length;
    this.sNum.element.color = new pc.Color(1, 1, 1);
    this.sTitle.element.text = S[k].name;
    this.sTitle.element.color = new pc.Color(c[0], c[1], c[2]);
    this.sHint.element.text = S[k].hint || '';
    this.secBanner.enabled = true;
    this.sPhase = 1; this.sT = 0;
    // "MEMORIZE" / "GO!" yazısı ile üst üste binmesin: ezberle yazısı bölüm yazısı bitince gösterilir, GO kapanır
    if (this.banner && this.bPhase) { if (this.bPhase === 1) this.memPending = true; this.bPhase = 0; this.banner.enabled = false; }
    var ds = this.app.dontSplash;
    if (ds) ds.play('success', 0.5);
};

DsParkour.prototype.updateSecBanner = function (dt, ds) {
    // hangi bölümün önündeki zemindeyiz
    var S = DontSplashManager.SECTIONS, pp = ds.player.getPosition(), k = -1;
    if (pp.y > 1.5 && !ds.caught && !ds.finished && this.time > 1.2) {
        for (var i = 0; i < S.length; i++) {
            var f = DontSplashManager.floorBefore(i);
            if (pp.z > f.z0 && pp.z < f.z1) { k = i; break; }
        }
    }
    // bölge 0.2 sn değişmeden kalınca geçerli sayılır (ışınlanırken bir kare eski konum okunabiliyor)
    if (k !== this.secCand) { this.secCand = k; this.secCandT = 0; }
    this.secCandT += dt;
    if (k !== this.secZone && this.secCandT >= 0.2) {
        this.secZone = k;
        if (k >= 0 && !(this.time - (this.secShown[k] === undefined ? -99 : this.secShown[k]) < 12)) {
            this.secShown[k] = this.time;
            this.showSection(k);
        }
    }
    if (!this.secBanner || !this.sPhase) return;
    if (this.holdForUi(this.secBanner)) return;
    this.sT += dt;
    var t = this.sT, s = 1, op = 1, rot = 0;
    if (this.sPhase === 1) {
        s = DsParkour.easeOutBack(t / 0.4) * (1 + Math.sin(t * 4) * 0.02);
        rot = Math.sin(t * 2.6) * 1.2 * Math.max(0, 1 - t / 2);
        if (t > 2.4) { this.sPhase = 2; this.sT = 0; }
    } else {
        s = 1 + t * 0.4;
        op = Math.max(0, 1 - t / 0.4);
        if (op <= 0) { this.sPhase = 0; this.secBanner.enabled = false; return; }
    }
    var sub = pc.math.clamp((this.sPhase === 1 ? t - 0.25 : 1) / 0.3, 0, 1);
    s *= this.fitK(this.secBanner, [this.sNum, this.sTitle, this.sHint]);
    this.secBanner.setLocalScale(s, s, s);
    this.secBanner.setLocalPosition(0, -215 + this.portraitDy(), 0);
    this.secBanner.setLocalEulerAngles(0, 0, rot);
    this.sNum.element.opacity = op * sub;
    this.sTitle.element.opacity = op;
    this.sHint.element.opacity = op * sub;
};

// ---------------------------------------------------------------- döngü
DsParkour.prototype.update = function (dt) {
    var ds = this.app.dontSplash;
    if (!ds) return;
    this.time += dt;
    this.updateSecBanner(dt, ds);
    this.updateTextLayers(ds);
    if (!this.blocks.length) return;

    if (this.memCount) {
        var seed = ds.getSeed();
        if (seed !== this.memSeed) { this.memSeed = seed; this.makePath(seed); }
        var pp = ds.player.getPosition(), Z = this.memZone;
        var inZone = pp.x > Z.x0 && pp.x < Z.x1 && pp.z > Z.z0 && pp.z < Z.z1 && pp.y < 4 && !ds.caught;
        if (inZone && this.time - this.lastShow > 1 && this.showT < 0) {
            // karolar hemen yanar; bölüm yazısı ekrandaysa "MEMORIZE" yazısı o bitince çıkar
            this.showT = 0; this.showRow = -1; this.lastShow = this.time;
            this.memPending = true;
        }
        if (this.memPending && !this.sPhase && this.showT >= 0) { this.memPending = false; this.showBanner(1); }
        if (this.goPending && !this.sPhase) { this.goPending = false; this.showBanner(2); }
        this.inZone = inZone;
        if (this.showT >= 0) {
            this.showT += dt;
            // oyuncu zemindeyken yol yanık kalır; zeminden çıkınca memShowHold sonra söner
            var full = this.memCount * this.memShowStep;
            if (inZone && this.showT > full) this.showT = full + 0.001;
            // her satır yanarken artan perdeli tık
            var row = Math.floor(this.showT / this.memShowStep);
            if (row !== this.showRow && row < this.memCount) {
                this.showRow = row;
                ds.playP('click', 0.6, 0.8 + row * 0.12, 0.8 + row * 0.12);
                this.bKick = 1;
            }
            if (this.showT > this.memCount * this.memShowStep + this.memShowHold) {
                this.showT = -1;
                this.memPending = false;
                // bölüm yazısı ekrandaysa GO onun bitişini bekler
                if (this.sPhase) this.goPending = true; else this.showBanner(2);
                ds.play('success', 0.45);
            }
        }
    }

    // Hafıza karoları malzeme değiştirdiği için toplu çizimde (batch) olmamalı
    for (var u = 0; u < this.blocks.length; u++) {
        var ub = this.blocks[u];
        if (ub.kind === 'mem' && ub.e.render && ub.e.render.batchGroupId !== -1) ub.e.render.batchGroupId = -1;
    }

    var players = ds.standingPositions();
    var me = ds.player.getPosition();
    for (var i = 0; i < this.blocks.length; i++) this.updateBlock(this.blocks[i], players, me, dt, ds);
    this.updateBanner(dt);
};

DsParkour.prototype.someoneOn = function (b, players) {
    var c = b.e.getPosition();
    var top = c.y + b.e.getLocalScale().y / 2;
    // yanlış hafıza karosu: üstüne inmek üzereyken bile tetiklenir (değip hemen zıplayarak geçilemesin)
    // kenarına basılsa da sayılır (oyuncunun gövde yarıçapı kadar pay)
    var trap = b.kind === 'mem' && !b.safe;
    var above = trap ? 1.6 : 0.7, pad = trap ? 0.3 : 0;   // karolar arası boşluk ~1 m: komşu doğru karonun kenarında durana tetiklenmesin
    for (var k = 0; k < players.length; k++) {
        var p = players[k], feet = p.y - 1.0;
        if (Math.abs(p.x - c.x) < b.half + pad && Math.abs(p.z - c.z) < b.halfZ + pad && feet > top - 0.5 && feet < top + above) return k === 0 ? 2 : 1;
    }
    return 0;
};

// Yeniden çıkacağı yerde (su içinde ya da üstünde) kimse yoksa
DsParkour.prototype.spotFree = function (b, players) {
    var x = b.baseW.x, z = b.baseW.z;
    for (var k = 0; k < players.length; k++) {
        var p = players[k];
        if (Math.abs(p.x - x) < b.half + 0.4 && Math.abs(p.z - z) < b.halfZ + 0.4 && p.y < b.baseW.y + b.e.getLocalScale().y / 2 + 3) return false;
    }
    return true;
};

DsParkour.prototype.updateBlock = function (b, players, me, dt, ds) {
    var e = b.e;
    var on = b.state < 2 ? this.someoneOn(b, players) : 0;
    var isMem = b.kind === 'mem';

    // Hafıza karoları: gösterim sırasında doğru yol yanar, doğru karoya basınca yanar
    if (isMem) {
        var showLit = this.showT >= 0 && b.safe && this.showT > b.row * this.memShowStep;
        if (showLit && !b.wasShow) b.ov = 6;                         // yanınca zıplar
        b.wasShow = showLit;
        if (on && !b.wasOn && b.state === 0) {
            b.ov = -3;                                               // basınca hafif çöker
            if (b.safe && on === 2) ds.playP('click', 0.7, 0.9 + b.row * 0.12, 0.9 + b.row * 0.12);
        }
        b.wasOn = !!on;
        if (on && b.safe) b.lit = 1.2;
        else b.lit = Math.max(0, b.lit - dt);
        this.setLook(b, b.state === 1 || b.state === 2 ? 2 : (b.state === 0 && (showLit || b.lit > 0) ? 1 : 0));
        // yay: konum ofseti
        if (b.state === 0) {
            b.ov += (-140 * b.off - 11 * b.ov) * dt;
            b.off += b.ov * dt;
            if (Math.abs(b.off) < 0.001 && Math.abs(b.ov) < 0.01) { b.off = 0; b.ov = 0; }
            e.setLocalPosition(b.base.x, b.base.y + b.off, b.base.z);
        }
        if (b.safe) return;
    }

    if (b.state === 0) {                        // bekliyor
        if (on) {
            b.state = 1; b.t = 0; b.off = 0; b.ov = 0; b.splashed = false;
            if (on === 2) ds.playP('click', isMem ? 0.8 : 0.35, isMem ? 0.55 : 1, isMem ? 0.55 : 1);
            // yanlış hafıza karosu: basılır basılmaz zemini çekilir (üstünden zıplanamaz), karo titreyip düşer
            if (isMem && e.collision) e.collision.enabled = false;
        }
    } else if (b.state === 1) {                 // titriyor
        b.t += dt;
        // yanlış hafıza karosu kısa titreyip düşer (son anda geri/ileri kaçılabilir)
        var delay = isMem ? this.memWrongDelay : this.crumbleDelay;
        var a = 0.06 * Math.min(1, b.t * 4);
        e.setLocalPosition(b.base.x + Math.sin(this.time * 70) * a, b.base.y + Math.sin(this.time * 53) * a * 0.5, b.base.z + Math.cos(this.time * 61) * a);
        if (b.t >= delay) {
            b.state = 2; b.t = 0; b.vy = 0; b.y = b.base.y;
            if (e.collision) e.collision.enabled = false;   // oyuncu hemen düşsün
        }
    } else if (b.state === 2) {                 // düşüyor
        b.vy -= 32 * dt;
        b.y += b.vy * dt;
        e.setLocalPosition(b.base.x, b.y, b.base.z);
        // üst yüzü suya girince sıçrama efekti (ses/canavar yok, sadece görsel)
        if (!b.splashed && b.base.y - b.y > 1.2) {
            b.splashed = true;
            if (ds.spawnSplashFx && Math.hypot(b.baseW.x - me.x, b.baseW.z - me.z) < 80 && (!ds.fxVisibleAt || ds.fxVisibleAt(b.baseW))) ds.spawnSplashFx(new pc.Vec3(b.baseW.x, 0, b.baseW.z), 1.1);
        }
        // havuz tabanının altına iner (render kapatılmaz: toplu çizimi bozmasın)
        if (b.y < b.base.y - 12) { b.state = 3; b.t = 0; b.y = b.base.y - 12; e.setLocalPosition(b.base.x, b.y, b.base.z); }
    } else if (b.state === 3) {                 // görünmez bekliyor
        b.t += dt;
        // yerinde yüzen biri olsa da bir süre sonra geri gelir (yoksa altında bekleyen oyuncu yüzünden hiç çıkmıyordu)
        if (b.t > this.crumbleRespawn && (this.spotFree(b, players) || b.t > this.crumbleRespawn + 1.5)) {
            b.state = 4; b.t = 0;
        }
    } else if (b.state === 4) {                 // aşağıdan geri çıkıyor (çarpışmasız)
        b.y = Math.min(b.base.y, b.y + dt * 10);
        e.setLocalPosition(b.base.x, b.y, b.base.z);
        if (b.y >= b.base.y) {
            // yerinde suda duran yerel oyuncu bloğun içinde kalmasın: üstüne çıkarılır (uzak oyuncuları kendi istemcileri taşır)
            if (!this.spotFree(b, [me])) {
                var rb = ds.player.rigidbody, top = b.baseW.y + e.getLocalScale().y / 2;
                if (rb && !ds.caught) { rb.linearVelocity = pc.Vec3.ZERO; rb.teleport(me.x, top + 1.1, me.z); }
            }
            b.state = 0;
            if (e.collision) e.collision.enabled = true;
        }
    }
};

DsParkour.prototype.onDestroy = function () {
    if (this.textLayers) this.textLayers.forEach(function (e) { if (e._dsHid && !e._destroyed) { e._dsHid = false; e.enabled = true; } });
    if (this.banner) this.banner.destroy();
    if (this.secBanner) this.secBanner.destroy();
};
