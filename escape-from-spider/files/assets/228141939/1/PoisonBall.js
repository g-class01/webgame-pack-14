var PoisonBall = pc.createScript('poisonBall');
PoisonBall.attributes.add("force", { type: "number" })

PoisonBall.prototype.initialize = function () {
    this.targetDir = null;
    this.entity.collision.on('collisionstart', this.onCollisionEnter, this);
    this.exploded = false;
};

PoisonBall.prototype.applyForceToBall = function () {
    if (this.targetDir != null) {
        this.targetDir.mulScalar(this.force);
        this.entity.rigidbody.applyImpulse(this.targetDir);
    }
};

PoisonBall.prototype.onCollisionEnter = function (entity) {
    //ai tarafindan atildi
    if (this.isOwner == null) {
        console.log("EXPLODE", entity.other.name)
        if (this.exploded || entity.other == null || !entity.other.tags.has("Ground")) return;

        if (this.app.room)
            this.app.room.send("Spawn:CentipedePoisonExplosionAI", { id: this.id, xPos: this.entity.getPosition().x, yPos: this.entity.getPosition().y, zPos: this.entity.getPosition().z })
        else {
            let explosion = this.app.gameManager.centipedePoisonExplosionTemplate.resource.instantiate();
            this.app.root.addChild(explosion);
        }
    } else { //player tarafindan atildi
        if (!this.isOwner || this.exploded || entity.other == null || !entity.other.tags.has("Ground")) return;

        if (this.app.room)
            this.app.room.send("Spawn:CentipedePoisonExplosion", { id: this.id, xPos: this.entity.getPosition().x, yPos: this.entity.getPosition().y, zPos: this.entity.getPosition().z })
        else {
            let explosion = this.app.gameManager.centipedePoisonExplosionTemplate.resource.instantiate();
            this.app.root.addChild(explosion);
        }
    }
    this.entity.enabled = false;
    this.exploded = true;
};