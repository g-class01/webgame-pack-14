var DsMemoryBridge = pc.createScript('dsMemoryBridge');

// Hafıza köprüsü: güvenli yol başta sırayla yanar, sonra söner. Yanlış karoya basınca karo düşer.
DsMemoryBridge.attributes.add('litMaterial', { type: 'asset', assetType: 'material' });
DsMemoryBridge.attributes.add('showZ0', { type: 'number', default: 170, description: 'Bu z aralığına girince yol gösterilir' });
DsMemoryBridge.attributes.add('showZ1', { type: 'number', default: 176 });

DsMemoryBridge.prototype.initialize = function () {
    var self = this;
    this.tiles = [];   // [satır][sütun]
    this.entity.findByTag('DSMemTile').forEach(function (e) {
        var m = /^Mem_(\d+)_(\d+)$/.exec(e.name);
        if (!m) return;
        var r = +m[1], c = +m[2];
        if (!self.tiles[r]) self.tiles[r] = [];
        if (e.rigidbody) e.rigidbody.type = 'kinematic';
        self.tiles[r][c] = { e: e, baseY: e.getLocalPosition().y, y: e.getLocalPosition().y, state: 0, wait: 0, half: e.getLocalScale().x / 2 + 0.3 };
    });
    this.rows = this.tiles.length;
    this.seed = null;
    this.showT = -1;
    this.lastShow = -100;
    this.time = 0;
    this.wasInShowZone = false;
    if (this.litMaterial && !this.litMaterial.loaded) this.app.assets.load(this.litMaterial);
};

DsMemoryBridge.prototype.makePath = function (seed) {
    var rnd = DontSplashManager.random(seed + 17);
    var path = [];
    var c = Math.floor(rnd() * 3);
    for (var r = 0; r < this.rows; r++) {
        path.push(c);
        var step = Math.floor(rnd() * 3) - 1;    // -1, 0, +1
        c = pc.math.clamp(c + step, 0, 2);
    }
    this.path = path;
};

DsMemoryBridge.prototype.setLit = function (tile, lit) {
    var mi = tile.e.render && tile.e.render.meshInstances[0];
    if (!mi) return;
    if (!tile.normalMat) tile.normalMat = mi.material;
    var lm = this.litMaterial && this.litMaterial.resource;
    mi.material = lit && lm ? lm : tile.normalMat;
};

DsMemoryBridge.prototype.update = function (dt) {
    var ds = this.app.dontSplash;
    if (!ds || !this.rows) return;
    this.time += dt;
    // PerformanceTweaks karoları batch'ler; batch'te malzeme değişmez, o yüzden bu karolar batch dışı kalır
    for (var br = 0; br < this.rows; br++) for (var bc = 0; bc < 3; bc++) {
        var bt = this.tiles[br][bc];
        if (bt && bt.e.render && bt.e.render.batchGroupId !== -1) bt.e.render.batchGroupId = -1;
    }
    var seed = ds.getSeed();
    if (seed !== this.seed) { this.seed = seed; this.makePath(seed); }

    var pos = ds.player.getPosition();
    // Checkpoint'e girince yolu göster
    var inZone = pos.z > this.showZ0 && pos.z < this.showZ1;
    if (inZone && !this.wasInShowZone && this.time - this.lastShow > 4) { this.showT = 0; this.lastShow = this.time; ds.play('click', 0.4); }
    this.wasInShowZone = inZone;

    if (this.showT >= 0) {
        this.showT += dt;
        var STEP = 0.55;
        var upto = Math.floor(this.showT / STEP);
        for (var r = 0; r < this.rows; r++) for (var c = 0; c < 3; c++) {
            var t = this.tiles[r][c];
            this.setLit(t, c === this.path[r] && r <= upto && this.showT < this.rows * STEP + 1.2);
        }
        if (this.showT > this.rows * STEP + 1.2) this.showT = -1;
    }

    // Yanlış karo düşer
    var feet = pos.y - 1.0;
    for (var r2 = 0; r2 < this.rows; r2++) for (var c2 = 0; c2 < 3; c2++) {
        var tl = this.tiles[r2][c2];
        if (!tl) continue;
        var safe = c2 === this.path[r2];
        var p = tl.e.getPosition();
        var top = p.y + tl.e.getLocalScale().y / 2;
        var on = Math.abs(pos.x - p.x) < tl.half && Math.abs(pos.z - p.z) < tl.half && feet > top - 0.5 && feet < top + 0.6;
        if (tl.state === 0 && !safe && on && !ds.caught) { tl.state = 1; tl.shake = 0.12; ds.play('click', 0.6); }
        if (tl.state === 1) {
            // kısa titreme sonra düş
            tl.shake -= dt;
            if (tl.shake <= 0) { tl.y -= dt * 14; if (tl.y < tl.baseY - 4.5) { tl.y = tl.baseY - 4.5; tl.state = 2; tl.wait = 3; } }
        } else if (tl.state === 2) {
            tl.wait -= dt;
            if (tl.wait <= 0) tl.state = 3;
        } else if (tl.state === 3) {
            tl.y += dt * 3;
            if (tl.y >= tl.baseY) { tl.y = tl.baseY; tl.state = 0; }
        }
        var lp = tl.e.getLocalPosition();
        var shakeY = tl.state === 1 && tl.shake > 0 ? Math.sin(this.time * 80) * 0.06 : 0;
        tl.e.setLocalPosition(lp.x, tl.y + shakeY, lp.z);
    }
};
