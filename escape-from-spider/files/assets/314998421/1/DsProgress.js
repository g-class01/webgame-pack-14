var DsProgress = pc.createScript('dsProgress');

// Ekranın üstünde ilerleme barı (kayan pencere): 20 bölümün hepsi sığmadığı için sadece bulunduğun bölüm ±3
// (7 daire) görünür; ilerledikçe bar yumuşakça kayar, kenara yaklaşan daireler solar. Sağında "14/20" sayacı.
// Geçilen bölümler bölüm renginde dolu, bulunduğun bölüm büyük ve parlıyor, gelecek bölümler gri.
// Sarı iğne sen, mavi noktalar diğer oyuncular. Yeni bölüme girince daire zıplar, bar parlar.
DsProgress.attributes.add('icons', { type: 'asset', assetType: 'texture', array: true, description: '(kullanılmıyor)' });
DsProgress.TEX = { circle: 196470260, flag: 196470405 };
DsProgress.SPR = { bar: 196470298 };
DsProgress.W = 600;       // pencere genişliği (referans px)
DsProgress.NODE = 40;     // daire çapı
DsProgress.SHOW = 7;      // pencerede aynı anda görünen daire sayısı
DsProgress.GREY = [0.25, 0.27, 0.32];

DsProgress.prototype.initialize = function () {
    this.time = 0;
    this.cur = -2;
    this.fill = 0;
    this.view = -1;
    this.flash = 0;
    this.shown = 0;
    this.bump = 0;
    this.dots = [];
    var self = this;
    var load = function (id) { var a = self.app.assets.get(id); if (a && !a.loaded) self.app.assets.load(a); };
    Object.keys(DsProgress.TEX).forEach(function (k) { load(DsProgress.TEX[k]); });
    Object.keys(DsProgress.SPR).forEach(function (k) { load(DsProgress.SPR[k]); });
    try { this.build(); } catch (e) { console.warn('DsProgress', e); }
    this.on('destroy', function () { if (this.root) this.root.destroy(); }, this);
};

DsProgress.prototype.img = function (parent, name, o) {
    var e = new pc.Entity(name);
    var d = {
        type: 'image', anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5), pivot: o.pivot || new pc.Vec2(0.5, 0.5),
        width: o.w, height: o.h, color: o.color || new pc.Color(1, 1, 1), opacity: o.opacity === undefined ? 1 : o.opacity, useInput: false
    };
    if (o.sprite) d.spriteAsset = o.sprite;
    if (o.tex) d.textureAsset = o.tex;
    e.addComponent('element', d);
    e.setLocalPosition(o.x || 0, o.y || 0, 0);
    parent.addChild(e);
    return e;
};

DsProgress.prototype.txt = function (parent, name, text, size, color) {
    var ds = this.app.dontSplash;
    var e = new pc.Entity(name);
    e.addComponent('element', {
        type: 'text', fontAsset: ds && ds.fontAsset ? ds.fontAsset.id : null, text: text, fontSize: size, autoWidth: true, autoHeight: true,
        anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5), pivot: new pc.Vec2(0.5, 0.5), color: color || new pc.Color(1, 1, 1),
        outlineColor: new pc.Color(0, 0, 0, 1), outlineThickness: 0.5, useInput: false
    });
    e.setLocalPosition(0, 1, 0);
    parent.addChild(e);
    return e;
};

// Bar parça parça: k. bölümün başı = k. daire, sonraki bölümün başı = (k+1). daire, çıkış = bayrak (n).
// Böylece bölüme yeni girmişken iğne dairenin hemen sağında durur, bölüm bitince bir sonrakine varır.
DsProgress.prototype.fracAt = function (z) {
    var S = DontSplashManager.SECTIONS, n = S.length;
    if (z < S[0].z0) return 0;
    for (var k = 0; k < n; k++) {
        // salon değişiminde aradaki boşluk sayılmaz: bölüm + 16 m'lik zemin
        var a = S[k].z0, b = k + 1 < n ? Math.min(S[k + 1].z0, S[k].z1 + 16) : DontSplashManager.END_Z;
        if (z < (k + 1 < n ? S[k + 1].z0 : b)) return (k + pc.math.clamp((z - a) / (b - a), 0, 1)) / n;
    }
    return 1;
};

// daire aralığı (pencerede SHOW daire)
DsProgress.prototype.step = function () {
    return DsProgress.W / (DsProgress.SHOW - 0.2);
};
// pencerenin ortası (daire biriminde): uçlarda pencere sabitlenir
DsProgress.prototype.viewFor = function (u) {
    var n = DontSplashManager.SECTIONS.length, h = (DsProgress.SHOW - 1) / 2;
    return n + 1 <= DsProgress.SHOW ? n / 2 : pc.math.clamp(u, h, n - h);
};
// daire biriminde u konumunun ekran x'i
DsProgress.prototype.xOf = function (u) {
    return (u - this.view) * this.step();
};
// pencerenin kenarına yaklaşınca solma (0..1)
DsProgress.prototype.fadeAt = function (x) {
    var edge = DsProgress.W / 2 + 4, soft = this.step() * 0.55;
    return pc.math.clamp((edge - Math.abs(x)) / soft, 0, 1);
};

