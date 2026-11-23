var CollisionDisabledCollision = pc.createScript('collisionDisabledCollision');
CollisionDisabledCollision.attributes.add("name", { type: "string", default: "Player" })
CollisionDisabledCollision.attributes.add("objects", { type: "entity", array: true })


// initialize code called once per entity
CollisionDisabledCollision.prototype.initialize = function () {
    this.setDisabled(this.app.root.findByName(this.name))


};
CollisionDisabledCollision.prototype.collisionArray = function () {
    for (let i = 0; i < this.objects.length; i++) {
        this.setDisabled(this.objects[i]);
    }
}
// update code called every frame
CollisionDisabledCollision.prototype.setDisabled = function (entity) {
    var collisionGroup = pc.BODYGROUP_USER_2;

    this.entity.rigidbody.group = collisionGroup;
    this.entity.rigidbody.mask = ~collisionGroup;

    entity.rigidbody.group = collisionGroup;
    entity.rigidbody.mask = ~collisionGroup;
};