var TriggerEvent = pc.createScript('triggerEvent');
TriggerEvent.attributes.add("enterEvent", { type: "string" });
TriggerEvent.attributes.add("exitEvent", { type: "string" });
TriggerEvent.prototype.initialize = function () {
    if (this.enterEvent)
        this.entity.collision.on('triggerenter', this.onTriggerEnter, this);
    if (this.exitEvent)
        this.entity.collision.on('triggerleave', this.onTriggerExit, this);
};

TriggerEvent.prototype.onTriggerEnter = function (entity) {
    entity.fire(this.enterEvent, this.entity);
};
TriggerEvent.prototype.onTriggerExit = function (entity) {
    entity.fire(this.exitEvent, this.entity);
};