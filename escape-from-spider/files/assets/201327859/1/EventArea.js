var EventArea = pc.createScript('eventArea');
EventArea.attributes.add("trigger", { type: "entity" })
EventArea.attributes.add("event", { type: "string" })

EventArea.prototype.initialize = function() {
    this.trigger.collision.on('triggerenter', this.onTriggerEnter, this);
};

EventArea.prototype.onTriggerEnter = function (entity) {
    if (!entity.tags.has("Player")) return;
    
    this.app.fire(this.event);
};