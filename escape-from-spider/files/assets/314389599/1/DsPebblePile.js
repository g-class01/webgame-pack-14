var DsPebblePile = pc.createScript('dsPebblePile');

// Taş yığını: oyunun etkileşim sistemiyle (E / kullan butonu) her basışta 1 çakıl alınır.
// Her çakıl envanterde ayrı slotta durur. Yığın bitince bir süre sonra yeniden çıkar.
DsPebblePile.attributes.add('respawnTime', { type: 'number', default: 30 });

DsPebblePile.prototype.initialize = function () {
    this.indicator = this.entity.findByName('Indicator');
    this.stones = this.entity.findByName('Model').children.slice();
    this.left = this.stones.length;
    this.timer = 0;
    this.unbatched = false;
    var text = this.indicator && this.indicator.findByName('PickupText');
    if (text && text.element) text.element.text = 'Pick Up Pebble';
    if (this.indicator) this.indicator.enabled = false;
    this.entity.canInteract = true;
    this.entity.priority = 1;
    this.entity.on('interact', this.interact, this);
    this.entity.on('toggleIndicator', function (toggle) { toggleIndicator(this, toggle && this.entity.canInteract); }, this);
};

DsPebblePile.prototype.interact = function () {
    var ds = this.app.dontSplash;
    if (!ds || !this.entity.canInteract || this.left <= 0) return;
    if (!ds.givePebble()) return;
    this.left--;
    this.stones[this.left].enabled = false;
    ds.play('click', 0.7);
    if (this.left <= 0) {
        this.entity.canInteract = false;
        toggleIndicator(this, false);
        if (this.entity.collision) this.entity.collision.enabled = false;
        if (this.app.player && this.app.player.interact) this.app.player.interact.refresh();
        this.timer = this.respawnTime;
    }
};

DsPebblePile.prototype.update = function (dt) {
    // Ayrı ayrı gizlenebilsinler diye batch dışında tut
    if (!this.unbatched) {
        this.unbatched = true;
        this.stones.forEach(function (s) { if (s.render) { s.render.batchGroupId = -1; DontSplashManager.makeRock(s.render); } });
    }
    if (this.left > 0) return;
    this.timer -= dt;
    if (this.timer <= 0) {
        this.left = this.stones.length;
        this.stones.forEach(function (s) { s.enabled = true; });
        if (this.entity.collision) this.entity.collision.enabled = true;
        this.entity.canInteract = true;
    }
};
