var Snake = pc.createScript('snake');

Snake.prototype.init = function () {
    this.anim = this.entity.anim;

    this.sifonyer = this.entity.parent.parent.parent;
    this.sifonyer.script.interactableTransform.initSnake(this);
    this.sifonyer.sound.play("snakeHiss");
};

Snake.prototype.attack = function () {
    this.anim.setBoolean("isAttacking", true);
    this.sifonyer.sound.play("snakeAttack");
    setTimeout(() => {
        this.anim.setBoolean("isAttacking", false);
    }, 3000);

    if (this.damage)
        this.app.fire("PlayerTakeDamage", 25);
};