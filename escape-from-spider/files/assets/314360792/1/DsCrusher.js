var DsCrusher = pc.createScript('dsCrusher');

// Ezen duvarlar: her bölümde sol ve sağ duvar sırayla içeri girer, tek şerit açık kalır.
// İçeri giren duvar oyuncuyu suya iter. Zaman Date.now()'a bağlı, herkeste aynı.
DsCrusher.attributes.add('period', { type: 'number', default: 6 });
DsCrusher.attributes.add('retractX', { type: 'number', default: 19.1 });
DsCrusher.attributes.add('extendX', { type: 'number', default: 4.4 });

DsCrusher.prototype.initialize = function () {
    var self = this;
    this.sections = [];
    this.entity.findByTag('DSPusher').forEach(function (e) {
        var m = /^Pusher_(\d+)_([LR])$/.exec(e.name);
        if (!m) return;
        var s = +m[1];
        if (!self.sections[s]) self.sections[s] = {};
        self.sections[s][m[2]] = { e: e, side: m[2] === 'L' ? -1 : 1, lastX: e.getLocalPosition().x };
    });
};

// 0..1 arası: duvarın ne kadar içeride olduğu
DsCrusher.prototype.extension = function (t, side) {
    // döngü: 0-0.8 sol girer, 0.8-2.3 sol bekler, 2.3-2.8 sol çıkar, 3-3.8 sağ girer, 3.8-5.3 sağ bekler, 5.3-5.8 sağ çıkar
    var P = this.period;
    var k = ((t % P) + P) % P / P * 6;
    if (side > 0) k = (k + 3) % 6;
    if (k < 0.8) return pc.math.smoothstep(0, 0.8, k);
    if (k < 2.3) return 1;
    if (k < 2.8) return 1 - pc.math.smoothstep(2.3, 2.8, k);
    return 0;
};

DsCrusher.prototype.update = function (dt) {
    var ds = this.app.dontSplash;
    var now = Date.now() / 1000;
    var player = ds && ds.player;
    var pos = player ? player.getPosition() : null;
    for (var s = 0; s < this.sections.length; s++) {
        var sec = this.sections[s];
        if (!sec) continue;
        ['L', 'R'].forEach(function (key) {
            var p = sec[key];
            if (!p) return;
            var ext = this.extension(now + s * 2, p.side);
            var x = p.side * (this.retractX - (this.retractX - this.extendX) * ext);
            var lp = p.e.getLocalPosition();
            p.e.setLocalPosition(x, lp.y, lp.z);
            // İçeri giren duvar oyuncuya çarparsa it
            if (pos && !ds.caught && !ds.finished && x !== p.lastX) {
                var halfW = p.e.getLocalScale().x / 2, halfD = p.e.getLocalScale().z / 2;
                var front = x - p.side * halfW;          // oyuncuya bakan yüz
                var inZ = Math.abs(pos.z - p.e.getPosition().z) < halfD + 0.5;
                var lowY = pos.y - 1 < lp.y + p.e.getLocalScale().y / 2;
                var inside = p.side < 0 ? pos.x < front + 0.5 : pos.x > front - 0.5;
                var moving = p.side < 0 ? x > p.lastX : x < p.lastX;
                if (inZ && lowY && inside && moving) {
                    var push = -p.side;   // sol duvar +x'e iter
                    var nx = front + push * 0.7;
                    player.rigidbody.teleport(nx, pos.y + 0.1, pos.z);
                    player.rigidbody.linearVelocity = new pc.Vec3(push * 4, 2, 0);
                    if (!this.lastHit || now - this.lastHit > 0.5) { this.lastHit = now; ds.play('click', 0.8); }
                }
            }
            p.lastX = x;
        }, this);
    }
};
