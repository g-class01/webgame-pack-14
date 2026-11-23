var FlyArmy = pc.createScript('flyArmy');

FlyArmy.prototype.initialize = function () {
    this.canDamage = false;
    this.damageRate = 0;

    this.entity.collision.on('triggerenter', this.onTriggerEnter, this);
    this.entity.collision.on('triggerleave', this.onTriggerExit, this);

    this.entity.on("destroy", () => {
        clearTimeout(this.tm);
    }, this);
};

FlyArmy.prototype.setTarget = function (target) {
    let pos = target.getPosition().clone().add(new pc.Vec3(0, 1, 0));
    this.entity.setPosition(pos);

    this.target = target;

    this.entity.reparent(this.app.root);

    let tm = setTimeout(() => {
        clearTimeout(tm);
        this.entity.destroy();
    }, 10000);
};

FlyArmy.prototype.update = function (dt) {
    if (!this.target) return;

    let pos = this.entity.getPosition().clone();
    let targetPos = this.target.getPosition().clone();
    let lerp = pos.lerp(pos, targetPos, 2 * dt);
    this.entity.setPosition(lerp);
    this.entity.lookAt(targetPos);

    const distance = this.entity.getPosition().distance(targetPos);
    if (distance > 10)
        this.target = null;

    if (!this.canDamage) return;

    this.damageRate += dt;
    if (this.damageRate > .5) {
        this.app.fire("PlayerTakeDamage", 10);
        this.damageRate = 0;
    }
}

FlyArmy.prototype.onTriggerEnter = function (entity) {
    if (!this.target) return;
    if (!entity.tags.has("Player")) return;
    if (entity != this.target) return;

    this.app.fire("PlayerTakeDamage", 10);
    this.canDamage = true;
};

FlyArmy.prototype.onTriggerExit = function (entity) {
    if (!this.target) return;
    if (!entity.tags.has("Player")) return;
    if (entity != this.target) return;

    this.canDamage = false;
    this.damageRate = 0;
};