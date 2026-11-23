var DsMarket = pc.createScript('dsMarket');

// Don't Splash marketi (Steal and Run'daki market gibi): sol menüdeki MARKET butonu ya da M tuşuyla açılır.
// Oyunun kendi menü sistemine (MenuController) "Market" menüsü olarak eklenir: kamera kilidi, karartma, ESC/M ile kapanma.
// Eşyalar ve skinler reklamla alınır; verme işi standlarla aynı kod (DsStand.canGet / DsStand.grant).

DsMarket.ITEMS = [
    { kind: 'bat', name: 'BAT', rarity: 2, badge: 'x10', desc: 'Knock other\nplayers away!', icon: 314403025 },
    { kind: 'hook', name: 'HOOK', rarity: 1, badge: 'x3', desc: 'Pull a friend\nover to you!', icon: 314712884 },
    { kind: 'ice', name: 'ICE BOMB', rarity: 2, badge: 'x2', desc: 'Freeze the\nmonster solid!', icon: 211370140 },
    { kind: 'shield', name: 'SHIELD', rarity: 3, badge: '30s', desc: "The monster\ncan't catch you", icon: 314398416 },
    { kind: 'pebble', name: 'PEBBLES', rarity: 1, badge: 'x3', desc: 'Throw to lure\nthe monster', icon: 314382835 }
];
DsMarket.SKIP_SKINS = { 'Hoodie': 1, 'Default Skin': 1 };   // başlangıç skinleri satılmaz
// Skin nadirliği: mağazadaki fiyatına göre (reklamlı olanlar SPECIAL)
DsMarket.RARITY = [
    { name: 'SPECIAL', col: [1, 0.45, 0.8], bg: [0.75, 0.25, 0.6] },
    { name: 'RARE', col: [0.35, 0.75, 1], bg: [0.15, 0.45, 0.85] },
    { name: 'EPIC', col: [0.8, 0.5, 1], bg: [0.5, 0.25, 0.8] },
    { name: 'LEGENDARY', col: [1, 0.8, 0.15], bg: [0.85, 0.55, 0.05] }
];
// Nadirliğe göre parlama gücü (RARITY sırasıyla): kartın çevresindeki renkli ışık ve ikonun arkasındaki ışın
DsMarket.ORDER = [3, 0, 1, 2];   // RARITY sırasının markette diziliş sırası
DsMarket.GLOW = [0.75, 0.35, 0.55, 0.85];
DsMarket.TEX = { panel: 315137459, title: 315137458, card: 315137460, ad: 214762601, cross: 196470421, cart: 196470285, burst: 196470443 };
DsMarket.SPRITE = { button: 198979217, close: 196470220, dark: 196470374, white: 196470298 };   // dark koyu gri: renk verilince kararıyor, renkliler white ile
DsMarket.FONT = 196470321;
DsMarket.PANEL = { w: 1010, h: 677 };
// Reklam ikonu: dokunun 64x64'ünün yalnız 50x33'ü dolu (ortası 1 px sola, 2.5 px yukarı kaymış)
DsMarket.AD = { size: 50, ink: 50 * 50 / 64, gap: 7, dx: 1 * 50 / 64, dy: -2.5 * 50 / 64 };
DsMarket.CARD = { w: 162, h: 330, gap: 14, pad: 14 };
DsMarket.VIEW = { w: 900, h: 350, y: -40 };   // kartların parlaması kesilmesin diye kartlardan biraz yüksek
DsMarket.C = {
    get: new pc.Color(0, 0.72, 1),
    equip: new pc.Color(0.24, 0.82, 0.3),
    off: new pc.Color(0.5, 0.5, 0.55),
    itemBg: new pc.Color(0.85, 0.45, 0.05),
    tabOn: new pc.Color(1, 0.79, 0),
    tabOff: new pc.Color(0.42, 0.27, 0.12)
};
DsMarket.col = function (a, alpha) { return new pc.Color(a[0], a[1], a[2], alpha === undefined ? 1 : alpha); };

DsMarket.prototype.initialize = function () {
    this.app.dsMarket = this;
    this.cards = [];
    this.texts = [];
    this.glowT = 0;
    this.tab = 'items';
    this.page = 0;
    this.anims = [];
    this.app.on('DsMarketOpen', this.onOpen, this);
    this.app.on('DsMarketClose', this.onClose, this);
    this.on('destroy', function () {
        this.app.off('DsMarketOpen', this.onOpen, this);
        this.app.off('DsMarketClose', this.onClose, this);
        if (this.app.dsMarket === this) this.app.dsMarket = null;
        if (this.root) this.root.destroy();
        if (this.onWheel && this.app.mouse) this.app.mouse.off(pc.EVENT_MOUSEWHEEL, this.onWheel);
        if (this.hudButton) this.hudButton.destroy();
        var mc = this.app.menu;
        if (mc && mc.menus) mc.menus = mc.menus.filter(function (m) { return m.name !== 'Market'; });
    }, this);
};

