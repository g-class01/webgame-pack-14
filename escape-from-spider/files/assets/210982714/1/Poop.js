var Poop = pc.createScript('poop');

Poop.prototype.initialize = function () {
    this.entity.collision.on('triggerenter', this.onTriggerEnter, this);
};

Poop.prototype.onTriggerEnter = function (entity) {
    if (!entity.tags.has("Player")) return;

    this.app.fire('WarningTextController:setWarning', "You stepped on a poop!", 5, new pc.Color(1, 0, 0, 1));
    this.entity.sound.play("stepon");

    if (this.app.room) this.app.room.send("Caught:Poop", { id: this.id })
    else {
        let flyArmy = this.app.gameManager.flyArmyTemplate.resource.instantiate();
        this.app.root.addChild(flyArmy);
        flyArmy.script.flyArmy.setTarget(this.app.player.entity);
        this.entity.destroy();
    }
};