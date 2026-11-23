var DsAtmosphere = pc.createScript('dsAtmosphere');

// Don't Splash atmosferi (ışık kullanmadan, mobilde de ucuz):
//  - bölgeye göre sis/ortam rengi (başlangıç sıcak, havuz soğuk mavi, 2. bölge kırmızı acil durum)
//  - sudan yansıyan dalgalı ışık (caustics): sütun, platform ve duvar diplerinde kayan desen (tek çizim)
//  - su üstünde kayan alçak sis (iki ince katman)
//  - tavandan sarkan floresanlar, bazıları titrer; altlarında sahte ışık hüzmesi (ışık değil, saydam düzlem)
//  - çıkışta yanan yeşil EXIT tabelası
//  - tavandan damlayan su (sadece görüntü, canavarı çağırmaz)
//  - avlanan canavarın üstünde kabarcıklar, yakında koşarken hafif kamera sarsıntısı
//  - ekranda çok hafif film greni
// Hepsi aydınlatmasız (unlit) malzemeler ve elle üretilmiş dokularla yapılır.

DsAtmosphere.POOL = { x: 61, z0: 0, z1: 376 };
// Havuzun uzunluğu bölümlere göre (DontSplashManager.SECTIONS)
DsAtmosphere.pool = function () {
    var M = window.DontSplashManager;
    return { x: 61, z0: 0, z1: M && M.END_Z ? M.END_Z : DsAtmosphere.POOL.z1 };
};
DsAtmosphere.sections = function () {
    var M = window.DontSplashManager;
    return M && M.SECTIONS ? M.SECTIONS : [{ z0: 0, z1: 200 }, { z0: 216, z1: 376 }];
};
// Her bölümün havası: sis/ortam rengi ve floresan rengi (null: sahnedeki ayar)
// 20 bölüm (DontSplashManager.SECTIONS sırasıyla): ilerledikçe hava kararıp kızarır
DsAtmosphere.SECTION_LOOK = [
    { tint: null, lamp: 'cool' },                                              // 1 WARM UP
    { tint: null, lamp: 'cool' },                                              // 2 THE POOL
    { tint: [[0.03, 0.065, 0.06], [0.36, 0.48, 0.45]], lamp: 'green' },        // 3 MEMORY BRIDGE
    { tint: [[0.075, 0.05, 0.03], [0.52, 0.42, 0.33]], lamp: 'amber' },        // 4 CRUMBLING TILES
    { tint: [[0.035, 0.06, 0.065], [0.38, 0.46, 0.48]], lamp: 'cool' },        // 5 STEPPING STONES
    { tint: [[0.06, 0.022, 0.027], [0.44, 0.31, 0.33]], lamp: 'red' },         // 6 MOVING FLOOR
    { tint: [[0.05, 0.03, 0.075], [0.40, 0.34, 0.50]], lamp: 'violet' },       // 7 SINKING TILES
    { tint: [[0.075, 0.045, 0.025], [0.50, 0.40, 0.30]], lamp: 'amber' },      // 8 CRUMBLE RUN
    { tint: [[0.06, 0.05, 0.02], [0.46, 0.42, 0.30]], lamp: 'amber' },         // 9 MIXED TILES
    { tint: [[0.065, 0.035, 0.03], [0.44, 0.34, 0.31]], lamp: 'amber' },       // 10 SHAKY GROUND
    { tint: [[0.065, 0.02, 0.03], [0.42, 0.29, 0.32]], lamp: 'red' },          // 11 SLIDING TILES
    { tint: [[0.07, 0.035, 0.015], [0.46, 0.33, 0.26]], lamp: 'amber' },       // 12 CRUMBLE CHAOS
    { tint: [[0.045, 0.025, 0.07], [0.36, 0.30, 0.46]], lamp: 'violet' },      // 13 SINKING SPRINT
    { tint: [[0.065, 0.018, 0.03], [0.42, 0.28, 0.32]], lamp: 'red' },         // 14 MOVING MAZE
    { tint: [[0.06, 0.02, 0.06], [0.40, 0.27, 0.40]], lamp: 'violet' },        // 15 NIGHTMARE MIX
    { tint: [[0.065, 0.018, 0.03], [0.42, 0.28, 0.32]], lamp: 'red' },         // 16 FAST FLOOR
    { tint: [[0.045, 0.025, 0.07], [0.36, 0.30, 0.46]], lamp: 'violet' },      // 17 SINK OR SWIM
    { tint: [[0.07, 0.012, 0.018], [0.40, 0.24, 0.26]], lamp: 'red' },         // 18 THE DEEP END
    { tint: [[0.07, 0.01, 0.015], [0.38, 0.22, 0.24]], lamp: 'red' },          // 19 LAST STAND
    { tint: [[0.075, 0.008, 0.012], [0.36, 0.20, 0.22]], lamp: 'red' }         // 20 FINAL ESCAPE
];
// Bölge renkleri: [sis, ortam]
DsAtmosphere.TINTS = {
    start: [[0.075, 0.058, 0.042], [0.50, 0.44, 0.38]],
    pool: null,   // sahnedeki ayar (editördeki)
    mid: [[0.07, 0.056, 0.045], [0.48, 0.43, 0.39]],
    deep: [[0.06, 0.022, 0.027], [0.44, 0.31, 0.33]],
    end: [[0.035, 0.065, 0.05], [0.38, 0.47, 0.42]]
};

DsAtmosphere.prototype.initialize = function () {
    this.time = 0;
    this.device = this.app.graphicsDevice;
    this.mobile = !!this.app.isMobile;
    this.textures = [];
    this.materials = [];
};

DsAtmosphere.prototype.postInitialize = function () {
    var sc = this.app.scene;
    var fc = sc.fog && sc.fog.color ? sc.fog.color : sc.fogColor;
    DsAtmosphere.TINTS.pool = [[fc.r, fc.g, fc.b], [sc.ambientLight.r, sc.ambientLight.g, sc.ambientLight.b]];
    this.curFog = DsAtmosphere.TINTS.pool[0].slice();
    this.curAmb = DsAtmosphere.TINTS.pool[1].slice();

    this.root = new pc.Entity('DsAtmosphere');
    this.app.root.addChild(this.root);
    try { this.buildCaustics(); } catch (e) { console.warn('caustics', e); }
    try { this.buildMist(); } catch (e) { console.warn('mist', e); }
    try { this.buildLamps(); } catch (e) { console.warn('lamps', e); }
    // Çıkışta artık lobideki kapı modeli var (ExitDoor); elle çizilen EXIT tabelası kaldırıldı
    try { this.buildDrips(); } catch (e) { console.warn('drips', e); }
    try { this.buildBubbles(); } catch (e) { console.warn('bubbles', e); }
    try { this.buildSpray(); } catch (e) { console.warn('spray', e); }
    this.on('destroy', this.onDestroy, this);
};

DsAtmosphere.prototype.onDestroy = function () {
    if (this.root) this.root.destroy();
    if (this.grain) this.grain.destroy();
    if (this.redFlash) this.redFlash.destroy();
    if (this.fearDark) this.fearDark.destroy();
    this.textures.forEach(function (t) { t.destroy(); });
    this.textures = [];
};