DsMarket.prototype.postInitialize = function () {
    try { this.build(); this.register(); } catch (e) { console.warn('dsMarket', e); }
};

// ---------------------------------------------------------------- yardımcılar
DsMarket.prototype.el = function (parent, name, data, x, y) {
    var e = new pc.Entity(name);
    data.anchor = data.anchor || new pc.Vec4(0.5, 0.5, 0.5, 0.5);
    data.pivot = data.pivot || new pc.Vec2(0.5, 0.5);
    if (data.useInput === undefined) data.useInput = false;
    e.addComponent('element', data);
    e.setLocalPosition(x || 0, y || 0, 0);
    parent.addChild(e);
    return e;
};

DsMarket.prototype.img = function (parent, name, tex, w, h, x, y, color) {
    return this.el(parent, name, { type: 'image', textureAsset: tex, width: w, height: h, color: color || new pc.Color(1, 1, 1) }, x, y);
};

DsMarket.prototype.spr = function (parent, name, sprite, w, h, x, y, color) {
    return this.el(parent, name, { type: 'image', spriteAsset: sprite, width: w, height: h, color: color || new pc.Color(1, 1, 1) }, x, y);
};

DsMarket.prototype.txt = function (parent, name, str, size, w, h, x, y, color) {
    var e = this.el(parent, name, {
        type: 'text', text: str, fontAsset: DsMarket.FONT, fontSize: size, lineHeight: size * 1.08, width: w, height: h,
        autoWidth: false, autoHeight: false, wrapLines: true, alignment: new pc.Vec2(0.5, 0.5),
        color: color || new pc.Color(1, 1, 1), outlineColor: new pc.Color(0, 0, 0, 1), outlineThickness: 1,
        shadowColor: new pc.Color(0, 0, 0, 0.6), shadowOffset: new pc.Vec2(0.06, -0.08)
    }, x, y);
    e._cy = y || 0;
    this.texts.push(e);
    this.vc(e);
    return e;
};

// Font harfleri kutunun ortasından yukarıda çiziyor: yazıyı görünen harflerine göre istenen yüksekliğe (_cy) ortalar.
// Yazının gerçek genişliğini döndürür.
DsMarket.prototype.vc = function (e) {
    var T = e.element && e.element._text, mi = T && T._meshInfo, lo = Infinity, hi = -Infinity;
    if (mi) for (var m = 0; m < mi.length; m++) {
        var p = mi[m].positions;
        if (!p) continue;
        for (var i = 0; i + 11 < p.length; i += 12) {
            if (p[i + 1] === p[i + 7]) continue;   // boşluk
            lo = Math.min(lo, p[i + 1], p[i + 7]); hi = Math.max(hi, p[i + 1], p[i + 7]);
        }
    }
    if (hi < lo) return 0;
    e.setLocalPosition(e.getLocalPosition().x, e._cy - (lo + hi) / 2, 0);
    return T.width;
};

// Buton resminin kenarları sabit piksel (alt 34, üst 19): küçük butonda mavi yüz eziliyor, yazı dışına taşıyordu.
// Resim 2 kat büyük çizilip yarıya küçültülür: kenarlar orantılı kalır, mavi yüz butonun çoğunu kaplar.
// Dönen grup butondur; rengi .face üzerinden değişir. Mavi yüzün ortası grubun ortasından ~5 birim yukarıda.
DsMarket.prototype.faced = function (parent, name, w, h, x, y, color) {
    var g = this.el(parent, name, { type: 'group', width: w, height: h }, x, y);
    var f = this.spr(g, 'Face', DsMarket.SPRITE.button, w * 2, h * 2, 0, 0, color);
    f.setLocalScale(0.5, 0.5, 1);
    g.face = f;
    return g;
};

// Butona basınca/üstüne gelince yumuşak büyüme-küçülme
DsMarket.prototype.makeButton = function (e, onClick) {
    var self = this;
    e.element.useInput = true;
    e.addComponent('button', {});
    e._hs = 1; e._hv = 1;
    e.button.on('hoverstart', function () { e._hv = 1.06; });
    e.button.on('hoverend', function () { e._hv = 1; });
    e.button.on('pressedstart', function () { e._hv = 0.94; });
    e.button.on('pressedend', function () { e._hv = 1; });
    e.button.on('click', function () { if (!e._disabled) onClick(); });
    this.anims.push(e);
    return e;
};

