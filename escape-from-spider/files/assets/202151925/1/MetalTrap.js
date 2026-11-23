var MetalTrap = pc.createScript('metalTrap');
MetalTrap.attributes.add("leftSpike", { type: "entity" })
MetalTrap.attributes.add("rightSpike", { type: "entity" })

MetalTrap.prototype.initialize = function () {
    this.active = true;

    this.entity.collision.on('triggerenter', this.onTriggerEnter, this);

    this.spider = this.app.spiderController;
};

MetalTrap.prototype.update = function () {
    if (!this.active) return;

    if (!this.spider) {
        if (this.app.spiderController) {
            this.spider = this.app.spiderController;
        }
        else return;
    }

    let distance = this.spider.entity.getPosition().distance(this.entity.getPosition());

    if (distance < 2) {
        if (this.app.room) {
            this.active = false;

            this.app.room.send("Caught:BearTrap", {
                id: this.id,
                name: this.username,
                spiderCaught: true,
            })
        }
        else {
            this.spider.trap(5);
            this.caughtAnim();
        }
    }
};

MetalTrap.prototype.onTriggerEnter = function (entity) {
    if (!entity.tags.has("Player")) return;
    if (this.app.player.controller.isGrabbedBySpider) return;
    if (this.isOwner) return;
    if (!this.active) return;

    this.app.player.canMove = false;
    this.entity.sound.play("caught");

    if (this.app.room) {
        this.app.room.send("Caught:BearTrap", {
            id: this.id,
            name: this.username,
            spiderCaught: false,
        })
    }

    this.app.fire('WarningTextController:setWarning', "You caught by " + this.username + "'s trap!", 5, new pc.Color(1, 0, 0, 1));
    this.caughtAnim();
    this.app.player.controller.trap(5);

    setTimeout(() => {
        this.entity.sound.play("uncaught");
        this.app.player.canMove = true;
    }, 5000)
};

MetalTrap.prototype.caughtAnim = function (name = null, caughtName = null) {
    this.active = false;
    //console.log("anim");

    if (name && caughtName)
        this.app.fire('WarningTextController:setWarning', caughtName + " caught by " + name + "'s trap!", 3, new pc.Color(1, 1, 0, 1));

    // left 90 right -90
    this.leftSpike
        .tween(this.leftSpike.getLocalEulerAngles())
        .rotate(new pc.Vec3(90, 0, 0), .35, pc.QuinticOut)
        .start();

    this.rightSpike
        .tween(this.rightSpike.getLocalEulerAngles())
        .rotate(new pc.Vec3(-90, 0, 0), .15, pc.QuinticOut)
        .start();

    setTimeout(() => {
        this.entity.destroy();
    }, 5100);
}