// ---------------------------------------------------------------- yardımcılar
DsAtmosphere.prototype.canvasTex = function (canvas, repeat) {
    var t = new pc.Texture(this.device, {
        width: canvas.width, height: canvas.height, format: pc.PIXELFORMAT_RGBA8, mipmaps: true,
        addressU: repeat ? pc.ADDRESS_REPEAT : pc.ADDRESS_CLAMP_TO_EDGE,
        addressV: repeat ? pc.ADDRESS_REPEAT : pc.ADDRESS_CLAMP_TO_EDGE
    });
    t.setSource(canvas);
    this.textures.push(t);
    return t;
};

// Işıksız, saydam/toplamalı malzeme
DsAtmosphere.prototype.glowMat = function (color, opts) {
    opts = opts || {};
    var m = new pc.StandardMaterial();
    m.useLighting = false;
    m.diffuse = new pc.Color(0, 0, 0);
    m.emissive = color.clone ? color.clone() : color;
    m.emissiveIntensity = opts.intensity || 1;
    if (opts.map) m.emissiveMap = opts.map;
    if (opts.opacityMap) { m.opacityMap = opts.opacityMap; m.opacityMapChannel = opts.opacityChannel || 'a'; }
    if (opts.vertexAlpha) { m.opacityVertexColor = true; m.opacityVertexColorChannel = 'a'; }
    m.opacity = opts.opacity === undefined ? 1 : opts.opacity;
    m.blendType = opts.blend === undefined ? pc.BLEND_ADDITIVEALPHA : opts.blend;
    m.depthWrite = false;
    m.cull = opts.cull === undefined ? pc.CULLFACE_NONE : opts.cull;
    m.useFog = opts.fog !== false;
    m.update();
    this.materials.push(m);
    return m;
};

DsAtmosphere.prototype.meshEntity = function (name, pos, uv, col, idx, mat) {
    var mesh = new pc.Mesh(this.device);
    mesh.setPositions(pos);
    mesh.setUvs(0, uv);
    var nr = new Float32Array(pos.length);
    for (var i = 1; i < nr.length; i += 3) nr[i] = 1;
    mesh.setNormals(nr);
    if (col) mesh.setColors32(col);
    mesh.setIndices(idx);
    mesh.update();
    var mi = new pc.MeshInstance(mesh, mat);
    var e = new pc.Entity(name);
    e.addComponent('render', { meshInstances: [mi], castShadows: false, receiveShadows: false });
    this.root.addChild(e);
    return e;
};

// ---------------------------------------------------------------- bölge rengi
DsAtmosphere.prototype.zoneTint = function (z) {
    var T = DsAtmosphere.TINTS, S = DsAtmosphere.sections(), L = DsAtmosphere.SECTION_LOOK;
    if (z < -1) return T.start;
    for (var i = 0; i < S.length; i++) {
        if (z < S[i].z0 - 1) return T.mid;                       // bölümden önceki güvenli zemin
        if (z < S[i].z1 - 1) return (L[i] && L[i].tint) || T.pool;
    }
    return T.end;
};

DsAtmosphere.prototype.updateTint = function (dt) {
    var ds = this.app.dontSplash;
    if (!ds || !ds.player) return;
    var t = this.zoneTint(ds.player.getPosition().z);
    var k = Math.min(1, dt * 1.2);
    for (var i = 0; i < 3; i++) {
        this.curFog[i] += (t[0][i] - this.curFog[i]) * k;
        this.curAmb[i] += (t[1][i] - this.curAmb[i]) * k;
    }
    var sc = this.app.scene;
    var c = sc.fog && sc.fog.color ? sc.fog.color : sc.fogColor;
    c.set(this.curFog[0], this.curFog[1], this.curFog[2]);
    if (sc.fog && sc.fog.color) sc.fog.color = c; else sc.fogColor = c;
    var a = sc.ambientLight;
    a.set(this.curAmb[0], this.curAmb[1], this.curAmb[2]);
    sc.ambientLight = a;
    // havuz içi lamba/hüzme rengi de bölgeye uysun (2. bölge kırmızımsı)
};

// ---------------------------------------------------------------- caustics
DsAtmosphere.prototype.causticTexture = function () {
    var N = 128, P = 14, rnd = this.rand(7);
    var pts = [];
    for (var i = 0; i < P; i++) pts.push([rnd() * N, rnd() * N]);
    var c = document.createElement('canvas');
    c.width = c.height = N;
    var g = c.getContext('2d');
    var img = g.createImageData(N, N);
    for (var y = 0; y < N; y++) {
        for (var x = 0; x < N; x++) {
            var f1 = 1e9, f2 = 1e9;
            for (var p = 0; p < P; p++) {
                var dx = Math.abs(x - pts[p][0]); dx = Math.min(dx, N - dx);
                var dy = Math.abs(y - pts[p][1]); dy = Math.min(dy, N - dy);
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
            }
            var v = 1 - Math.min(1, (f2 - f1) / 7);
            v = Math.pow(v, 3);
            var o = (y * N + x) * 4;
            img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.round(v * 255);
            img.data[o + 3] = 255;
        }
    }
    g.putImageData(img, 0, 0);
    return this.canvasTex(c, true);
};

DsAtmosphere.prototype.rand = function (seed) {
    var s = seed || 1;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
};

DsAtmosphere.prototype.buildCaustics = function () {
    var ds = this.app.dontSplash;
    var pos = [], uv = [], col = [], idx = [];
    var TILE = 3.2;
    var add = function (x0, z0, x1, z1, yb, yt) {
        // dikey şerit (x0,z0)-(x1,z1); altta parlak, üstte söner
        var b = pos.length / 3, len = Math.hypot(x1 - x0, z1 - z0);
        pos.push(x0, yb, z0, x1, yb, z1, x1, yt, z1, x0, yt, z0);
        var u0 = (x0 + z0) / TILE, u1 = u0 + len / TILE;
        uv.push(u0, yb / TILE, u1, yb / TILE, u1, yt / TILE, u0, yt / TILE);
        col.push(0xffffffff, 0xffffffff, 0x00ffffff, 0x00ffffff);
        idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    };
    var box = function (cx, cz, hx, hz, yb, yt) {
        var e = 0.03;
        hx += e; hz += e;
        add(cx - hx, cz - hz, cx + hx, cz - hz, yb, yt);
        add(cx + hx, cz - hz, cx + hx, cz + hz, yb, yt);
        add(cx + hx, cz + hz, cx - hx, cz + hz, yb, yt);
        add(cx - hx, cz + hz, cx - hx, cz - hz, yb, yt);
    };
    var inPool = function (p) { return Math.abs(p.x) < 61 && (ds ? ds.roomIndexAt(p.z) >= 0 : true); };
    var list = (ds ? ds.entity : this.app.root).find(function (e) {
        if (!/^(Pillar|PillarB|FloorPillar|Plat|PlatB|Tall)\d+$/.test(e.name) || !e.enabled) return false;
        // hareket eden / batan bloklara yapışık şerit olmaz
        var T = ['DSMemTile', 'DSPusher', 'DSValve', 'DSSinking', 'DSRotator', 'DSMover', 'DSSlider'];
        for (var i = 0; i < T.length; i++) if (e.tags.has(T[i])) return false;
        return true;
    });
    list.forEach(function (e) {
        var p = e.getPosition(), s = e.getLocalScale();
        if (!inPool(p)) return;
        var top = p.y + s.y / 2;
        var yt = /^Pillar/.test(e.name) ? 3.6 : Math.min(top - 0.05, 3.6);
        if (yt < 0.3) return;
        box(p.x, p.z, s.x / 2, s.z / 2, 0.02, yt);
    });
    // yan duvarlar ve zeminlerin havuza bakan yüzleri
    var X = DsAtmosphere.POOL.x - 0.03;
    DsAtmosphere.sections().map(function (q) { return [q.z0, q.z1]; }).forEach(function (r) {
        add(-X, r[0], -X, r[1], 0.02, 4.2);
        add(X, r[1], X, r[0], 0.02, 4.2);
        add(-X, r[0] + 0.03, X, r[0] + 0.03, 0.02, 1.2);
        add(X, r[1] - 0.03, -X, r[1] - 0.03, 0.02, 1.2);
    });
    if (!pos.length) return;
    this.causticTex = this.causticTexture();
    var mat = this.glowMat(new pc.Color(0.32, 0.62, 0.7), { map: this.causticTex, vertexAlpha: true, opacity: 0.55 });
    this.causticMat = mat;
    var vcol = new Uint32Array(col);
    this.meshEntity('Caustics', pos, uv, new Uint8Array(vcol.buffer), idx, mat);
};