// Skin resimlerinde yüz yok (oyunda yüz ayrı bir eşya, kafaya takılıyor): kartta oyuncunun taktığı yüz kafanın
// üstüne konur. Değerler skin resmi pikselinde (225x510): yüzün merkezi ve yüz resminin genişliği.
DsMarket.FACE_ON_SKIN = { x: 113, y: 88, w: 107 };
DsMarket.prototype.faceTexId = function () {
    if (typeof ShopData === 'undefined' || !ShopData.Faces || !ShopData.Faces.length) return null;
    var f = ShopData.Faces.find(function (x) { return x._isEquipped; }) || ShopData.Faces[0];
    return f ? f.textureId : null;
};
DsMarket.prototype.addFace = function (icon, k, t) {
    var id = this.faceTexId(), F = DsMarket.FACE_ON_SKIN;
    if (!id || !icon.element) return;
    var face = icon.findByName('Face');
    if (!face) face = this.img(icon, 'Face', id, F.w * k, F.w * k, 0, 0);
    else { face.element.textureAsset = id; face.element.width = face.element.height = F.w * k; }
    face.setLocalPosition((F.x - t.width / 2) * k, (t.height / 2 - F.y) * k, 0);
};

// Dokuyu oranını bozmadan kutuya sığdır (skin resimleri dikdörtgen)
DsMarket.prototype.fitIcon = function (e, id, box, boxH, onSet) {
    var a = this.app.assets.get(id);
    e.element.opacity = 0;
    if (!a) return;
    var set = function () {
        var t = a.resource;
        if (!t || !e.element) return;
        var k = Math.min(box / t.width, (boxH || box) / t.height);
        e.element.width = t.width * k; e.element.height = t.height * k;
        e.element.texture = t;
        e.element.opacity = 1;
        if (onSet) onSet(k, t);
    };
    if (a.loaded) set(); else { a.ready(set); this.app.assets.load(a); }
};

// ---------------------------------------------------------------- kurulum
DsMarket.prototype.items = function () {
    var list = DsMarket.ITEMS.map(function (i) { var r = DsMarket.RARITY[i.rarity];
        return { tab: 'items', kind: i.kind, name: i.name, tag: r.name, tagCol: r.col, bg: r.bg, tier: i.rarity, badge: i.badge, desc: i.desc, icon: i.icon };
    });
    if (typeof ShopData !== 'undefined' && ShopData.Skins) {
        ShopData.Skins.forEach(function (s) {
            if (DsMarket.SKIP_SKINS[s.name]) return;
            var R = DsMarket.RARITY, ti = s.isAd ? 0 : (s.price <= 50 ? 1 : (s.price <= 100 ? 2 : 3)), r = R[ti];
            list.push({ tab: 'skins', kind: 'skin', skin: s.name, name: s.name.toUpperCase(), tag: r.name, tagCol: r.col, bg: r.bg, tier: ti, desc: 'Wear it in\nevery mode!', icon: s.textureId });
        });
    }
    return list;
};

