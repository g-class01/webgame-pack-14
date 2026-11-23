var DsNav = (function () {
    // Don't Splash canavar yol bulma: her bölümün su yüzeyi 1 m'lik noktalara bölünür, bloklar (canavar yarıçapı kadar
    // şişirilmiş) dolu sayılır, A* ile yol bulunur, sonra görüş hattıyla kısaltılır (köşeden köşeye düz gider).
    // İstemci (DsNav.js) ve sunucu (dsNav.ts) bu kodun birebir aynısını kullanır: aynı girdiyle aynı yolu bulurlar.
    var CELL = 1, RAD = 0.5, POOL_X = 58, EPS = 0.35;
    function r2(v) { return Math.round(v * 100) / 100; }

    // rects: [[x, z, hx, hz], ...] (r2 ile yuvarlanmış), alan: x -poolX..poolX, z z0..z1
    function Grid(rects, z0, z1, poolX) {
        poolX = poolX || POOL_X;
        this.x0 = -poolX; this.x1 = poolX; this.z0 = z0; this.z1 = z1;
        this.nx = Math.floor((this.x1 - this.x0) / CELL) + 1;
        this.nz = Math.floor((this.z1 - this.z0) / CELL) + 1;
        var r = [];
        for (var k = 0; k < rects.length; k++) {
            var b = rects[k];
            var a = { x0: b[0] - b[2] - RAD, x1: b[0] + b[2] + RAD, z0: b[1] - b[3] - RAD, z1: b[1] + b[3] + RAD };
            if (a.z1 < z0 - 1 || a.z0 > z1 + 1) continue;
            r.push(a);
        }
        this.rects = r;
        this.block = new Uint8Array(this.nx * this.nz);
        for (var j = 0; j < this.nz; j++) {
            for (var i = 0; i < this.nx; i++) {
                if (!this.free(this.x0 + i * CELL, this.z0 + j * CELL)) this.block[j * this.nx + i] = 1;
            }
        }
    }
    Grid.prototype.free = function (x, z) {
        for (var k = 0; k < this.rects.length; k++) {
            var a = this.rects[k];
            if (x > a.x0 && x < a.x1 && z > a.z0 && z < a.z1) return false;
        }
        return true;
    };
    // a->b doğrusu hiçbir şişirilmiş bloğun içinden geçmiyor mu (kenara değmek serbest)
    Grid.prototype.clear = function (ax, az, bx, bz) {
        var dx = bx - ax, dz = bz - az;
        for (var k = 0; k < this.rects.length; k++) {
            var a = this.rects[k];
            var x0 = a.x0 + EPS, x1 = a.x1 - EPS, z0 = a.z0 + EPS, z1 = a.z1 - EPS;   // hücre merkezleri köşeye çok yakın olabilir: biraz tolerans
            var t0 = 0, t1 = 1;
            if (Math.abs(dx) < 1e-9) { if (ax <= x0 || ax >= x1) continue; }
            else {
                var u0 = (x0 - ax) / dx, u1 = (x1 - ax) / dx;
                if (u0 > u1) { var tmp = u0; u0 = u1; u1 = tmp; }
                if (u0 > t0) t0 = u0; if (u1 < t1) t1 = u1;
                if (t0 >= t1) continue;
            }
            if (Math.abs(dz) < 1e-9) { if (az <= z0 || az >= z1) continue; }
            else {
                var v0 = (z0 - az) / dz, v1 = (z1 - az) / dz;
                if (v0 > v1) { var tmp2 = v0; v0 = v1; v1 = tmp2; }
                if (v0 > t0) t0 = v0; if (v1 < t1) t1 = v1;
                if (t0 >= t1) continue;
            }
            return false;
        }
        return true;
    };
    Grid.prototype.cellOf = function (x, z) {
        var i = Math.round((x - this.x0) / CELL), j = Math.round((z - this.z0) / CELL);
        if (i < 0) i = 0; if (i >= this.nx) i = this.nx - 1;
        if (j < 0) j = 0; if (j >= this.nz) j = this.nz - 1;
        return j * this.nx + i;
    };
    Grid.prototype.px = function (c) { return this.x0 + (c % this.nx) * CELL; };
    Grid.prototype.pz = function (c) { return this.z0 + Math.floor(c / this.nx) * CELL; };
    // en yakın boş hücre (halka halka aranır)
    Grid.prototype.nearestFree = function (c) {
        if (!this.block[c]) return c;
        var ci = c % this.nx, cj = Math.floor(c / this.nx);
        for (var rr = 1; rr < 60; rr++) {
            var best = -1, bd = 1e9;
            for (var dj = -rr; dj <= rr; dj++) {
                for (var di = -rr; di <= rr; di++) {
                    if (Math.max(Math.abs(di), Math.abs(dj)) !== rr) continue;
                    var i = ci + di, j = cj + dj;
                    if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) continue;
                    var n = j * this.nx + i;
                    if (this.block[n]) continue;
                    var d = di * di + dj * dj;
                    if (d < bd) { bd = d; best = n; }
                }
            }
            if (best >= 0) return best;
        }
        return c;
    };

    // ikili yığın (eşitlikte ekleme sırası: her yerde aynı sonuç)
    function Heap() { this.f = []; this.n = []; this.o = []; this.cnt = 0; }
    Heap.prototype.less = function (a, b) { return this.f[a] < this.f[b] || (this.f[a] === this.f[b] && this.o[a] < this.o[b]); };
    Heap.prototype.swap = function (a, b) {
        var t = this.f[a]; this.f[a] = this.f[b]; this.f[b] = t;
        t = this.n[a]; this.n[a] = this.n[b]; this.n[b] = t;
        t = this.o[a]; this.o[a] = this.o[b]; this.o[b] = t;
    };
    Heap.prototype.push = function (node, f) {
        var i = this.f.length;
        this.f.push(f); this.n.push(node); this.o.push(this.cnt++);
        while (i > 0) { var p = (i - 1) >> 1; if (!this.less(i, p)) break; this.swap(i, p); i = p; }
    };
    Heap.prototype.pop = function () {
        var top = this.n[0], last = this.f.length - 1;
        this.swap(0, last); this.f.pop(); this.n.pop(); this.o.pop();
        var i = 0, len = this.f.length;
        for (;;) {
            var l = i * 2 + 1, r = l + 1, m = i;
            if (l < len && this.less(l, m)) m = l;
            if (r < len && this.less(r, m)) m = r;
            if (m === i) break;
            this.swap(i, m); i = m;
        }
        return top;
    };

    var DI = [1, -1, 0, 0, 1, 1, -1, -1], DJ = [0, 0, 1, -1, 1, -1, 1, -1], DC = [10, 10, 10, 10, 14, 14, 14, 14];

    // (sx,sz) -> (tx,tz) yolu: başlangıç hariç ara noktalar + son nokta. Hedef blok içindeyse en yakın boş nokta.
    Grid.prototype.findPath = function (sx, sz, tx, tz) {
        var tFree = this.free(tx, tz), sFree = this.free(sx, sz);
        var tc = this.nearestFree(this.cellOf(tx, tz));
        var ex = tFree ? tx : this.px(tc), ez = tFree ? tz : this.pz(tc);
        if (sFree && this.clear(sx, sz, ex, ez)) return [[ex, ez]];
        var sc = this.nearestFree(this.cellOf(sx, sz));
        var nx = this.nx, nz = this.nz, N = nx * nz;
        var g = new Int32Array(N).fill(-1), from = new Int32Array(N).fill(-1), done = new Uint8Array(N);
        var ti = tc % nx, tj = Math.floor(tc / nx);
        var h = function (c) { var di = Math.abs(c % nx - ti), dj = Math.abs(Math.floor(c / nx) - tj); return 10 * (di + dj) - 6 * Math.min(di, dj); };
        var heap = new Heap();
        g[sc] = 0; heap.push(sc, h(sc));
        var found = false;
        while (heap.f.length) {
            var c = heap.pop();
            if (done[c]) continue;
            done[c] = 1;
            if (c === tc) { found = true; break; }
            var ci = c % nx, cj = Math.floor(c / nx);
            for (var k = 0; k < 8; k++) {
                var i = ci + DI[k], j = cj + DJ[k];
                if (i < 0 || j < 0 || i >= nx || j >= nz) continue;
                var n = j * nx + i;
                if (this.block[n] || done[n]) continue;
                // çaprazda köşe kesilmez
                if (k >= 4 && (this.block[cj * nx + i] || this.block[j * nx + ci])) continue;
                var ng = g[c] + DC[k];
                if (g[n] >= 0 && ng >= g[n]) continue;
                g[n] = ng; from[n] = c;
                heap.push(n, ng + h(n));
            }
        }
        if (!found) return [[ex, ez]];
        var cells = [];
        for (var q = tc; q !== -1; q = from[q]) cells.push(q);
        cells.reverse();
        var pts = cells.map(function (cc) { return [this.px(cc), this.pz(cc)]; }, this);
        // son hücrenin merkezinden gerçek hedefe (aynı hücrede) köşe kesmeden gidilebiliyorsa onu ekle
        var last = pts[pts.length - 1];
        if ((last[0] !== ex || last[1] !== ez) && this.clear(last[0], last[1], ex, ez)) pts.push([ex, ez]);
        // kısalt: bulunduğun noktadan görülebilen en uzak noktaya git
        var out = [], cx = sx, cz = sz, idx = -1;   // -1: henüz başlangıç noktasındayız (ilk hücreye de kısayol aranır)
        if (!sFree) { out.push(pts[0]); cx = pts[0][0]; cz = pts[0][1]; idx = 0; }
        while (idx < pts.length - 1) {
            var best = idx + 1;
            for (var j2 = pts.length - 1; j2 > idx + 1; j2--) {
                if (this.clear(cx, cz, pts[j2][0], pts[j2][1])) { best = j2; break; }
            }
            out.push(pts[best]); cx = pts[best][0]; cz = pts[best][1]; idx = best;
        }
        if (!out.length) out.push([ex, ez]);
        return out;
    };

    // yol boyunca dist kadar ilerle (m.x, m.z, m.path günceller)
    function step(m, dist) {
        while (dist > 0 && m.path && m.path.length) {
            var p = m.path[0], dx = p[0] - m.x, dz = p[1] - m.z, d = Math.hypot(dx, dz);
            if (d <= dist) { m.x = p[0]; m.z = p[1]; dist -= d; m.path.shift(); }
            else { m.x += dx / d * dist; m.z += dz / d * dist; dist = 0; }
        }
    }
    function pathLen(sx, sz, path) {
        var L = 0, x = sx, z = sz;
        for (var i = 0; i < path.length; i++) { L += Math.hypot(path[i][0] - x, path[i][1] - z); x = path[i][0]; z = path[i][1]; }
        return L;
    }
    // areas: [{z0, z1}] (canavar alanları), her biri için ızgara (canavar z0+1..z1-1 arasında kalır)
    function build(rects, areas, poolX) {
        var R = rects.map(function (b) { return [r2(b[0]), r2(b[1]), r2(b[2]), r2(b[3])]; });
        return areas.map(function (a) { return new Grid(R, a.z0 + 1, a.z1 - 1, poolX); });
    }
    return { Grid: Grid, build: build, step: step, pathLen: pathLen, r2: r2, CELL: CELL, RAD: RAD };
})()
;