DsAtmosphere.prototype.updateCaustics = function (dt) {
    var m = this.causticMat;
    if (!m) return;
    var t = this.time;
    m.emissiveMapOffset = new pc.Vec2(t * 0.045, -t * 0.03 + Math.sin(t * 0.7) * 0.03);
    m.emissiveIntensity = 0.85 + Math.sin(t * 1.3) * 0.15;
    m.update();
};

// ---------------------------------------------------------------- alçak sis
DsAtmosphere.prototype.noiseTexture = function (N, cells, seed) {
    var rnd = this.rand(seed);
    var grid = [];
    for (var i = 0; i < cells * cells; i++) grid.push(rnd());
    var val = function (x, y) {
        var xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
        var a = grid[((yi % cells) * cells) + (xi % cells)], b = grid[((yi % cells) * cells) + ((xi + 1) % cells)];
        var c = grid[(((yi + 1) % cells) * cells) + (xi % cells)], d = grid[(((yi + 1) % cells) * cells) + ((xi + 1) % cells)];
        fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
        return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
    };
    var cv = document.createElement('canvas');
    cv.width = cv.height = N;
    var g = cv.getContext('2d');
    var img = g.createImageData(N, N);
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
        var v = 0, amp = 0.55, f = cells / N, tot = 0;
        for (var o = 0; o < 3; o++) {
            // her oktav tam sayı hücreye bölünür, doku dikişsiz tekrar eder
            v += val(x * f * Math.pow(2, o), y * f * Math.pow(2, o)) * amp; tot += amp; amp *= 0.5;
        }
        v /= tot;
        v = Math.max(0, Math.min(1, (v - 0.35) * 2));
        var p = (y * N + x) * 4;
        img.data[p] = img.data[p + 1] = img.data[p + 2] = 255;
        img.data[p + 3] = Math.round(v * 255);
    }
    g.putImageData(img, 0, 0);
    return this.canvasTex(cv, true);
};

DsAtmosphere.prototype.buildMist = function () {
    var tex = this.noiseTexture(128, 4, 11);
    var P = DsAtmosphere.pool();
    this.mist = [];
    var layers = [[0.55, 0.32, [1, 0.6]], [0.95, 0.22, [-0.7, 0.9]]];
    for (var i = 0; i < layers.length; i++) {
        var L = layers[i];
        var m = this.glowMat(new pc.Color(0.55, 0.65, 0.72), { opacityMap: tex, opacityChannel: 'a', opacity: L[1], blend: pc.BLEND_NORMAL });
        m.opacityMapTiling = new pc.Vec2(122 / 34, (P.z1 - P.z0) / 34);
        m.update();
        var e = new pc.Entity('Mist' + i);
        e.addComponent('render', { type: 'plane', castShadows: false, receiveShadows: false });
        e.render.meshInstances[0].material = m;
        // en son çizilsin (suyun ve efektlerin üstünde ince bir tabaka)
        e.render.meshInstances[0].calculateSortDistance = function () { return -1e6 + i; };
        e.setPosition(0, L[0], (P.z0 + P.z1) / 2);
        e.setLocalScale(122, 1, P.z1 - P.z0);
        this.root.addChild(e);
        this.mist.push({ mat: m, dir: L[2], speed: 0.006 + i * 0.003 });
    }
};

DsAtmosphere.prototype.updateMist = function () {
    if (!this.mist) return;
    for (var i = 0; i < this.mist.length; i++) {
        var l = this.mist[i];
        l.mat.opacityMapOffset = new pc.Vec2(this.time * l.speed * l.dir[0], this.time * l.speed * l.dir[1]);
        l.mat.update();
    }
};

// ---------------------------------------------------------------- floresanlar
// Atlas: sol yarı ışık hüzmesi (üstte dar ve parlak, aşağı genişleyip söner), sağ yarı yuvarlak parıltı
DsAtmosphere.prototype.lampAtlas = function () {
    var W = 256, H = 128;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var g = c.getContext('2d');
    var img = g.createImageData(W, H);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var a;
        if (x < 128) {
            var v = y / (H - 1);                       // 0 üst (lamba), 1 alt
            var half = 0.12 + v * 0.36;
            var dx = Math.abs((x + 0.5) / 128 - 0.5) / half;
            a = 0.75 * Math.max(0, 1 - dx * dx) * Math.pow(1 - v, 1.4);
            if (x < 2 || x > 125) a = 0;
        } else {
            var rx = (x - 128 + 0.5) / 64 - 1, ry = (y + 0.5) / 64 - 1;
            var r = Math.sqrt(rx * rx + ry * ry);
            a = r >= 0.96 ? 0 : Math.pow(1 - r / 0.96, 1.5);
        }
        var o = (y * W + x) * 4;
        img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
        img.data[o + 3] = Math.round(Math.min(1, a) * 255);
    }
    g.putImageData(img, 0, 0);
    return this.canvasTex(c, false);
};