DsMarket.prototype.build = function () {
    var ui = this.app.root.findByName('GameUI');
    if (!ui) return;
    this.ui = ui;
    var self = this, P = DsMarket.PANEL, V = DsMarket.VIEW;

    // kök (MenuController bunu açıp kapatır)
    var root = new pc.Entity('MarketMenu');
    root.addComponent('element', { type: 'group', anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5), pivot: new pc.Vec2(0.5, 0.5), width: P.w, height: P.h, useInput: false });
    ui.addChild(root);
    this.root = root;
    // panelin arkasına tıklama geçmesin
    this.el(root, 'Blocker', { type: 'image', width: 4000, height: 4000, color: new pc.Color(0, 0, 0), opacity: 0.01, useInput: true });
    this.img(root, 'Shadow', DsMarket.TEX.panel, P.w, P.h, 8, -12, new pc.Color(0, 0, 0)).element.opacity = 0.35;
    this.img(root, 'Panel', DsMarket.TEX.panel, P.w, P.h, 0, 0);

    // başlık (panelin içinde)
    var title = this.img(root, 'Title', DsMarket.TEX.title, 430, 96, 0, P.h / 2 - 72);
    this.txt(title, 'Text', 'MARKET', 54, 380, 76, 0, -1.5);   // yeşil şeridin görünen ortası
    var close = this.spr(root, 'CloseButton', DsMarket.SPRITE.close, 74, 74, P.w / 2 - 70, P.h / 2 - 70);
    this.img(close, 'Cross', DsMarket.TEX.cross, 44, 44, 0, 3);
    this.makeButton(close, function () { self.app.fire('CloseMenu'); });
    this.closeButton = close;

    // sekmeler
    var mkTab = function (name, label, x, tab) {
        var b = self.faced(root, name, 196, 60, x, P.h / 2 - 156, DsMarket.C.tabOff);
        self.txt(b, 'Text', label, 28, 160, 34, 0, 4);   // butonun düz yüzünün ortası (alt kenarda gri dudak var)
        self.makeButton(b, function () { self.setTab(tab); });
        return b;
    };
    this.tabs = { items: mkTab('TabItems', 'ITEMS', -108, 'items'), skins: mkTab('TabSkins', 'SKINS', 108, 'skins') };

    // kartların durduğu koyu oyuk + kaydırmalı alan (Steal and Run'daki gibi)
    var well = this.spr(root, 'Well', DsMarket.SPRITE.dark, V.w + 30, V.h + 50, 0, V.y - 20, new pc.Color(0.12, 0.06, 0.02));
    well.element.opacity = 0.55;
    var sv = this.el(root, 'ScrollView', { type: 'group', width: V.w, height: V.h }, 0, V.y);
    var vp = this.el(sv, 'Viewport', { type: 'image', anchor: new pc.Vec4(0, 0, 1, 1), width: V.w, height: V.h, mask: true, useInput: true, color: new pc.Color(1, 1, 1) });
    vp.element.margin = new pc.Vec4(0, 0, 0, 0);
    var content = this.el(vp, 'Content', { type: 'group', anchor: new pc.Vec4(0, 1, 0, 1), pivot: new pc.Vec2(0, 1), width: V.w, height: V.h, useInput: true });
    this.content = content;
    // kaydırma çubuğu
    // ince, sade kaydırma çubuğu: koyu ray + içinde 3 birim boşlukla sarı tutamak
    var bar = this.spr(root, 'Scrollbar', DsMarket.SPRITE.dark, 600, 16, 0, V.y - V.h / 2 - 22, new pc.Color(0.05, 0.02, 0));
    bar.element.opacity = 0.75; bar.element.useInput = true;
    var handle = this.spr(bar, 'Handle', DsMarket.SPRITE.white, 100, 22, 0, 0, DsMarket.C.tabOn);   // ince çubukta buton resmi kenarlardan taşıyordu
    handle.element.anchor = new pc.Vec4(0, 0, 0, 1); handle.element.pivot = new pc.Vec2(0, 0.5);
    var hm = handle.element.margin.clone(); hm.y = 3; hm.w = 3; handle.element.margin = hm;   // ray boyu eksi kenar boşlukları
    handle.element.useInput = true;
    // tutamağın kendisi görünmez (boyunu kaydırma çubuğu ayarlar); görüntü 2 kat büyük çizilip yarıya küçültülen çocukta:
    // resmin köşe payları 10 birimlik boya sığmayıp uçlarda çıkıntı yapıyordu
    handle.element.opacity = 0;
    this.handleFill = this.spr(handle, 'Fill', DsMarket.SPRITE.white, 200, 20, 0, 0, DsMarket.C.tabOn);
    this.handleFill.setLocalScale(0.5, 0.5, 1);
    handle.addComponent('button', { hoverTint: new pc.Color(1, 0.9, 0.5), pressedTint: new pc.Color(0.9, 0.7, 0) });
    bar.addComponent('scrollbar', { orientation: pc.ORIENTATION_HORIZONTAL, value: 0, handleSize: 0.5, handleEntity: handle });
    this.bar = bar;
    sv.addComponent('scrollview', {
        horizontal: true, vertical: false, scrollMode: pc.SCROLL_MODE_BOUNCE, bounceAmount: 0.08, friction: 0.06,
        dragThreshold: 12, useMouseWheel: false, viewportEntity: vp, contentEntity: content,
        horizontalScrollbarEntity: bar, horizontalScrollbarVisibility: pc.SCROLLBAR_VISIBILITY_SHOW_WHEN_REQUIRED
    });
    this.sv = sv;
    this.items().forEach(function (it) { self.cards.push(self.makeCard(content, it)); });
    this.hint = this.txt(root, 'Hint', 'Watch a short ad to get it for FREE!', 26, 700, 34, 0, -P.h / 2 + 52, new pc.Color(1, 0.86, 0.25));

    // fare tekerleği yatay kaydırır
    this.onWheel = function (ev) {
        if (!self.isOpen() || !self.sv.scrollview) return;
        var s = self.sv.scrollview.scroll.clone();
        s.x = pc.math.clamp(s.x + (ev.wheelDelta > 0 ? 0.25 : -0.25) * (self.scrollStep || 1), 0, 1);
        self.sv.scrollview.scroll = s;
    };
    if (this.app.mouse) this.app.mouse.on(pc.EVENT_MOUSEWHEEL, this.onWheel);

    root.enabled = false;
    this.buildHud();
    if (ui.screen && ui.screen.syncDrawOrder) ui.screen.syncDrawOrder();
    this.setTab('items');
};