DsProgress.prototype.build = function () {
    var ui = this.app.root.findByName('GameUI');
    if (!ui) return;
    var S = DontSplashManager.SECTIONS, W = DsProgress.W, N = DsProgress.NODE, T = DsProgress.TEX, SP = DsProgress.SPR, G = DsProgress.GREY;
    var root = new pc.Entity('DsProgress');
    root.addComponent('element', { type: 'group', anchor: new pc.Vec4(0.5, 1, 0.5, 1), pivot: new pc.Vec2(0.5, 0.5), width: W + 100, height: 100, useInput: false });
    root.setLocalPosition(0, -78, 0);
    // oyun HUD'unun hemen üstüne, menülerin (MENU, mağaza, market...) altına: paneller açılınca bar önlerine geçmesin
    var game = ui.findByName('Game');
    if (game && game.parent === ui) ui.insertChild(root, ui.children.indexOf(game) + 1); else ui.addChild(root);
    if (ui.screen && ui.screen.syncDrawOrder) ui.screen.syncDrawOrder();
    this.root = root;
    this.baseY = -78;

    // bar: gölge, beyaz kenar, koyu iç, kalın dolgu, üstte parıltı (pencere boyunca sabit; dolgu kayar)
    this.img(root, 'BarShadow', { sprite: SP.bar, w: W + 16, h: 30, y: -3, color: new pc.Color(0, 0, 0), opacity: 0.5 });
    this.img(root, 'BarBorder', { sprite: SP.bar, w: W + 10, h: 26, color: new pc.Color(1, 1, 1), opacity: 0.9 });
    this.img(root, 'BarBg', { sprite: SP.bar, w: W + 2, h: 18, color: new pc.Color(0.1, 0.12, 0.16) });
    this.fillE = this.img(root, 'BarFill', { sprite: SP.bar, w: 0, h: 18, x: -W / 2 - 1, pivot: new pc.Vec2(0, 0.5), color: new pc.Color(0.4, 0.85, 1) });
    this.shine = this.img(root, 'BarShine', { sprite: SP.bar, w: 0, h: 5, x: -W / 2 + 2, y: 4, pivot: new pc.Vec2(0, 0.5), color: new pc.Color(1, 1, 1), opacity: 0.45 });

    // bölüm daireleri (numaralı)
    var self = this;
    this.nodes = S.map(function (s, k) {
        var c = s.color || [1, 1, 1];
        var n = new pc.Entity('Node' + k);
        n.addComponent('element', { type: 'group', anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5), pivot: new pc.Vec2(0.5, 0.5), width: N, height: N, useInput: false });
        root.addChild(n);
        var col = new pc.Color(c[0], c[1], c[2]);
        var glow = self.img(n, 'Glow', { tex: T.circle, w: N * 1.9, h: N * 1.9, color: col, opacity: 0 });
        var shadow = self.img(n, 'Shadow', { tex: T.circle, w: N + 8, h: N + 8, y: -3, color: new pc.Color(0, 0, 0), opacity: 0.5 });
        var rim = self.img(n, 'Rim', { tex: T.circle, w: N + 6, h: N + 6, color: new pc.Color(0.6, 0.62, 0.66) });
        var face = self.img(n, 'Face', { tex: T.circle, w: N, h: N, color: new pc.Color(G[0], G[1], G[2]) });
        var num = self.txt(n, 'Num', String(k + 1), k + 1 >= 10 ? 24 : 28, new pc.Color(0.75, 0.77, 0.8));
        return { e: n, glow: glow, shadow: shadow, rim: rim, face: face, num: num, col: col, k: 1, kv: 0, state: 0, fade: -1 };
    });
    // çıkış bayrağı (n. konumda)
    var ex = new pc.Entity('ExitNode');
    ex.addComponent('element', { type: 'group', anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5), pivot: new pc.Vec2(0.5, 0.5), width: N, height: N, useInput: false });
    root.addChild(ex);
    this.exitE = ex;
    this.exitShadow = this.img(ex, 'ExitShadow', { tex: T.circle, w: N + 8, h: N + 8, y: -3, color: new pc.Color(0, 0, 0), opacity: 0.5 });
    this.exitRim = this.img(ex, 'ExitRim', { tex: T.circle, w: N + 6, h: N + 6, color: new pc.Color(1, 1, 1) });
    this.exitFace = this.img(ex, 'ExitFace', { tex: T.circle, w: N, h: N, color: new pc.Color(G[0], G[1], G[2]) });
    this.flag = this.img(ex, 'Exit', { tex: T.flag, w: 26, h: 26, x: 1, y: 1, color: new pc.Color(1, 1, 1) });
    this.atExit = false;

    // sağda sayaç: kaçıncı bölümdesin / toplam
    this.counter = this.txt(root, 'Counter', '0/' + S.length, 30, new pc.Color(1, 1, 1));
    this.counter.element.outlineThickness = 0.8;
    this.counter.setLocalPosition(W / 2 + 52, 1, 0);

    // diğer oyuncular (barın altında) ve sen (barın üstünde sarı iğne)
    this.dotRoot = new pc.Entity('Dots');
    this.dotRoot.addComponent('element', { type: 'group', anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5), pivot: new pc.Vec2(0.5, 0.5), width: W, height: 20, useInput: false });
    root.addChild(this.dotRoot);
    this.me = new pc.Entity('Me');
    this.me.addComponent('element', { type: 'group', anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5), pivot: new pc.Vec2(0.5, 0.5), width: 20, height: 20, useInput: false });
    root.addChild(this.me);
    this.img(this.me, 'Stem', { w: 5, h: 30, y: 22, color: new pc.Color(0, 0, 0), opacity: 0.75 });
    this.img(this.me, 'StemIn', { w: 3, h: 30, y: 22, color: new pc.Color(1, 0.86, 0.2) });
    this.img(this.me, 'Out', { tex: T.circle, w: 26, h: 26, y: 40, color: new pc.Color(0, 0, 0), opacity: 0.85 });
    this.meDot = this.img(this.me, 'Dot', { tex: T.circle, w: 20, h: 20, y: 40, color: new pc.Color(1, 0.86, 0.2) });
};