// Birleşik geometri: her renk/titreme grubu 2 çizim (tüp + parıltı), tüm kasa ve teller 1 çizim
DsAtmosphere.Geo = function () { this.p = []; this.n = []; this.u = []; this.i = []; };
DsAtmosphere.Geo.prototype.quad = function (a, b, c, d, n, uv) {
    var k = this.p.length / 3;
    this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
    for (var j = 0; j < 4; j++) this.n.push(n[0], n[1], n[2]);
    // uv: [u0, v0, u1, v1] -> a=(u0,v1) b=(u1,v1) c=(u1,v0) d=(u0,v0)  (a,b üst kenar)
    this.u.push(uv[0], uv[3], uv[2], uv[3], uv[2], uv[1], uv[0], uv[1]);
    this.i.push(k, k + 1, k + 2, k, k + 2, k + 3);
};
DsAtmosphere.Geo.prototype.box = function (cx, cy, cz, sx, sy, sz) {
    var x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
    var U = [0, 0, 1, 1];
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1], [0, 0, 1], U);
    this.quad([x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0], [0, 0, -1], U);
    this.quad([x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1], [1, 0, 0], U);
    this.quad([x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0], [-1, 0, 0], U);
    this.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0], U);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0], U);
};
DsAtmosphere.prototype.geoEntity = function (name, geo, mat) {
    if (!geo.p.length) return null;
    var mesh = new pc.Mesh(this.device);
    mesh.setPositions(geo.p);
    mesh.setNormals(geo.n);
    mesh.setUvs(0, geo.u);
    mesh.setIndices(geo.i);
    mesh.update();
    var e = new pc.Entity(name);
    e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat)], castShadows: false, receiveShadows: false });
    this.root.addChild(e);
    return e;
};

DsAtmosphere.prototype.buildLamps = function () {
    var self = this;
    var atlas = this.lampAtlas();
    var LY = 12, TOP = 40.5;
    var wl = (this.app.dontSplash && this.app.dontSplash.waterLevel) || 0;
    var COLORS = {
        cool: new pc.Color(0.75, 0.9, 1),
        warm: new pc.Color(1, 0.85, 0.6),
        red: new pc.Color(1, 0.25, 0.2),
        green: new pc.Color(0.5, 1, 0.65),
        amber: new pc.Color(1, 0.62, 0.28),
        violet: new pc.Color(0.75, 0.5, 1)
    };
    var groups = {};
    var group = function (kind, flicker) {
        var key = kind + flicker;
        if (groups[key]) return groups[key];
        var c = COLORS[kind];
        // tüp sisten etkilenmez: uzaktan sisin içinde parlayan nokta gibi görünür
        var tube = self.glowMat(c, { blend: pc.BLEND_NONE, intensity: 1.6, fog: false, cull: pc.CULLFACE_BACK });
        tube.depthWrite = true; tube.update();
        var glow = self.glowMat(c, { opacityMap: atlas, opacityChannel: 'a', opacity: kind === 'red' ? 0.55 : 0.45 });
        groups[key] = { tube: tube, glow: glow, tg: new DsAtmosphere.Geo(), gg: new DsAtmosphere.Geo(), flicker: flicker,
            base: { tube: 1.6, glow: glow.opacity }, k: 1, t: 0, burst: 0 };
        return groups[key];
    };
    var dark = new DsAtmosphere.Geo();
    // atlas satır 0 dokunun altına düşer: hüzmenin üstü v=0
    var BEAM = [0.01, 1, 0.49, 0], RAD = [0.5, 0, 1, 1];
    var lamp = function (x, z, kind, flicker) {
        var g = group(kind, flicker);
        g.tg.box(x, LY, z, 4, 0.3, 0.7);
        dark.box(x, LY + 0.24, z, 4.2, 0.18, 0.9);
        dark.box(x - 1.4, (LY + TOP) / 2, z, 0.05, TOP - LY, 0.05);
        dark.box(x + 1.4, (LY + TOP) / 2, z, 0.05, TOP - LY, 0.05);
        var gg = g.gg, hw = 4, by = wl + 0.3;
        // sahte ışık hüzmesi: çapraz iki dikey düzlem
        gg.quad([x - hw, LY, z], [x + hw, LY, z], [x + hw, by, z], [x - hw, by, z], [0, 0, 1], BEAM);
        gg.quad([x, LY, z - hw], [x, LY, z + hw], [x, by, z + hw], [x, by, z - hw], [1, 0, 0], BEAM);
        // tüpün etrafında parıltı (çapraz)
        gg.quad([x - 4.5, LY + 2.2, z], [x + 4.5, LY + 2.2, z], [x + 4.5, LY - 2.2, z], [x - 4.5, LY - 2.2, z], [0, 0, 1], RAD);
        gg.quad([x, LY + 1.6, z - 2.2], [x, LY + 1.6, z + 2.2], [x, LY - 1.6, z + 2.2], [x, LY - 1.6, z - 2.2], [1, 0, 0], RAD);
        // (suya düşen yuvarlak ışık lekesi kaldırıldı: lamba görünmeyince suyun altında ay gibi duruyordu)
    };
    // başlangıç ve ara zeminler sıcak, 1. bölge soğuk, 2. bölge kırmızı acil durum, çıkış yeşil
    // her bölümün kendi rengi; aradaki güvenli zeminler sıcak, çıkış yeşil
    var SEC = DsAtmosphere.sections(), LOOK = DsAtmosphere.SECTION_LOOK;
    lamp(-20, -14, 'warm', 0); lamp(20, -14, 'warm', 0);
    SEC.forEach(function (q, k) {
        var kind = (LOOK[k] && LOOK[k].lamp) || 'cool';
        if (k > 0) {
            var hallGap = q.z0 - SEC[k - 1].z1 > 40;   // 2. salonun başı: önceki salonun sonunda yeşil kapı lambaları, yeni salonun başlangıç zemini sıcak
            if (hallGap) { lamp(-18, SEC[k - 1].z1 + 8, 'green', 0); lamp(18, SEC[k - 1].z1 + 8, 'green', 0); }
            var fz = hallGap ? q.z0 - 14 : (SEC[k - 1].z1 + q.z0) / 2;
            lamp(-20, fz, 'warm', 0); lamp(20, fz, 'warm', k % 2 ? 2 : 0);
        }
        var last = k === SEC.length - 1;
        for (var z = q.z0 + 20, i = 0; z < q.z1 - 8; z += 34, i++) {
            if (k === 0) {
                lamp(i % 2 ? 26 : -26, z, kind, (i % 3 === 1) ? 1 : 0);
                if (i % 2 === 0 && z + 17 < q.z1 - 8) lamp(i % 4 ? -38 : 40, z + 17, kind, (i === 2) ? 2 : 0);
            } else {
                lamp((i + k) % 2 ? -24 : 24, z, kind, last ? 1 : ((i + k) % 3 === 0 ? 2 : 0));
            }
        }
    });
    var EZ = DsAtmosphere.pool().z1;
    lamp(-18, EZ + 8, 'green', 0); lamp(18, EZ + 8, 'green', 0);
    var darkMat = new pc.StandardMaterial();
    darkMat.diffuse = new pc.Color(0.05, 0.05, 0.06);
    darkMat.update();
    this.geoEntity('LampWires', dark, darkMat);
    Object.keys(groups).forEach(function (k) {
        var g = groups[k];
        self.geoEntity('LampTubes_' + k, g.tg, g.tube);
        var ge = self.geoEntity('LampGlow_' + k, g.gg, g.glow);
        g.tg = g.gg = null;
    });
    this.lampMats = Object.keys(groups).map(function (k) { return groups[k]; });
    this.lampRnd = this.rand(23);
};

