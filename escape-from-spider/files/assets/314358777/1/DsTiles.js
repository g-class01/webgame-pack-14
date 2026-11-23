var DsTiles = pc.createScript('dsTiles');

// "Tiled" etiketli kutuların UV'lerini dünya ölçüsüne göre yeniden üretir:
// karolar her kutuda aynı boyutta görünür ve yan yana kutular arasında hizalı kalır.
// Kenarlar modeldeki gibi pahlı (bevel) üretilir.
DsTiles.attributes.add('tileSize', { type: 'number', default: 4, description: 'Doku kaç birimde bir tekrar etsin' });
DsTiles.attributes.add('artTileSize', { type: 'number', default: 2.07, description: 'Modelcinin karo dokuları (DS_Tile*) için tekrar ölçüsü' });
DsTiles.attributes.add('bevel', { type: 'number', default: 0.2, description: 'Kenar pahı (metre)' });

DsTiles.ART = { DS_TileWood: 1, DS_TileWhite: 1, DS_TileBlue: 1, DS_TileDark: 1, DS_TileCrumble: 1, DS_TileMem: 1, DS_MemLit: 1, DS_TileMove: 1, DS_TileSink: 1, DS_TileTall: 1 };

// Tahta sal modeli (modelci: 4.076 x 5.212 x 4.076, ortası karonun ortası, üstü karonun üstü)
DsTiles.WOOD = { template: 315367491, deps: [315367487, 315367488, 315367489, 315367490], w: 4.076, top: 2.612, thick: 0.712 };   // ayaksız sal: genişlik, üst yüz ve kalınlık (şablon ölçeğinde)
DsTiles.WOOD_THICK = 1.45;   // görünen sal kalınlığı (m): üstü karonun üstü, altı suyun biraz altında

DsTiles.prototype.initialize = function () {
    var self = this;
    var device = this.app.graphicsDevice;
    var wood = [];
    this.entity.findByTag('Tiled').forEach(function (e) {
        if (e.tags.has('DSWood')) wood.push(e);
        if (!e.render || e.render.type !== 'box' || !e.render.meshInstances.length) return;
        var mat = e.render.meshInstances[0].material;
        var T = mat && DsTiles.ART[mat.name] ? self.artTileSize : self.tileSize;
        // tahta sal: havuz tabanına inen sütun değil, suda yüzen kalın bir tabla (çarpışma kutusu aynı kalır)
        var slab = e.tags.has('DSWood') ? DsTiles.WOOD_SLAB : 0;
        var mesh = self.createMesh(device, e.getPosition(), e.getLocalScale(), T, slab);
        var layers = e.render.layers.slice();
        e.render.type = 'asset';
        e.render.meshInstances = [new pc.MeshInstance(mesh, mat, e)];
        e.render.layers = layers;
        e.render.castShadows = false;
        e.render.receiveShadows = false;
    });
    if (wood.length) this.loadWood(wood);
};

// Tahta karolara sal modeli takılır. Model ve dokusu yüklenene kadar yedek tahta tabla görünür, sonra gizlenir.
// Model karonun çocuğu: karoyla birlikte yüzer/yatar/kayar; ölçeği karonun ölçeğini dengeleyip modeli karo boyuna getirir.
DsTiles.prototype.loadWood = function (list) {
    var app = this.app, W = DsTiles.WOOD;
    var ids = W.deps.concat([W.template]);
    var assets = ids.map(function (id) { return app.assets.get(id); });
    if (assets.some(function (a) { return !a; })) return;
    var left = assets.length;
    var done = function () {
        if (--left > 0) return;
        var tpl = app.assets.get(W.template);
        list.forEach(function (e) {
            if (!e || !e.render || e.findByName('WoodModel')) return;
            var inst = tpl.resource.instantiate();
            inst.name = 'WoodModel';
            e.addChild(inst);
            var p = e.getPosition();
            var rot = (Math.abs(Math.round(p.x * 7.13 + p.z * 3.71)) % 4) * 90;   // karodan karoya farklı yön (her yerde aynı)
            // sal: üst yüzü karonun üstüne, kalınlığı WOOD_THICK (karonun yerel uzayında)
            var sy = e.getLocalScale().y || 1;
            var ky = (DsTiles.WOOD_THICK / sy) / W.thick;
            inst.setLocalPosition(0, 0.5 - W.top * ky, 0);
            inst.setLocalEulerAngles(0, rot, 0);
            inst.setLocalScale(0.01 / W.w, 0.01 * ky, 0.01 / W.w);
            inst.findComponents('render').forEach(function (r) { r.castShadows = false; r.receiveShadows = false; });
            e.render.enabled = false;   // yedek tabla
        });
    };
    assets.forEach(function (a) {
        a.ready(done);
        if (!a.loaded) app.assets.load(a);
    });
};

