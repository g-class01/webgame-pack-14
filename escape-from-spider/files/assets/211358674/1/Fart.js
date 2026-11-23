var Fart = pc.createScript('fart');

Fart.prototype.initialize = function () {
    this.canDamage = false;
    this.damageRate = 0;
    this.used = false;
    this.entity.collision.on('triggerenter', this.onTriggerEnter, this);
    this.entity.collision.on('triggerleave', this.onTriggerExit, this);

    this.canAffectSpider = true;
    this.spider = this.app.spiderController;
};

Fart.prototype.update = function (dt) {
    if (this.canAffectSpider && this.isOwner) {
        if (!this.spider) {
            if (this.app.spiderController) {
                this.spider = this.app.spiderController;
            }
            else return;
        }

        let distance = this.spider.entity.getPosition().distance(this.entity.getPosition());
        if (distance < 6) {
            if (this.app.room) {
                this.app.room.send("Spider:Stun", {
                    duration: 5
                })
            }
            else {
                this.spider.stun(5);
            }

            this.canAffectSpider = false;
        }
    }

    if (!this.canDamage || this.isOwner) return;

    this.damageRate += dt;
    if (this.damageRate > 1) {
        this.app.fire("PlayerTakeDamage", 10);
        this.damageRate = 0;
    }
}

Fart.prototype.onTriggerEnter = function (entity) {
    if (!entity.tags.has("Player")) return;
    if (this.isOwner) return;
    if (this.used) return;

    if (this.app.isSpider) {
        this.app.room.send("Client:Stun", {
            duration: 5
        })
        this.used = true;
    } else {
        this.app.fire("PlayerTakeDamage", 10);
        this.canDamage = true;
    }
};

Fart.prototype.onTriggerExit = function (entity) {
    if (!entity.tags.has("Player")) return;

    this.canDamage = false;
    this.damageRate = 0;
};