// Titreme: çoğu zaman yanık, arada kısa sönüp yanmalar
DsAtmosphere.prototype.updateLamps = function (dt) {
    if (!this.lampMats) return;
    for (var i = 0; i < this.lampMats.length; i++) {
        var m = this.lampMats[i];
        if (!m.flicker) continue;
        m.t -= dt;
        if (m.burst > 0) {
            m.burst -= dt;
            if (m.t <= 0) { m.k = m.k > 0.5 ? 0.08 + this.lampRnd() * 0.2 : 1; m.t = 0.03 + this.lampRnd() * 0.09; }
            if (m.burst <= 0) { m.k = this.lampRnd() < 0.2 ? 0.1 : 1; m.t = 1.5 + this.lampRnd() * (m.flicker === 1 ? 3 : 6); }
        } else if (m.t <= 0) {
            m.burst = 0.25 + this.lampRnd() * 0.6;
            m.t = 0;
        }
        var tube = m.base.tube * m.k;
        if (m.tube.emissiveIntensity === tube) continue;
        m.tube.emissiveIntensity = tube; m.tube.update();
        m.glow.opacity = m.base.glow * m.k; m.glow.update();
    }
};

DsAtmosphere.prototype.buildExitSign = function () {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 96;
    var g = c.getContext('2d');
    g.fillStyle = '#062a12';
    g.fillRect(0, 0, 256, 96);
    g.strokeStyle = '#3dff7a';
    g.lineWidth = 6;
    g.strokeRect(6, 6, 244, 84);
    g.fillStyle = '#7dffa8';
    g.font = 'bold 66px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('EXIT', 128, 52);
    var tex = this.canvasTex(c, false);
    var m = this.glowMat(new pc.Color(1, 1, 1), { map: tex, blend: pc.BLEND_NONE, intensity: 1.3, cull: pc.CULLFACE_NONE });
    m.depthWrite = true; m.update();
    var e = new pc.Entity('ExitSign');
    e.addComponent('render', { type: 'plane', castShadows: false, receiveShadows: false });
    e.render.meshInstances[0].material = m;
    // düzlem +Y'ye bakar: duvara yapışık, oyuncuya (-Z) dönük
    var EZ = DsAtmosphere.pool().z1;
    e.setPosition(0, 11.6, EZ + 15.8);
    e.setEulerAngles(-90, 0, 180);
    e.setLocalScale(4.2, 1, 1.575);
    this.root.addChild(e);
    var glow = this.glowMat(new pc.Color(0.3, 1, 0.5), { opacityMap: this.radialTexture(), opacityChannel: 'a', opacity: 0.35 });
    var gl = new pc.Entity('ExitGlowSoft');
    gl.addComponent('render', { type: 'plane', castShadows: false, receiveShadows: false });
    gl.render.meshInstances[0].material = glow;
    gl.setPosition(0, 11.6, EZ + 15.7);
    gl.setEulerAngles(-90, 0, 0);
    gl.setLocalScale(9, 1, 5);
    this.root.addChild(gl);
    this.exitGlowMat = glow;
};

DsAtmosphere.prototype.radialTexture = function () {
    if (this._radial) return this._radial;
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    this._radial = this.canvasTex(c, false);
    return this._radial;
};

// ---------------------------------------------------------------- damlalar
DsAtmosphere.prototype.buildDrips = function () {
    this.dripMat = this.glowMat(new pc.Color(0.7, 0.85, 0.95), { blend: pc.BLEND_ADDITIVEALPHA, opacity: 0.8 });
    this.drips = [];
    this.dripTimer = 1;
};

DsAtmosphere.prototype.spawnDrip = function () {
    var ds = this.app.dontSplash;
    if (!ds || !ds.player) return;
    var p = ds.player.getPosition();
    for (var tries = 0; tries < 6; tries++) {
        var a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 22;
        var x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
        if (Math.abs(x) > 59 || ds.areaIndexAt(z) < 0) continue;
        var hit = this.app.systems.rigidbody.raycastFirst(new pc.Vec3(x, 14, z), new pc.Vec3(x, -2, z));
        if (hit && hit.point.y > -0.3) continue;      // altında blok var
        var d = this.drips.find(function (q) { return !q.on; });
        if (!d) {
            if (this.drips.length >= 8) return;
            var e = new pc.Entity('Drip');
            e.addComponent('render', { type: 'box', castShadows: false, receiveShadows: false });
            e.render.meshInstances[0].material = this.dripMat;
            e.setLocalScale(0.05, 0.4, 0.05);
            this.root.addChild(e);
            d = { e: e, on: false };
            this.drips.push(d);
        }
        d.on = true; d.x = x; d.z = z; d.y = 13; d.v = 0;
        d.e.enabled = true;
        d.e.setPosition(x, d.y, z);
        return;
    }
};

DsAtmosphere.prototype.updateDrips = function (dt) {
    if (!this.drips) return;
    this.dripTimer -= dt;
    if (this.dripTimer <= 0) { this.dripTimer = 0.8 + Math.random() * 2.2; this.spawnDrip(); }
    var ds = this.app.dontSplash;
    for (var i = 0; i < this.drips.length; i++) {
        var d = this.drips[i];
        if (!d.on) continue;
        d.v += 22 * dt;
        d.y -= d.v * dt;
        if (d.y <= (ds ? ds.waterLevel : 0) + 0.05) {
            d.on = false;
            d.e.enabled = false;
            // sadece görüntü: küçük halka, canavar duymaz
            if (ds && ds.spawnSplashFx) ds.spawnSplashFx(new pc.Vec3(d.x, 0, d.z), 0.12);
            continue;
        }
        d.e.setPosition(d.x, d.y, d.z);
    }
};

// ---------------------------------------------------------------- canavar suyu fışkırtır
// Bacaklarından iki yana ve yukarı fışkıran, hızına göre uzayan damlalar (yay gibi düşer) + dibinde köpük.
// Damlalar dünya uzayında kalır: koşarken arkasında su perdesi bırakır.
// Canavar sıçratması canavarın boyuna göre: alan (ext), damla boyu (size), hız (vel), öne kayma (fwd, metre),
// durunca sönme süresi (fade: yeni damla çıkmaz, havadakiler düşüp biter)
DsAtmosphere.SPRAY = { ext: 2, size: 1.3, vel: 1.25, count: 1.6, fwd: 1.8, fade: 1.2 };

