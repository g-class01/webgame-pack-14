var DsValveRoom = pc.createScript('dsValveRoom');

// Vana odası: iki vanayı E'yi basılı tutarak çevir. İkisi de dönünce üstteki kapı açılır ve su yükselmeye başlar.
// Su oyuncuya ulaşırsa yakalanır. Oyuncu bu odadan önceki checkpoint'e dönerse oda sıfırlanır.
DsValveRoom.attributes.add('z0', { type: 'number', default: 248 });
DsValveRoom.attributes.add('z1', { type: 'number', default: 277 });
DsValveRoom.attributes.add('floorY', { type: 'number', default: 1.2 });
DsValveRoom.attributes.add('maxY', { type: 'number', default: 13.5 });
DsValveRoom.attributes.add('riseSpeed', { type: 'number', default: 0.65 });
DsValveRoom.attributes.add('riseDelay', { type: 'number', default: 3 });
DsValveRoom.attributes.add('turnTime', { type: 'number', default: 2 });
DsValveRoom.attributes.add('checkpointIndex', { type: 'number', default: 6, description: 'Odadan önceki checkpoint (0 tabanlı)' });

DsValveRoom.prototype.initialize = function () {
    var self = this;
    this.valves = this.entity.findByTag('DSValve').map(function (e) {
        return { e: e, wheel: e.findByName('Wheel'), progress: 0, done: false, spin: 0 };
    });
    this.door = this.entity.findByName('GateDoor');
    this.doorBase = this.door ? this.door.getLocalPosition().clone() : null;
    this.waterEnt = this.entity.findByName('R8Water');
    this.level = this.floorY - 0.3;
    this.state = 0; // 0 bekliyor, 1 alarm, 2 yükseliyor, 3 tamam
    this.timer = 0;
    this.doorOpen = 0;
    this.registered = false;
    this.app.on('ds:respawn', this.onRespawn, this);
    this.on('destroy', function () { this.app.off('ds:respawn', this.onRespawn, this); }, this);
};

DsValveRoom.prototype.reset = function () {
    this.valves.forEach(function (v) { v.progress = 0; v.done = false; });
    this.state = 0;
    this.level = this.floorY - 0.3;
    this.doorOpen = 0;
};

DsValveRoom.prototype.onRespawn = function (cp) {
    // Odayı geçmediyse baştan başlasın
    if (cp <= this.checkpointIndex) this.reset();
};

DsValveRoom.prototype.update = function (dt) {
    var ds = this.app.dontSplash;
    if (!ds) return;
    var self = this;
    if (!this.registered) {
        this.registered = true;
        ds.registerWaterZone({ x0: -20.6, x1: 20.6, z0: this.z0, z1: this.z1, deadly: true, getLevel: function () { return self.level; } });
        if (this.waterEnt && ds.waterMat && this.waterEnt.render) this.waterEnt.render.meshInstances[0].material = ds.waterMat;
    }
    var pos = ds.player.getPosition();
    var inRoom = pos.z > this.z0 && pos.z < this.z1 + 1;

    // Vanalar
    var prompt = null;
    for (var i = 0; i < this.valves.length; i++) {
        var v = this.valves[i];
        var vp = v.e.getPosition();
        var near = !v.done && !ds.caught && pos.distance(vp) < 4.2;
        if (near) {
            if (ds.isUseHeld()) {
                v.progress += dt / this.turnTime;
                v.spin += dt * 300;
                if (!v.lastSnd || this.timer - v.lastSnd > 0.45) { v.lastSnd = this.timer; ds.play('valve', 0.5); }
                if (v.progress >= 1) {
                    v.progress = 1; v.done = true;
                    ds.play('success', 0.6);
                    var left = this.valves.filter(function (x) { return !x.done; }).length;
                    var opened = this.valves.length - left;
                    this.app.fire('WarningTextController:setWarning', left ? 'Valve opened (' + opened + '/' + this.valves.length + ')' : 'Valve opened (' + opened + '/' + this.valves.length + ') - the water is rising, climb!', 3, new pc.Color(0, 1, 0, 1));
                    if (!left) { this.state = 1; this.timer = 0; ds.play('alarm', 0.8); }
                }
                prompt = 'Turning valve... ' + Math.round(v.progress * 100) + '%';
            } else {
                v.progress = Math.max(0, v.progress - dt * 0.5);
                prompt = this.app.isMobile ? 'Hold the hand button to turn the valve' : 'Hold E to turn the valve';
            }
        }
        if (v.wheel) v.wheel.setLocalEulerAngles(90, v.done ? 0 : v.spin, 0);
    }
    ds.setPrompt(this, inRoom ? prompt : null);

    this.timer += dt;
    if (this.state === 1 && this.timer > this.riseDelay) { this.state = 2; ds.play('door', 0.8); }
    if (this.state >= 1) this.doorOpen = Math.min(1, this.doorOpen + dt * 0.8);
    if (this.state === 2) {
        this.level = Math.min(this.maxY, this.level + dt * this.riseSpeed);
        if (this.level >= this.maxY) this.state = 3;
    }
    if (this.door && this.doorBase) this.door.setLocalPosition(this.doorBase.x, this.doorBase.y + this.doorOpen * 3.6, this.doorBase.z);
    if (this.waterEnt) {
        var wp = this.waterEnt.getLocalPosition();
        this.waterEnt.setLocalPosition(wp.x, Math.max(this.level, this.floorY - 0.3), wp.z);
        this.waterEnt.enabled = this.level > this.floorY - 0.2;
    }
};