DsMarket.prototype.makeCard = function (parent, it) {
    var C = DsMarket.CARD, self = this;
    var holder = this.el(parent, 'Card_' + (it.skin || it.kind), { type: 'group', anchor: new pc.Vec4(0, 1, 0, 1), width: C.w, height: C.h });   // içeriğin sol üstüne göre
    var g = DsMarket.GLOW[it.tier || 0];
    // iki katlı ışık: dışta geniş-soluk, içte dar-parlak (yumuşak hale gibi)
    var glow = this.spr(holder, 'Glow', DsMarket.SPRITE.white, C.w + 20, C.h + 18, 0, 0, DsMarket.col(it.tagCol));
    var glowIn = this.spr(holder, 'GlowIn', DsMarket.SPRITE.white, C.w + 9, C.h + 8, 0, 0, DsMarket.col(it.tagCol));
    glow.element.opacity = glowIn.element.opacity = 0;
    this.img(holder, 'Shadow', DsMarket.TEX.card, C.w, C.h, 4, -6, new pc.Color(0, 0, 0)).element.opacity = 0.4;
    var card = this.img(holder, 'Card', DsMarket.TEX.card, C.w, C.h, 0, 0);
    var nm = this.txt(card, 'Name', it.name, it.name.length <= 7 ? 26 : (it.name.length <= 8 ? 23 : 20), C.w - 30, 34, 0, C.h / 2 - 34);
    nm.element.wrapLines = false;   // uzun isimler bölünmesin, küçük yazılsın
    nm.element.autoFitWidth = true; nm.element.minFontSize = 12; nm.element.maxFontSize = nm.element.fontSize;
    // ikon kutusu: nadirlik rengi, arkada dönen ışık, köşede adet rozeti
    var bg = this.spr(card, 'IconBG', DsMarket.SPRITE.button, C.w - 32, 112, 0, 52, DsMarket.col(it.bg));
    var tc = it.tagCol;
    var burst = this.img(bg, 'Burst', DsMarket.TEX.burst, 100, 100, 0, 4, new pc.Color((tc[0] + 2) / 3, (tc[1] + 2) / 3, (tc[2] + 2) / 3));
    burst.element.opacity = 0.2 + 0.35 * g;
    var icon = this.img(bg, 'Icon', null, 90, 90, 0, 4);
    // kutunun kenarına değmesin (skin resimleri dik: boyca daha çok yer)
    var self = this;
    if (it.kind === 'skin') this.fitIcon(icon, it.icon, 96, 94, function (k, t) { self.addFace(icon, k, t); });
    else this.fitIcon(icon, it.icon, 80);
    if (it.badge) {
        var chip = this.spr(bg, 'Badge', DsMarket.SPRITE.dark, 46, 26, (C.w - 32) / 2 - 30, -38, new pc.Color(0.08, 0.04, 0.02));
        chip.element.opacity = 0.85;
        this.txt(chip, 'Text', it.badge, 18, 44, 24, 0, 0, new pc.Color(1, 0.9, 0.3));
    }
    if (it.tag) this.txt(card, 'Tag', it.tag, 18, C.w - 30, 24, 0, -18, DsMarket.col(it.tagCol));
    this.txt(card, 'Desc', it.desc, 17, C.w - 34, 44, 0, -54, new pc.Color(1, 0.95, 0.85));
    // buton sprite'ının kenarları kalın: yazı ve reklam ikonu mavi yüzün içinde kalsın diye buton yüksek, içerik küçük
    var btn = this.faced(card, 'Button', C.w - 30, 62, 0, -C.h / 2 + 46, DsMarket.C.get);
    var label = this.txt(btn, 'Text', 'GET', 26, C.w - 50, 32, 0, 4);
    label.element.wrapLines = false;
    // uzun çevirilerde (SENDE VAR, AUSGERÜSTET...) butona sığacak kadar küçülür
    label.element.autoFitWidth = true; label.element.minFontSize = 12; label.element.maxFontSize = 26;
    var ad = this.img(btn, 'Ad', DsMarket.TEX.ad, DsMarket.AD.size, DsMarket.AD.size, 0, 0);
    var o = { item: it, e: holder, card: card, button: btn, label: label, ad: ad, burst: burst, glow: glow, glowIn: glowIn, power: g };
    this.makeButton(btn, function () { self.buy(o); });
    return o;
};

// Sol menüye (ESC / Enter butonlarının altına) MARKET butonu: Emote butonunun kopyası
DsMarket.prototype.buildHud = function () {
    var lc = this.ui.findByName('LeftCorner');
    var src = lc && lc.findByName('EmoteButton');
    if (!src) return;
    var b = src.clone();
    b.name = 'MarketButton';
    var texts = b.children.filter(function (c) { return c.element && c.element.type === 'text'; });
    if (texts[0]) texts[0].element.text = '(M)';
    if (texts[1]) texts[1].element.text = 'Market';
    var im = b.findByName('Image');
    if (im && im.element) { im.element.textureAsset = DsMarket.TEX.cart; im.element.color = new pc.Color(1, 0.86, 0.2); }
    lc.insertChild(b, lc.children.indexOf(src) + 1);
    // telefonun kamera butonu bu butonun altında kalıyordu: yerini NetworkManager.layoutHud ayarlar
    if (b.button) b.button.on('click', function () { this.app.fire('OpenMenu', 'Market'); }, this);
    this.hudButton = b;
    // dikkat çeksin diye yavaşça nabız atar
    this.hudPulse = 0;
};