DsAtmosphere.prototype.buildSpray = function () {
    var ds = this.app.dontSplash;
    if (!ds || !ds.monsters) return;
    var tex = ds.dropTex();
    var self = this;
    var K = DsAtmosphere.SPRAY;
    var mk = function (name, o) {
        o.n = Math.round(o.n * K.count); o.rate /= K.count;
        o.ex *= K.ext; o.ez *= K.ext; o.size *= K.size; o.side *= K.vel; o.up *= K.vel; o.back *= K.vel;
        var e = new pc.Entity(name);
        e.addComponent('particlesystem', {
            autoPlay: true, loop: true, numParticles: o.n, lifetime: o.life, rate: o.rate, rate2: o.rate * 1.5,
            emitterShape: pc.EMITTERSHAPE_BOX, emitterExtents: new pc.Vec3(o.ex, 0.1, o.ez),
            startAngle: 0, startAngle2: 360,
            // yerel: iki yana (x), yukarı (y), geriye (z); dünya: yerçekimi
            localVelocityGraph: new pc.CurveSet([[0, -o.side], [0, o.up * 0.6], [0, o.back]]),
            localVelocityGraph2: new pc.CurveSet([[0, o.side], [0, o.up], [0, o.back * 0.3]]),
            velocityGraph: new pc.CurveSet([[0, 0], [0, 0, 1, -o.grav], [0, 0]]),
            velocityGraph2: new pc.CurveSet([[0, 0], [0, 0, 1, -o.grav * 1.2], [0, 0]]),
            scaleGraph: new pc.Curve([0, o.size, 1, o.size * o.grow]),
            alphaGraph: new pc.Curve([0, o.alpha, 0.65, o.alpha * 0.8, 1, 0]),
            colorGraph: new pc.CurveSet([[0, 0.82, 1, 0.75], [0, 0.93, 1, 0.9], [0, 1, 1, 1]]),
            stretch: o.stretch || 0, alignToMotion: !!o.stretch,
            colorMap: tex, blendType: pc.BLEND_NORMAL, depthWrite: false, lighting: false
        });
        if (e.particlesystem.emitter) { e.particlesystem.emitter.useFog = false; if (e.particlesystem.emitter.resetMaterial) e.particlesystem.emitter.resetMaterial(); }
        e.enabled = false;
        self.root.addChild(e);
        return e;
    };
    var low = this.mobile;
    this.spray = ds.monsters.map(function () {
        return {
            run: [
                mk('SprayRun', { n: low ? 160 : 280, life: 0.75, rate: low ? 0.005 : 0.003, ex: 1.6, ez: 1.2, side: 8, up: 15, back: -5, grav: 34, size: 0.26, grow: 0.7, alpha: 1, stretch: 0.09 }),
                mk('FoamRun', { n: 30, life: 0.5, rate: 0.025, ex: 2.2, ez: 2.2, side: 1.5, up: 1.2, back: -1, grav: 3, size: 0.75, grow: 1.9, alpha: 0.42 })
            ],
            walk: [
                mk('SprayWalk', { n: 50, life: 0.55, rate: 0.022, ex: 1.4, ez: 1, side: 3, up: 5.5, back: -1.2, grav: 18, size: 0.14, grow: 0.7, alpha: 0.95, stretch: 0.05 }),
                mk('FoamWalk', { n: 10, life: 0.55, rate: 0.08, ex: 1.8, ez: 1.8, side: 0.6, up: 0.5, back: -0.5, grav: 1, size: 0.6, grow: 1.8, alpha: 0.3 })
            ]
        };
    });
};

DsAtmosphere.prototype.updateSpray = function (dt) {
    var ds = this.app.dontSplash;
    if (!ds || !this.spray) return;
    var S = DontSplashManager.STATE;
    var pp = ds.player.getPosition();
    var wl = ds.curWaterLevel !== undefined ? ds.curWaterLevel : 0;
    var K = DsAtmosphere.SPRAY, now = this.time;
    // Durunca birden yok olmasın: yayıcı suyun dibine iner (yeni damla görünmez), havadakiler düşüp söner, sonra kapanır
    var set = function (list, on, x, z, rot) {
        for (var k = 0; k < list.length; k++) {
            var e = list[k];
            if (on) {
                if (!e.enabled) e.enabled = true;
                e._dsOff = 0;
                e.setPosition(x, wl + 0.05, z); e.setEulerAngles(0, rot, 0);
            } else if (e.enabled) {
                if (!e._dsOff) { var p = e.getPosition(); e._dsOff = now; e.setPosition(p.x, wl - 40, p.z); }
                else if (now - e._dsOff > K.fade) { e.enabled = false; e._dsOff = 0; }
            }
        }
    };
    for (var i = 0; i < this.spray.length; i++) {
        var m = ds.monsters[i], sp = this.spray[i];
        if (!m || !sp) continue;
        var near = Math.hypot(m.vis.x - pp.x, m.vis.z - pp.z) < 110;
        var run = near && m.moving && m.state === S.HUNT;
        var walk = near && m.moving && !run;
        // canavar modelinin gerçek yeri (bloklardan itilme payı dahil), ağız tarafına biraz önde
        var mp = m.e.getPosition(), rr = m.vis.rot * pc.math.DEG_TO_RAD, fw = K.fwd * m.e.getLocalScale().x / 1.2;
        var sx = mp.x + Math.sin(rr) * fw, sz = mp.z + Math.cos(rr) * fw;
        set(sp.run, run, sx, sz, m.vis.rot);
        set(sp.walk, walk, sx, sz, m.vis.rot);
    }
};

// ---------------------------------------------------------------- canavar kabarcıkları
DsAtmosphere.prototype.buildBubbles = function () {
    var ds = this.app.dontSplash;
    if (!ds || !ds.monsters) return;
    var tex = this.radialTexture();
    var self = this;
    this.bubbles = ds.monsters.map(function () {
        var e = new pc.Entity('Bubbles');
        e.addComponent('particlesystem', {
            autoPlay: true, loop: true, numParticles: 70, lifetime: 0.7, rate: 0.014, rate2: 0.028,
            emitterShape: pc.EMITTERSHAPE_BOX, emitterExtents: new pc.Vec3(3.6, 0, 3.6),
            localVelocityGraph: new pc.CurveSet([[0, 0], [0, 0.6], [0, 0]]),
            localVelocityGraph2: new pc.CurveSet([[0, 0], [0, 1.2], [0, 0]]),
            scaleGraph: new pc.Curve([0, 0.12, 1, 0.24]),
            alphaGraph: new pc.Curve([0, 0, 0.2, 0.8, 1, 0]),
            colorGraph: new pc.CurveSet([[0, 0.75], [0, 0.9], [0, 1]]),
            colorMap: tex, blendType: pc.BLEND_ADDITIVEALPHA, depthWrite: false, lighting: false
        });
        if (e.particlesystem.emitter) { e.particlesystem.emitter.useFog = false; if (e.particlesystem.emitter.resetMaterial) e.particlesystem.emitter.resetMaterial(); }
        e.enabled = false;
        self.root.addChild(e);
        return e;
    });
};

