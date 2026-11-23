var TankerWall = pc.createScript('tankerWall');

TankerWall.prototype.initialize = function () {
    this.indicator = this.entity.findByName("Indicator");
    this.tankerWallExploded = this.entity.findByName("TankerWallExploded");
    this.explodeParticle = this.entity.findByName("ExplodeParticle");

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle), this);

    this.app.tankerWall = this;
    this.locked = true;

    this.entity.canInteract = true;
};

TankerWall.prototype.interact = function (playerInteract) {
    if (!playerInteract.rightItem || Item.Grenade != playerInteract.rightItem.id) {
        this.app.fire('WarningTextController:setWarning', "You need the grenade to place!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    this.app.currentInteractable.entity.enabled = false;
    this.app.player.interact.setRightHand(null);

    if (this.app.room) this.app.room.send("TankerWall:Unlock");
    else this.unlock();
};

TankerWall.prototype.unlock = function () {
    this.locked = false;

    this.entity.canInteract = false;
    this.app.player.interact.refresh();
    toggleIndicator(this, false);

    this.entity.render.enabled = false;
    this.entity.rigidbody.enabled = false;
    this.entity.collision.enabled = false;
    this.tankerWallExploded.render.enabled = true;

    this.explodeParticle.particlesystem.play();

    this.app.fire("RefreshTutorial");
}
