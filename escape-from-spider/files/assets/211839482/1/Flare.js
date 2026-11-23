var Flare = pc.createScript('flare');

Flare.prototype.initialize = function () {
    this.speed = 75;

    setTimeout(() => {
        this.entity.collision.enabled = true;
    }, 100);

    setTimeout(() => {
        this.explode();
    }, 1000);

    this.entity.collision.on('collisionstart', this.onCollisionEnter, this);
};

Flare.prototype.update = function (dt) {
    var forward = this.entity.forward.clone();
    forward.scale(this.speed * dt);
    this.entity.translate(forward);
};

Flare.prototype.onCollisionEnter = function (entity) {
    this.explode(entity);
};

Flare.prototype.explode = function (entity) {
    if (this.exploded) return;
    this.exploded = true;

    let pos = this.entity.getPosition().clone();

    let particle = this.app.gameManager.flareExplodeTemplate.resource.instantiate();
    this.app.root.addChild(particle);

    particle.setPosition(pos);
    particle.particlesystem.reset();
    particle.particlesystem.play()

    if (!this.isOwner && this.app.room && this.app.isSpider) {
        let distance = pos.distance(this.app.spiderPlayer.getPosition());
        if (distance < 15) {
            this.app.room.send("Client:Stun", {
                duration: 5
            })
        }
    }

    if (this.isOwner && this.app.room) {
        this.app.room.send("Spider:Flare", { x: pos.x, y: pos.y, z: pos.z })
    }
    else if (!this.app.room) {
        let distance = pos.distance(this.app.spiderController.spider.getPosition());

        if (distance < 15) {
            this.app.spiderController.stun(5);
        }
        else {
            this.app.spiderController.setFlarePos(pos, 5);
        }
    }

    this.entity.destroy();
}