DsAtmosphere.prototype.updateBubbles = function (dt) {
    var ds = this.app.dontSplash;
    if (!ds || !this.bubbles) return;
    var S = DontSplashManager.STATE;
    var pp = ds.player.getPosition();
    var shake = 0, fear = 0, danger = 0, near = 0, area = ds.areaIndexAt(pp.z);
    for (var i = 0; i < this.bubbles.length; i++) {
        var m = ds.monsters[i], b = this.bubbles[i];
        if (!m || !b) continue;
        var hunting = m.state === S.HUNT && m.moving;
        var d = Math.hypot(m.vis.x - pp.x, m.vis.z - pp.z);
        var on = hunting && d < 80;
        // durunca birden kaybolmasın: yayıcı dibe iner, çıkmış kabarcıklar söner
        if (on) { if (!b.enabled) b.enabled = true; b._dsOff = 0; var bp = m.e.getPosition(); b.setPosition(bp.x, 0.08, bp.z); }
        else if (b.enabled) {
            if (!b._dsOff) { var bq = b.getPosition(); b._dsOff = this.time; b.setPosition(bq.x, -40, bq.z); }
            else if (this.time - b._dsOff > 1) { b.enabled = false; b._dsOff = 0; }
        }
        // büyük canavar: koşarken daha uzaktan da yeri sarsar
        if (hunting && d < 35 && !ds.caught) shake = Math.max(shake, 1 - d / 35);
        // yaklaşan av (kalp atışı için): bölümümdeki canavar bana doğru koşuyorsa
        if (hunting && i === area && !ds.caught && d < 45) danger = Math.max(danger, 0.3 * (1 - d / 45));
        // sadece yakında (bana odaklı değil): yavaş kalp, hafif kırmızılık
        if (!ds.caught && d < 30) near = Math.max(near, 0.15 + 0.45 * (1 - d / 30));   // dibimizdeyse (~5 m) 0.52
        // sesin geldiği yere vardı, etrafı arıyor: yakınındaysan kalp hâlâ hızlı atar
        if (m.state === S.SEARCH && i === area && !ds.caught && d < 30) danger = Math.max(danger, 0.25 + 0.45 * (1 - d / 30));
        // Canavar bana koşuyor (hedefi benim yanım): korku — sarsıntı + ekran kararır, yaklaştıkça artar
        if (m.state === S.HUNT && i === area && !ds.caught && Math.hypot(m.tx - pp.x, m.tz - pp.z) < 12) {
            fear = Math.max(fear, 0.45 + 0.55 * Math.max(0, 1 - d / 60));
        }
    }
    if (fear > 0 && !(this.fear > 0)) this.shake = 1;   // av başladığı an sert bir sarsılma
    this.fear = fear;
    var focus = Math.max(danger, fear);
    this.focused = focus > 0;   // canavar bana odaklı (koşuyor / yakınımda arıyor)
    this.danger = Math.max(focus, near);
    this.shakeTarget = Math.max(shake, fear);
};

// ---------------------------------------------------------------- kamera sarsıntısı
DsAtmosphere.prototype.applyShake = function (dt) {
    var cam = this.cam || (this.cam = this.app.root.findByName('Camera'));
    if (!cam) return;
    this.shake = (this.shake || 0) + ((this.shakeTarget || 0) - (this.shake || 0)) * Math.min(1, dt * 4);
    // önceki sarsıntıyı geri al (kamera kontrolcüsü konumu kendisi yenilediyse dokunma)
    if (this.shakeOffset) {
        var lp = cam.getLocalPosition();
        if (this.shakePos && lp.distance(this.shakePos) < 1e-4) {
            cam.setLocalPosition(lp.x - this.shakeOffset.x, lp.y - this.shakeOffset.y, lp.z - this.shakeOffset.z);
        }
        this.shakeOffset = null;
    }
    if (this.shake < 0.02 && !(this.focused && (this.pulse || 0) * (this.danger || 0) > 0.02)) return;
    // canavar yaklaştıkça daha sert; kalp vuruşunda küçük bir tekme
    var a = this.shake * (0.12 + 0.22 * (this.fear || 0)) + (this.focused ? 0.07 * (this.pulse || 0) * (this.danger || 0) : 0), t = this.time * 38;
    var o = new pc.Vec3(Math.sin(t) * a, Math.sin(t * 1.37 + 1) * a, 0);
    var p = cam.getLocalPosition();
    cam.setLocalPosition(p.x + o.x, p.y + o.y, p.z);
    this.shakeOffset = o;
    this.shakePos = cam.getLocalPosition().clone();
};

// ---------------------------------------------------------------- film greni
DsAtmosphere.prototype.buildGrain = function () {
    var ds = this.app.dontSplash;
    var parent = ds && ds.vignette ? ds.vignette.parent : this.app.root.findByName('GameUI');
    if (!parent) return;
    var N = 128, c = document.createElement('canvas');
    c.width = c.height = N;
    var g = c.getContext('2d');
    var img = g.createImageData(N, N);
    for (var i = 0; i < N * N; i++) {
        var v = Math.random();
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v > 0.5 ? 255 : 0;
        img.data[i * 4 + 3] = Math.round(Math.abs(v - 0.5) * 2 * 255);
    }
    g.putImageData(img, 0, 0);
    var tex = this.canvasTex(c, true);
    tex.minFilter = pc.FILTER_NEAREST; tex.magFilter = pc.FILTER_NEAREST;
    var e = new pc.Entity('DsGrain');
    e.addComponent('element', {
        type: 'image', anchor: new pc.Vec4(0, 0, 1, 1), pivot: new pc.Vec2(0.5, 0.5),
        margin: new pc.Vec4(0, 0, 0, 0), texture: tex, opacity: this.mobile ? 0.035 : 0.05, useInput: false
    });
    parent.insertChild(e, 0);   // HUD'un altında, sahnenin üstünde
    this.grain = e;
};

DsAtmosphere.prototype.updateGrain = function () {
    var e = this.grain;
    if (!e || !e.element) return;
    this.grainT = (this.grainT || 0) + 1;
    if (this.grainT % 3) return;   // 20 fps yeter
    var w = e.element.width / 256, h = e.element.height / 256;
    e.element.rect = new pc.Vec4(Math.random(), Math.random(), Math.max(1, w), Math.max(1, h));
};

// ---------------------------------------------------------------- döngü
DsAtmosphere.prototype.update = function (dt) {
    this.time += dt;
    this.updateTint(dt);
    this.updateCaustics(dt);
    this.updateMist();
    this.updateLamps(dt);
    this.updateDrips(dt);
    this.updateBubbles(dt);
    this.updateSpray(dt);
};

// ---------------------------------------------------------------- yakalanınca kırmızı parlama
DsAtmosphere.prototype.updateCatchFlash = function (dt) {
    var ds = this.app.dontSplash;
    if (!ds || !ds.vignette) return;
    if (!this.redFlash) {
        // kenarları beyaz, ortası saydam doku; kırmızıya boyanır
        var cv = document.createElement('canvas');
        cv.width = cv.height = 128;
        var g = cv.getContext('2d');
        var gr = g.createRadialGradient(64, 64, 30, 64, 64, 92);
        gr.addColorStop(0, 'rgba(255,255,255,0)');
        gr.addColorStop(1, 'rgba(255,255,255,1)');
        g.fillStyle = gr;
        g.fillRect(0, 0, 128, 128);
        var e = new pc.Entity('DsCatchFlash');
        e.addComponent('element', {
            type: 'image', anchor: new pc.Vec4(0, 0, 1, 1), pivot: new pc.Vec2(0.5, 0.5), margin: new pc.Vec4(0, 0, 0, 0),
            texture: this.canvasTex(cv, false), color: new pc.Color(0.9, 0.05, 0.05), opacity: 0, useInput: false
        });
        ds.vignette.parent.insertChild(e, 1);
        e.enabled = false;
        this.redFlash = e;
        this.redA = 0;
    }
    var caught = !!ds.caught;
    if (caught && !this.wasCaught) this.redA = 0.75;
    this.wasCaught = caught;
    if (this.redA <= 0) return;
    this.redA = Math.max(0, this.redA - dt * 1.1);
    this.redFlash.element.opacity = this.redA;
    var on = this.redA > 0.01;
    if (this.redFlash.enabled !== on) this.redFlash.enabled = on;
};

