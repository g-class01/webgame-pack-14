var Teleporter = pc.createScript('teleporter');
Teleporter.attributes.add("targetPoint", { type: "entity" })

Teleporter.prototype.initialize = function () {
    this.entity.collision.on("triggerenter", (other) => {
        if (!other.tags.has("Player")) return;
        other.rigidbody.teleport(this.targetPoint.getPosition().clone());
        this.entity.sound.play("swoosh")
    });
};