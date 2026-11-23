var RigidbodyDynamicOncollision = pc.createScript('rigidbodyDynamicOncollision');

// initialize code called once per entity
RigidbodyDynamicOncollision.prototype.initialize = function () {
    this.entity.collision.on("collisionstart", this.onListen, this);
};

RigidbodyDynamicOncollision.prototype.onListen = function (col) {
    if (col.other.tags.has("Player") || col.other.tags.has("OtherPlayer")) {
        this.entity.rigidbody.type = "dynamic";
    }
};