// ---------------------------------------------------------------- korku: hedef bensem ekran kararır
DsAtmosphere.prototype.updateFearDark = function (dt) {
    var ds = this.app.dontSplash;
    if (!ds || !ds.vignette) return;
    if (!this.fearDark) {
        var e = new pc.Entity('DsFearDark');
        e.addComponent('element', {
            type: 'image', anchor: new pc.Vec4(0, 0, 1, 1), pivot: new pc.Vec2(0.5, 0.5), margin: new pc.Vec4(0, 0, 0, 0),
            color: new pc.Color(0, 0, 0), opacity: 0, useInput: false
        });
        ds.vignette.parent.insertChild(e, 0);   // HUD'un altında
        e.enabled = false;
        this.fearDark = e;
        this.darkA = 0;
    }
    var target = (this.fear || 0) * 0.42;
    this.darkA += (target - this.darkA) * Math.min(1, dt * (target > this.darkA ? 7 : 2));
    this.fearDark.element.opacity = this.darkA;
    var on = this.darkA > 0.005;
    if (this.fearDark.enabled !== on) this.fearDark.enabled = on;
};

// ---------------------------------------------------------------- kalp atışı
// Canavar bana doğru geliyorsa: tık-tık kalp atışı (yaklaştıkça hızlanır) ve aynı ritimde ekran kenarı kırmızı yanıp söner.
// heartbeat sesi tek bir "lub-dub" (0.04 ve 0.30 sn'de iki vuruş); her atışta baştan çalınır.
DsAtmosphere.HEART = { bpmMin: 72, bpmMax: 160, lub: 0.04, dub: 0.30 };
DsAtmosphere.prototype.heartTexture = function () {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(128, 128, 50, 128, 128, 182);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    gr.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return this.canvasTex(c, false);
};
// Kalp atışı dosyası çok kısık kaydedilmiş (tepe ~0.2) ve ses seviyesi 1'in üstüne çıkamıyor:
// sesin yükseltilmiş bir kopyası üretilir (tepe 0.95). Asıl dosyaya dokunulmaz (başka modlar da kullanıyor).
DsAtmosphere.prototype.loudHeartAsset = function (src) {
    var app = this.app;
    try {
        var snd = src.resource, buf = snd && snd.buffer, ctx = app.systems.sound && app.systems.sound.context;
        if (!buf || !ctx) return src.id;
        var peak = 0;
        for (var c = 0; c < buf.numberOfChannels; c++) { var d = buf.getChannelData(c); for (var i = 0; i < d.length; i++) { var v = Math.abs(d[i]); if (v > peak) peak = v; } }
        if (peak < 0.001) return src.id;
        var g = Math.min(8, 0.95 / peak);
        var out = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
        for (var c2 = 0; c2 < buf.numberOfChannels; c2++) { var a = buf.getChannelData(c2), o = out.getChannelData(c2); for (var j = 0; j < a.length; j++) o[j] = a[j] * g; }
        var asset = new pc.Asset('DsHeartLoud', 'audio', null);
        asset.resource = new pc.Sound(out);
        asset.loaded = true;
        app.assets.add(asset);
        this.on('destroy', function () { app.assets.remove(asset); });
        return asset.id;
    } catch (e) { console.warn('loudHeart', e); return src.id; }
};

DsAtmosphere.prototype.updateHeart = function (dt) {
    var ds = this.app.dontSplash;
    if (!ds || !ds.vignette) return;
    var H = DsAtmosphere.HEART;
    if (!this.heartV) {
        var e = new pc.Entity('DsHeartVignette');
        e.addComponent('element', {
            type: 'image', anchor: new pc.Vec4(0, 0, 1, 1), pivot: new pc.Vec2(0.5, 0.5), margin: new pc.Vec4(0, 0, 0, 0),
            color: new pc.Color(1, 0.04, 0.04), opacity: 0, useInput: false
        });
        e.element.texture = this.heartTexture();
        ds.vignette.parent.insertChild(e, 0);   // HUD'un altında
        e.enabled = false;
        this.heartV = e;
        this.heartA = 0;
        this.beatT = 99; this.beatAge = 99; this.pulse = 0;
        if (ds.sound && ds.heartbeatSound && !ds.sound.slot('hbBeat')) ds.sound.addSlot('hbBeat', { asset: ds.heartbeatSound.id, volume: 0.5, loop: false, overlap: true, autoPlay: false });
    }
    var dz = (ds.caught || ds.finished || this.app.isWatchingAd) ? 0 : (this.danger || 0);
    var pitch = 1 + 0.25 * dz;
    if (dz > 0.04) {
        var iv = 60 / (H.bpmMin + (H.bpmMax - H.bpmMin) * dz);
        this.beatT += dt;
        if (this.beatT >= iv) {
            this.beatT = this.beatAge < 5 ? Math.min(this.beatT - iv, iv) : 0;
            this.beatAge = 0;
            var s = ds.sound && ds.sound.slot('hbBeat');
            // yükseltilmiş kopya: dosya yüklenince bir kez üretilip yuvaya takılır
            if (s && !this.loudHeart && ds.heartbeatSound && ds.heartbeatSound.loaded) {
                var lid = this.loudHeartAsset(ds.heartbeatSound);
                if (lid !== ds.heartbeatSound.id) { this.loudHeart = lid; s.asset = lid; }
            }
            if (s) { s.volume = 0.5 + 0.5 * dz; s.pitch = pitch; ds.sound.play('hbBeat'); }
        }
    } else this.beatT = 99;
    this.beatAge += dt;
    // her atışta tek parlama: hızlıca yanar, yavaşça söner (çift yanıp sönme bug gibi duruyordu)
    var a1 = this.beatAge - H.lub / pitch;
    var pulse = a1 < 0 ? 0 : Math.min(1, a1 / 0.07) * Math.exp(-Math.max(0, a1 - 0.07) * 4.5);
    this.pulse = Math.min(1, pulse);
    var target = dz > 0.04 ? (0.15 + 0.8 * this.pulse) * (0.5 + 0.5 * dz) * (this.focused ? 1 : 0.6) : 0;   // odaklı değilse daha hafif
    this.heartA += (target - this.heartA) * Math.min(1, dt * (target > this.heartA ? 45 : 7));
    this.heartV.element.opacity = this.heartA;
    var on = this.heartA > 0.005;
    if (this.heartV.enabled !== on) this.heartV.enabled = on;
};

DsAtmosphere.prototype.postUpdate = function (dt) {
    this.updateHeart(dt);
    this.updateFearDark(dt);
    this.updateCatchFlash(dt);
    this.applyShake(dt);
    this.updateGrain();
};
