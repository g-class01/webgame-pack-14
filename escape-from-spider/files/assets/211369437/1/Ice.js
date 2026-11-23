var Ice = pc.createScript('ice');

Ice.prototype.initialize = function () {
    this.entity.collision.on('triggerenter', this.onTriggerEnter, this);

    this.canAffectSpider = true;
    this.spider = this.app.spiderController;
    this.used = false;
};

Ice.prototype.update = function (dt) {
    if (this.canAffectSpider && this.isOwner) {
        if (!this.spider) {
            if (this.app.spiderController) {
                this.spider = this.app.spiderController;
            }
            else return;
        }

        let distance = this.spider.entity.getPosition().distance(this.entity.getPosition());
        if (distance < 3) {
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
}

Ice.prototype.onTriggerEnter = function (entity) {
    if (!entity.tags.has("Player")) return;
    if (this.isOwner) return;
    if (this.used) return;

    this.app.room.send("Client:Freeze", {
        duration: 5
    })

    this.used = true;
};