// Oyunun menü sistemine ekle (M tuşu marketi açar; mağazanın M tuşu bu sahnede markete geçer)
DsMarket.prototype.register = function () {
    var mc = this.app.menu;
    if (!mc || !mc.menus || !this.root) return;
    mc.menus.forEach(function (m) { if (m.toggleKey === pc.KEY_M) m.toggleKey = 0; });
    mc.menus.push({
        name: 'Market', entity: this.root, mouseLock: true, blackBackground: true, hideGameUi: false,
        toggleKey: pc.KEY_M, openButton: null, closeButton: null, openEvent: 'DsMarketOpen', closeEvent: 'DsMarketClose',
        openAnim: false, closeAnim: false, playerCanMove: false
    });
};

// ---------------------------------------------------------------- sekme
DsMarket.prototype.setTab = function (tab) {
    var C = DsMarket.CARD, V = DsMarket.VIEW;
    this.tab = tab;
    for (var k in this.tabs) {
        this.tabs[k].face.element.color = k === tab ? DsMarket.C.tabOn : DsMarket.C.tabOff;
        this.tabs[k]._hv = 1;
    }
    // nadirliğe göre sıralı: RARE, EPIC, LEGENDARY, en sonda SPECIAL (aynı nadirlikte eski sıra korunur)
    var all = this.cards, rank = DsMarket.ORDER;
    var list = all.filter(function (o) { return o.item.tab === tab; }).sort(function (a, b) {
        return (rank[a.item.tier || 0] - rank[b.item.tier || 0]) || (all.indexOf(a) - all.indexOf(b));
    });
    this.cards.forEach(function (o) { o.e.enabled = false; });
    var w = C.pad * 2 + list.length * C.w + (list.length - 1) * C.gap;
    var fits = w <= V.w;
    var x0 = fits ? (V.w - (w - C.pad * 2)) / 2 : C.pad;
    list.forEach(function (o, i) {
        o.e.enabled = true;
        o.e.setLocalPosition(x0 + C.w / 2 + i * (C.w + C.gap), -V.h / 2, 0);
        o.e._in = 0.18 + i * 0.05;   // kartlar sırayla belirir
    });
    this.content.element.width = Math.max(V.w, w);
    this.scrollStep = fits ? 0 : V.w / (w - V.w);
    if (this.sv.scrollview) this.sv.scrollview.scroll = new pc.Vec2(0, 0);
    this.bar.enabled = !fits;
    this.refresh();
};

DsMarket.prototype.refresh = function () {
    var K = DsMarket.C;
    this.cards.forEach(function (o) {
        if (!o.e.enabled) return;
        var it = o.item, text = 'GET', col = K.get, ad = true, off = false;
        if (it.kind === 'skin') {
            var sd = DsStand.skinByName(it.skin);
            if (sd && sd.isEquipped) { text = 'EQUIPPED'; col = K.off; ad = false; off = true; }
            else if (sd && sd.isBought) { text = 'EQUIP'; col = K.equip; ad = false; }
        } else if (!DsStand.canGet(this.app, it.kind)) {
            text = it.kind === 'shield' ? 'ACTIVE' : 'OWNED'; col = K.off; ad = false; off = true;
        }
        o.button.face.element.color = col;
        o.button._disabled = off;
        o.label.element.text = text;
        o.label.element.fontSize = text.length > 6 ? 19 : 26;
        o.ad.enabled = ad;
        // reklam ikonu + yazı birlikte butonun düz yüzünün ortasına (y = 4)
        var A = DsMarket.AD, lw = this.vc(o.label), y = o.label.getLocalPosition().y;
        if (ad) {
            var x0 = -(A.ink + A.gap + lw) / 2;
            o.ad.setLocalPosition(x0 + A.ink / 2 + A.dx, 4 + A.dy, 0);
            o.label.setLocalPosition(x0 + A.ink + A.gap + lw / 2, y, 0);
        } else o.label.setLocalPosition(0, y, 0);
    }, this);
};

// ---------------------------------------------------------------- açma / kapama
DsMarket.prototype.blocked = function () {
    var a = this.app, ds = a.dontSplash;
    return a.isWatchingAd || !!(ds && (ds.caught || ds.finished)) || a.deadMenuEnabled || a.endUI;
};