// Yüzlerin doku eksenleri (u, v)
DsTiles.UV = {
    '0+': [[0, 0, -1], [0, 1, 0]], '0-': [[0, 0, 1], [0, 1, 0]],
    '1+': [[1, 0, 0], [0, 0, -1]], '1-': [[1, 0, 0], [0, 0, 1]],
    '2+': [[1, 0, 0], [0, 1, 0]], '2-': [[-1, 0, 0], [0, 1, 0]]
};

DsTiles.WOOD_SLAB = 1.7;   // tahta salın kalınlığı (üstü karonun üstü, altı suyun biraz altında)

DsTiles.prototype.createMesh = function (device, worldPos, size, T, slab) {
    var s0 = [size.x, size.y, size.z];          // varlığın gerçek ölçeği (normal düzeltmesi için)
    var s = s0.slice();
    var w = [worldPos.x, worldPos.y, worldPos.z];
    var yMap = null;
    if (slab && slab < size.y) {
        // geometri sadece üstteki tabla kadar üretilir, sonra varlığın yerel uzayına taşınır
        s[1] = slab;
        var topY = worldPos.y + size.y / 2;
        w[1] = topY - slab / 2;
        yMap = function (py) { return (py * slab + w[1] - worldPos.y) / size.y; };
    }
    var c = Math.min(this.bevel, 0.12 * Math.min(s[0], s[1], s[2]));
    var k = [c / s[0], c / s[1], c / s[2]];            // yerel pah (eksen başına)
    var positions = [], normals = [], uvs = [], indices = [];

    function addPoly(pts, d) {
        // doku: yan yüz öncelikli (x, z, sonra y)
        var ax = d[0] ? 0 : (d[2] ? 2 : 1);
        var uv = DsTiles.UV[ax + (d[ax] > 0 ? '+' : '-')];
        // normal: dünyada d yönünde olsun (ölçek normal matrisiyle bozulmasın diye yerelde s ile çarpılır)
        var n = [d[0] * s0[0], d[1] * s0[1], d[2] * s0[2]];
        var L = Math.hypot(n[0], n[1], n[2]); n = [n[0] / L, n[1] / L, n[2] / L];
        // sarım yönü: dünya uzayında dışa baksın
        var a = pts[0], b = pts[1], e = pts[2];
        var ux = (b[0] - a[0]) * s[0], uy = (b[1] - a[1]) * s[1], uz = (b[2] - a[2]) * s[2];
        var vx = (e[0] - a[0]) * s[0], vy = (e[1] - a[1]) * s[1], vz = (e[2] - a[2]) * s[2];
        var cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
        if (cx * d[0] + cy * d[1] + cz * d[2] < 0) pts = pts.slice().reverse();
        var base = positions.length / 3;
        pts.forEach(function (p) {
            positions.push(p[0], yMap ? yMap(p[1]) : p[1], p[2]);
            normals.push(n[0], n[1], n[2]);
            var uu = 0, vv = 0;
            for (var j = 0; j < 3; j++) {
                var wc = w[j] + p[j] * s[j];
                uu += wc * uv[0][j];
                vv += wc * uv[1][j];
            }
            uvs.push(uu / T, vv / T);
        });
        for (var t = 1; t < pts.length - 1; t++) indices.push(base, base + t, base + t + 1);
    }

    var H = 0.5;
    for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) for (var dz = -1; dz <= 1; dz++) {
        var d = [dx, dy, dz];
        var nz = (dx ? 1 : 0) + (dy ? 1 : 0) + (dz ? 1 : 0);
        if (!nz) continue;
        var axes = [0, 1, 2].filter(function (i) { return d[i]; });
        var free = [0, 1, 2].filter(function (i) { return !d[i]; });
        if (nz === 1) {
            var a0 = axes[0], b0 = free[0], c0 = free[1], pts = [];
            [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q) {
                var p = [0, 0, 0];
                p[a0] = d[a0] * H; p[b0] = q[0] * (H - k[b0]); p[c0] = q[1] * (H - k[c0]);
                pts.push(p);
            });
            addPoly(pts, d);
        } else if (nz === 2) {
            var A = axes[0], B = axes[1], C = free[0];
            var p1 = function (cc) { var p = [0, 0, 0]; p[A] = d[A] * H; p[B] = d[B] * (H - k[B]); p[C] = cc; return p; };
            var p2 = function (cc) { var p = [0, 0, 0]; p[A] = d[A] * (H - k[A]); p[B] = d[B] * H; p[C] = cc; return p; };
            var lo = -(H - k[C]), hi = H - k[C];
            addPoly([p1(lo), p2(lo), p2(hi), p1(hi)], d);
        } else {
            addPoly([
                [dx * H, dy * (H - k[1]), dz * (H - k[2])],
                [dx * (H - k[0]), dy * H, dz * (H - k[2])],
                [dx * (H - k[0]), dy * (H - k[1]), dz * H]
            ], d);
        }
    }

    var mesh = new pc.Mesh(device);
    mesh.setPositions(positions);
    mesh.setNormals(normals);
    mesh.setUvs(0, uvs);
    mesh.setIndices(indices);
    mesh.update(pc.PRIMITIVE_TRIANGLES);
    return mesh;
};
