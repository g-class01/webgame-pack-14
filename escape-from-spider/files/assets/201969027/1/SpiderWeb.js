var SpiderWeb = pc.createScript('spiderWeb');

SpiderWeb.prototype.initialize = function () {
    this.caughtTimeout = null;
    this.model = this.entity.findByName("Model");

    this.entity.collision.on('triggerenter', this.onTriggerEnter, this);
};

SpiderWeb.prototype.destroyTimer = function (duration) {
    this.destroyTimeout = setTimeout(() => {
        this.model
            .tween(this.model.getLocalScale())
            .to(new pc.Vec3(0, 0, 0), .35, pc.QuanticOut)
            .onComplete(() => {
                if (this.entity.waypoint != null) {
                    this.entity.waypoint.web = null;
                }

                clearTimeout(this.destroyTimeout);
                if (this.caughtTimeout)
                    clearTimeout(this.caughtTimeout);

                this.entity.destroy();
            })
            .start();
    }, duration * 1000);
}

SpiderWeb.prototype.onTriggerEnter = function (entity) {
    if (!entity.tags.has("Player")) return;
    if (this.app.player.controller.isGrabbedBySpider) return;
    if (this.app.isSpider) return;
    if (this.app.player.controller.caught) return;
    if (this.app.caughtWeb != null) return;

    this.app.fire('WarningTextController:setWarning', "You caught! Use scissors if you can.", 5, new pc.Color(1, 0, 0, 1));

    this.app.player.canMove = false;
    this.app.player.controller.setCaught(true);
    this.app.caughtWeb = this;
    if (this.entity && this.entity.sound)
        this.entity.sound.play("caught");

    try {
        this.model
            .tween(this.model.getLocalScale())
            .to(new pc.Vec3(1.2, 1, .8), .2, pc.QuanticOut)
            .onComplete(() => {
                this.model
                    .tween(this.model.getLocalScale())
                    .to(pc.Vec3.ONE, .4, pc.ElasticOut)
                    .start();
            })
            .start();

        if (this.app.room)
            this.app.room.send("Caught:SpiderWeb");

        if (this.destroyTimeout)
            clearTimeout(this.destroyTimeout);

        this.caughtTimeout = setTimeout(() => {
            if (this.entity && this.entity.sound)
                this.entity.sound.play("uncaught");
            this.app.player.canMove = true;
            this.app.player.controller.setCaught(false);
            this.app.caughtWeb = null;

            this.model
                .tween(this.model.getLocalScale())
                .to(new pc.Vec3(0, 0, 0), .35, pc.QuanticOut)
                .onComplete(() => {
                    if (this.entity.waypoint != null) {
                        this.entity.waypoint.web = null;
                    }

                    if (this.app.room && this.id) {
                        this.app.room.send("Despawn:SpiderWeb", { id: this.id })
                    }
                    else {
                        this.entity.destroy();
                    }
                })
                .start();
        }, 10000);
    } catch (e) {
        console.log(e);
        this.app.player.canMove = true;
        this.app.player.controller.setCaught(false);
        this.app.caughtWeb = null;
    }
};