DsMarket.prototype.onOpen = function () {
    if (this.blocked()) { this.app.fire('CloseMenu'); return; }
    this.app.marketEnabled = true;
    this.openedAt = this.app.frame;
    this.applyLayout();
    if (window.pokiMeasure) {
        window.pokiMeasure('menu', 'market', 'open');
        DsMarket.ITEMS.forEach(function (it) { window.pokiMeasure('rewarded', 'market-' + it.kind, 'visible'); });
    }
    for (var i = 0; i < this.texts.length; i++) this.vc(this.texts[i]);   // font geç yüklendiyse
    this.setTab(this.tab);
    this.root._pop = 0;
    this.root.setLocalScale(0.01, 0.01, 1);
    if (this.ui.screen && this.ui.screen.syncDrawOrder) this.ui.screen.syncDrawOrder();
    var ds = this.app.dontSplash;
    if (ds) ds.play('click', 0.7);
};

DsMarket.prototype.onClose = function () {
    this.app.marketEnabled = false;
    var ds = this.app.dontSplash;
    if (ds) ds.play('click', 0.45);
    // market kapanınca reklam arası; başka bir panel (ölüm/kazanma ekranı, menü) açıldığı için kapandıysa gösterme
    var app = this.app;
    setTimeout(function () {
        var d = app.dontSplash;
        if (app.pauseMenu || app.isWatchingAd || (app.menu && app.menu.activeMenu)) return;
        if (d && (d.caught || d.downOpen || d.winOpen || d.finished)) return;
        if (typeof watchCommercial === 'function') watchCommercial();
    }, 0);
};

DsMarket.prototype.isOpen = function () { return !!this.root && this.root.enabled; };

// Panel ekrana sığsın (telefon dikey/yatay)
DsMarket.prototype.fit = function () {
    var sc = this.ui.screen, d = this.app.graphicsDevice;
    var s = sc && sc.scale ? sc.scale : 1;
    var w = d.width / s, h = d.height / s;
    var pw = this.panelW || DsMarket.PANEL.w;
    return Math.min(this.portrait ? 1.6 : 1, (w * 0.95) / (pw + 40), (h * 0.9) / (DsMarket.PANEL.h + 70));
};

// Dikey ekran (telefon): panel daralır (3 kart görünür, gerisi kaydırılır), böylece yazılar okunacak kadar büyür.
// Panel resmi esnemesin diye sol kenar / orta / sağ kenar olarak üç parça çizilir.
DsMarket.PORTRAIT_W = 600;
DsMarket.EDGE = 0.13;   // panel resminde kenar çerçevesinin payı (genişliğe oranla)
DsMarket.prototype.applyLayout = function () {
    var d = this.app.graphicsDevice, root = this.root;
    if (!root || !d) return;
    var portrait = d.height > d.width * 1.05;
    if (portrait === this.portrait && this.panelW) return;
    this.portrait = portrait;
    var P = DsMarket.PANEL, pw = portrait ? DsMarket.PORTRAIT_W : P.w;
    this.panelW = pw;
    root.element.width = pw;
    var panel = root.findByName('Panel'), shadow = root.findByName('Shadow');
    var self = this, E = DsMarket.EDGE, ew = P.w * E;
    if (!this.slices && portrait) {
        // önce gölge, sonra panel parçaları (orijinallerin hemen arkasına/önüne)
        var mk = function (name, ref, color, op, dx, dy) {
            var parts = ['L', 'M', 'R'].map(function (k) {
                var e = self.img(root, name + k, DsMarket.TEX.panel, 10, P.h, dx, dy, color);
                if (op !== undefined) e.element.opacity = op;
                root.removeChild(e);
                root.insertChild(e, root.children.indexOf(ref) + 1);
                return e;
            });
            return parts;
        };
        this.slices = { shadow: mk('ShadowSlice', shadow, new pc.Color(0, 0, 0), 0.35, 8, -12), panel: mk('PanelSlice', panel) };
    }
    var setSlices = function (parts, dx, dy) {
        var mw = pw - 2 * ew;
        parts[0].element.width = ew; parts[0].element.rect = new pc.Vec4(0, 0, E, 1);
        parts[0].setLocalPosition(-pw / 2 + ew / 2 + dx, dy, 0);
        parts[1].element.width = mw; parts[1].element.rect = new pc.Vec4(E, 0, mw / P.w, 1);
        parts[1].setLocalPosition(dx, dy, 0);
        parts[2].element.width = ew; parts[2].element.rect = new pc.Vec4(1 - E, 0, E, 1);
        parts[2].setLocalPosition(pw / 2 - ew / 2 + dx, dy, 0);
    };
    if (this.slices) {
        setSlices(this.slices.shadow, 8, -12);
        setSlices(this.slices.panel, 0, 0);
        this.slices.shadow.concat(this.slices.panel).forEach(function (e) { e.enabled = portrait; });
    }
    if (panel) panel.enabled = !portrait;
    if (shadow) shadow.enabled = !portrait;
    // dar panelde başlık şeridine değmesin: köşeye yakın
    if (this.closeButton) this.closeButton.setLocalPosition(portrait ? pw / 2 - 40 : pw / 2 - 70, P.h / 2 - 70, 0);
    var vw = pw - 110;
    DsMarket.VIEW.w = vw;
    var well = root.findByName('Well'), sv = root.findByName('ScrollView'), vp = root.findByName('Viewport');
    if (well) well.element.width = vw + 30;
    if (sv) sv.element.width = vw;
    if (vp) vp.element.width = vw;
    if (this.bar) this.bar.element.width = Math.min(600, vw - 40);
    if (this.hint) this.hint.element.width = Math.min(700, pw - 60);
    this.setTab(this.tab);
};

