var DsArrows = pc.createScript('dsArrows');

// Yön okları: oyuncuya doğrudan "buraya git" demeden ileri (+z) yönü gösterir.
//  - Yan duvarlarda açık yeşil, hafif parlayan ok işaretleri (havuz bölümleri boyunca ve dinlenme zeminlerinde)
//  - Başlangıç / ara / bitiş zeminlerinin üstünde yere boyanmış oklar
// Hepsi iki çizim çağrısı (duvar + zemin), gölge yok, sahneye bir şey eklemeden çalışma anında üretilir.

DsArrows.attributes.add('wallColor', { type: 'rgb', default: [0.35, 1, 0.45] });
DsArrows.attributes.add('wallOpacity', { type: 'number', default: 0.95 });
DsArrows.attributes.add('floorOpacity', { type: 'number', default: 0.85 });

DsArrows.WALL_X = 60.85;      // duvar iç yüzü (61) biraz önünde
DsArrows.WALL_Y = 9.5;        // su, bloklar ve duvardaki mesafe yazılarının üstünde
DsArrows.FLOOR_Y = 1.215;     // zemin üstü 1.2
DsArrows.HALL_Z = 1000;

DsArrows.prototype.initialize = function () {
    var S = (typeof DontSplashManager !== 'undefined' && DontSplashManager.SECTIONS) || [];
    if (!S.length) return;
    var wall = [], floor = [];
    var halls = {};
    S.forEach(function (s) { var h = Math.floor(s.z0 / DsArrows.HALL_Z); (halls[h] = halls[h] || []).push(s); });

    var addWall = function (z, len) {
        wall.push({ side: -1, z: z, len: len });
        wall.push({ side: 1, z: z, len: len });
    };
    Object.keys(halls).forEach(function (h) {
        var list = halls[h].sort(function (a, b) { return a.z0 - b.z0; });
        var off = h * DsArrows.HALL_Z;
        // başlangıç zemini (z off-30 .. off)
        floor.push({ x: 0, z: off - 7, len: 8 });
        addWall(off - 14, 8);
        list.forEach(function (s, i) {
            // havuz boyunca duvar okları
            for (var z = s.z0 + 20; z < s.z1 - 8; z += 30) addWall(z, 8);
            // bölümden sonraki zemin (ara zemin ya da salon sonu)
            var next = list[i + 1];
            var fz = next ? (s.z1 + next.z0) / 2 : s.z1 + 8;
            floor.push({ x: 0, z: fz, len: 8 });
            addWall(fz, 8);
        });
    });

    this.tex = this.makeTexture();
    this.wallEnt = this.build('DsArrowsWall', wall, true, this.wallOpacity);
    this.floorEnt = this.build('DsArrowsFloor', floor, false, this.floorOpacity);
    this.on('destroy', function () {
        if (this.wallEnt) this.wallEnt.destroy();
        if (this.floorEnt) this.floorEnt.destroy();
        if (this.tex) this.tex.destroy();
    }, this);
};

// Üç köşeli ok (>>>), kenarları yumuşak, boyası yer yer dökülmüş
DsArrows.prototype.makeTexture = function () {
    var W = 512, H = 256;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#ffffff';
    g.lineJoin = 'miter';
    for (var k = 0; k < 3; k++) {
        var x0 = 60 + k * 140;
        g.beginPath();
        g.moveTo(x0, 30);
        g.lineTo(x0 + 110, H / 2);
        g.lineTo(x0, H - 30);
        g.lineTo(x0 + 48, H - 30);
        g.lineTo(x0 + 158, H / 2);
        g.lineTo(x0 + 48, 30);
        g.closePath();
        g.globalAlpha = 0.75 + 0.125 * k;   // ileri doğru belirginleşir
        g.fill();
    }
    g.globalAlpha = 1;
    // aşınma: rastgele lekeleri sil (sabit tohum: her yerde aynı görünüm)
    var seed = 7;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    g.globalCompositeOperation = 'destination-out';
    for (var i = 0; i < 260; i++) {
        var r = 1 + rnd() * rnd() * 6;
        g.globalAlpha = 0.1 + rnd() * 0.35;
        g.beginPath(); g.arc(rnd() * W, rnd() * H, r, 0, Math.PI * 2); g.fill();
    }
    // yatay fırça izleri
    for (var j = 0; j < 20; j++) {
        g.globalAlpha = 0.05 + rnd() * 0.08;
        g.fillRect(0, rnd() * H, W, 1 + rnd() * 3);
    }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;

    var tex = new pc.Texture(this.app.graphicsDevice, {
        width: W, height: H, format: pc.PIXELFORMAT_RGBA8, mipmaps: true,
        minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR, magFilter: pc.FILTER_LINEAR,
        addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE, anisotropy: 8
    });
    tex.name = 'DsArrowTex';
    tex.setSource(c);
    return tex;
};

// Dörtgenleri tek bir meshte topla. Doku u ekseni hep +z (ok ileri bakar).
DsArrows.prototype.build = function (name, quads, isWall, opacity) {
    if (!quads.length) return null;
    var pos = [], nor = [], uv = [], idx = [];
    quads.forEach(function (q, n) {
        var hl = q.len / 2, hh = q.len / 4;   // en-boy 2:1 (doku 512x256)
        var p;
        if (isWall) {
            var x = q.side * DsArrows.WALL_X, y = DsArrows.WALL_Y;
            p = [[x, y - hh, q.z - hl], [x, y - hh, q.z + hl], [x, y + hh, q.z + hl], [x, y + hh, q.z - hl]];
            for (var k = 0; k < 4; k++) nor.push(-q.side, 0, 0);
        } else {
            var fy = DsArrows.FLOOR_Y;
            p = [[q.x + hh, fy, q.z - hl], [q.x + hh, fy, q.z + hl], [q.x - hh, fy, q.z + hl], [q.x - hh, fy, q.z - hl]];
            for (var m = 0; m < 4; m++) nor.push(0, 1, 0);
        }
        p.forEach(function (v) { pos.push(v[0], v[1], v[2]); });
        uv.push(0, 0, 1, 0, 1, 1, 0, 1);
        var b = n * 4;
        idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    });
    var mesh = new pc.Mesh(this.app.graphicsDevice);
    mesh.setPositions(pos); mesh.setNormals(nor); mesh.setUvs(0, uv); mesh.setIndices(idx);
    mesh.update(pc.PRIMITIVE_TRIANGLES);

    var mat = new pc.StandardMaterial();
    mat.name = name + 'Mat';
    var col = this.wallColor;
    mat.diffuse = new pc.Color(col.r, col.g, col.b);
    mat.diffuseMap = this.tex;
    mat.opacityMap = this.tex; mat.opacityMapChannel = 'a';
    mat.opacity = opacity;
    // karanlık salonda da açık yeşil parlasın (ışıktan bağımsız)
    mat.emissive = new pc.Color(col.r * 0.9, col.g * 0.9, col.b * 0.9);
    mat.emissiveMap = this.tex;
    mat.blendType = pc.BLEND_NORMAL;
    mat.depthWrite = false;
    mat.cull = pc.CULLFACE_NONE;
    mat.useFog = true;
    if (!isWall) { mat.depthBias = -1; mat.slopeDepthBias = -1; }
    mat.update();

    var e = new pc.Entity(name);
    var mi = new pc.MeshInstance(mesh, mat);
    mi.castShadow = false; mi.receiveShadow = false;
    e.addComponent('render', { meshInstances: [mi], castShadows: false, receiveShadows: false });
    this.app.root.addChild(e);
    return e;
};