// en son girilen bölüm (bölümler arası zeminde hâlâ geçilen bölüm sayılır); başlangıçta -1, çıkışta S.length
DsProgress.prototype.currentIndex = function (z) {
    var S = DontSplashManager.SECTIONS, cur = -1;
    if (z >= DontSplashManager.END_Z) return S.length;
    for (var k = 0; k < S.length; k++) if (z >= S[k].z0) cur = k;
    return cur;
};

// dairenin tüm parçalarını kenar solmasına göre ayarla
DsProgress.prototype.setNodeFade = function (n, a) {
    if (Math.abs(n.fade - a) < 0.005) return;
    n.fade = a;
    n.e.enabled = a > 0.01;
    n.shadow.element.opacity = 0.5 * a;
    n.rim.element.opacity = a;
    n.face.element.opacity = a;
    n.num.element.opacity = a;
};

DsProgress.prototype.update = function (dt) {
    var ds = this.app.dontSplash;
    if (!this.root || !ds || !ds.player) return;
    this.time += dt;
    var S = DontSplashManager.SECTIONS, n = S.length, W = DsProgress.W, G = DsProgress.GREY;
    var z = ds.player.getPosition().z;
    var cur = this.currentIndex(z);

    // yakalanınca (sinematik bantlarının üstüne binmesin) ve yakalanma / kazanma panelinde yukarı kayıp gizlenir
    var want = (ds.caught || ds.downOpen || ds.winOpen) ? 0 : 1;
    this.shown += (want - this.shown) * Math.min(1, dt * 6);
    var hide = 1 - this.shown;
    if (cur !== this.cur) {
        if (this.cur > -2 && cur >= 0 && cur < n) { this.nodes[cur].kv = 10; this.flash = 1; this.bump = 1; }
        this.cur = cur;
        this.counter.element.text = Math.max(0, Math.min(n, cur + 1)) + '/' + n;
    }
    this.bump = Math.max(0, this.bump - dt * 2.5);
    var bs = 1 + Math.sin(this.bump * Math.PI) * 0.08;
    // dar/dikey ekran: çubuk ekrana sığacak kadar küçülür, dikeyde para göstergesinin altına iner
    var scr = this.root.element.screen && this.root.element.screen.screen, dev = this.app.graphicsDevice, fk = 1, dy = 0;
    if (scr && dev) {
        fk = Math.min(1, (dev.width / (scr.scale || 1) - 30) / (DsProgress.W + 200));
        if (dev.height > dev.width * 1.05) dy = -95;
    }
    this.root.setLocalScale(bs * fk, bs * fk, 1);
    // gizlenirken ekranın üstünden tamamen çıkar (dikeyde aşağı inmiş olsa da)
    this.root.setLocalPosition(0, this.baseY + dy + hide * (130 - dy), 0);
    var vis = hide < 0.98;
    if (this.root.enabled !== vis) this.root.enabled = vis;
    if (!vis) return;

    // ilerleme (daire biriminde) ve pencere: ışınlanınca (salon değişimi, ölüm) hızlıca, yürürken yumuşak kayar
    this.fill += (this.fracAt(z) - this.fill) * Math.min(1, dt * 5);
    var u = this.fill * n;
    var tv = this.viewFor(u);
    if (this.view < 0) this.view = tv;
    this.view += (tv - this.view) * Math.min(1, dt * 4);

    // dolgu: barın başı (0) ile senin konumun arası, pencereye kırpılmış; bulunduğun bölümün renginde
    var x0 = Math.max(-W / 2, this.xOf(0)), x1 = Math.min(W / 2, this.xOf(u));
    this.fillE.setLocalPosition(x0 - 1, 0, 0);
    this.fillE.element.width = Math.max(0, x1 - x0 + 2);
    this.shine.setLocalPosition(x0 + 2, 4, 0);
    this.shine.element.width = Math.max(0, x1 - x0 - 6);
    var cc = S[Math.min(n - 1, Math.max(0, cur))].color || [1, 1, 1];
    if (!this.fillCol) { this.fillCol = new pc.Color(cc[0], cc[1], cc[2]); this.tmpCol = new pc.Color(); }
    this.tmpCol.set(cc[0], cc[1], cc[2], 1);
    this.fillCol.lerp(this.fillCol, this.tmpCol, Math.min(1, dt * 3));
    this.fillE.element.color = this.fillCol;
    this.shine.element.opacity = 0.35 + 0.15 * Math.sin(this.time * 3) + this.flash * 0.5;
    this.flash = Math.max(0, this.flash - dt * 1.6);

    // daireler: 0 gelecek (gri), 1 geçildi (renkli), 2 şu an (renkli, büyük, parlıyor)
    for (var k = 0; k < this.nodes.length; k++) {
        var nd = this.nodes[k];
        var x = this.xOf(k), a = this.fadeAt(x);
        nd.e.setLocalPosition(x, 0, 0);
        this.setNodeFade(nd, a);
        if (a <= 0.01) continue;
        var st = k < cur ? 1 : (k === cur ? 2 : 0);
        if (st !== nd.state) {
            nd.state = st;
            nd.face.element.color = st ? nd.col : new pc.Color(G[0], G[1], G[2]);
            nd.rim.element.color = st ? new pc.Color(1, 1, 1) : new pc.Color(0.6, 0.62, 0.66);
            nd.num.element.color = st ? new pc.Color(1, 1, 1) : new pc.Color(0.75, 0.77, 0.8);
        }
        var target = st === 2 ? 1.35 : 1;
        nd.kv += ((target - nd.k) * 160 - nd.kv * 12) * dt;
        nd.k += nd.kv * dt;
        nd.e.setLocalScale(nd.k, nd.k, 1);
        nd.glow.element.opacity = st === 2 ? (0.35 + 0.2 * Math.sin(this.time * 4)) * a : 0;
    }
    var exX = this.xOf(n), exA = this.fadeAt(exX);
    this.exitE.setLocalPosition(exX, 0, 0);
    this.exitE.enabled = exA > 0.01;
    this.exitShadow.element.opacity = 0.5 * exA; this.exitRim.element.opacity = exA; this.exitFace.element.opacity = exA; this.flag.element.opacity = exA;
    var atExit = cur >= n;
    if (atExit !== this.atExit) {
        this.atExit = atExit;
        this.exitFace.element.color = atExit ? new pc.Color(0.3, 0.85, 0.4) : new pc.Color(G[0], G[1], G[2]);
    }
    var fs = atExit ? 1.2 + 0.1 * Math.sin(this.time * 5) : 1;
    this.flag.setLocalScale(fs, fs, 1);

    // sen
    this.me.setLocalPosition(pc.math.clamp(this.xOf(u), -W / 2, W / 2), 0, 0);
    var pulse = 1 + 0.12 * Math.sin(this.time * 6);
    this.meDot.setLocalScale(pulse, pulse, 1);

    // diğer oyuncular (pencerenin dışındakiler gizli)
    var room = this.app.room, list = [];
    if (room && room.state && room.state.players) {
        var mySid = room.sessionId;
        room.state.players.forEach(function (p, sid) { if (sid !== mySid && p.position) list.push(p.position.z); });
    }
    while (this.dots.length < list.length) {
        this.dots.push(this.img(this.dotRoot, 'P', { tex: DsProgress.TEX.circle, w: 13, h: 13, color: new pc.Color(0.55, 0.85, 1), opacity: 0.95 }));
    }
    for (var i = 0; i < this.dots.length; i++) {
        var dx = i < list.length ? this.xOf(this.fracAt(list[i]) * n) : 0;
        var da = i < list.length ? this.fadeAt(dx) : 0;
        this.dots[i].enabled = da > 0.01;
        if (da > 0.01) { this.dots[i].setLocalPosition(dx, -32, 0); this.dots[i].element.opacity = 0.95 * da; }
    }
};