// ---------------------------------------------------------------- alım
DsMarket.prototype.buy = function (o) {
    var it = o.item, self = this, ds = this.app.dontSplash;
    if (this.app.isWatchingAd) return;
    if (it.kind === 'skin') {
        var sd = DsStand.skinByName(it.skin);
        if (!sd || sd.isEquipped) return;
        if (sd.isBought) { DsStand.equipSkin(this.app, sd); this.refresh(); return; }   // reklamsız giy
    } else if (!DsStand.canGet(this.app, it.kind)) return;
    DsStand.grant(this.app, it.kind, it.skin, 'market', function () {
        self.refresh();
        o.e._hs = 1.1;   // alınca kart bir zıplasın
        if (ds) ds.play('success', 0.6);
        if (it.kind !== 'skin') self.app.fire('WarningTextController:setWarning', 'You got the ' + it.name.toLowerCase() + '!', 3, new pc.Color(0, 1, 0, 1));
    });
};

DsMarket.prototype.update = function (dt) {
    if (this.hudButton && this.hudButton.enabled) {
        this.hudPulse += dt;
        var s = 1 + Math.max(0, Math.sin(this.hudPulse * 3)) * 0.05;
        var im = this.hudButton.findByName('Image');
        if (im) im.setLocalScale(s, s, 1);
    }
    if (!this.isOpen()) return;
    this.glowT += dt;
    var ds = this.app.dontSplash;
    if (ds && (ds.caught || ds.finished)) { this.app.fire('CloseMenu'); return; }
    // M / ESC kapatır (açıldığı karedeki tuşa bakılmaz)
    var kb = this.app.keyboard;
    if (kb && this.app.frame !== this.openedAt && (kb.wasPressed(pc.KEY_M) || kb.wasPressed(pc.KEY_ESCAPE))) { this.app.fire('CloseMenu'); return; }
    // açılış: küçükten sekerek büyür
    var f = this.fit();
    if (this.root._pop < 1) {
        this.root._pop = Math.min(1, this.root._pop + dt / 0.28);
        var t = this.root._pop - 1, k = 1 + 2.7 * t * t * t + 1.7 * t * t;
        this.root.setLocalScale(f * k, f * k, 1);
    } else this.root.setLocalScale(f, f, 1);
    if (this.bar.enabled && this.handleFill) {
        var he = this.handleFill.parent.element;
        this.handleFill.element.width = he.calculatedWidth * 2;
        this.handleFill.element.height = he.calculatedHeight * 2;
    }
    // butonlar / kartlar
    for (var i = 0; i < this.anims.length; i++) {
        var e = this.anims[i];
        if (!e.enabled) continue;
        e._hs += (e._hv - e._hs) * Math.min(1, dt * 14);
        e.setLocalScale(e._hs, e._hs, 1);
    }
    for (var j = 0; j < this.cards.length; j++) {
        var c = this.cards[j].e;
        if (!c.enabled) continue;
        if (c._in > -1) {
            c._in -= dt;
            var a = pc.math.clamp(1 - c._in / 0.18, 0, 1);
            if (c._in < -0.2) { c._in = -2; a = 1; }
            c._hs = c._hs || 1;
            c.setLocalScale(0.8 + 0.2 * a, 0.8 + 0.2 * a, 1);
        } else {
            c._hs = c._hs || 1;
            c._hs += (1 - c._hs) * Math.min(1, dt * 10);
            c.setLocalScale(c._hs, c._hs, 1);
        }
    }
    for (var q = 0; q < this.cards.length; q++) {
        var bo = this.cards[q];
        if (!bo.e.enabled) continue;
        // nadirlik arttıkça ışın hızlı döner, kart çevresi daha güçlü ve hızlı parlar
        bo.burst.rotateLocal(0, 0, dt * (12 + 40 * bo.power));
        var gp = Math.min(1, bo.power * 1.2) * (0.6 + 0.4 * Math.sin(this.glowT * (2 + 3 * bo.power) + q * 0.7));
        bo.glow.element.opacity = gp * 0.45;
        bo.glowIn.element.opacity = gp;
    }
    this.rt = (this.rt || 0) + dt;
    if (this.rt > 0.3) { this.rt = 0; this.refresh(); }
};
