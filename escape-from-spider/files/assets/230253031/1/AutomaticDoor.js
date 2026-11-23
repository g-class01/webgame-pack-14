var AutomaticDoor = pc.createScript('automaticDoor');
AutomaticDoor.attributes.add("id", { type: "number" });

AutomaticDoor.prototype.initialize = function () {
    this.enterTrigger = this.entity.findByName("enterTrigger");
    this.enterTrigger.collision.on("triggerenter", this.enter, this);
    eventSubscribe(this, "Connected", this.onListen);
};

AutomaticDoor.prototype.onListen = function () {
    if (!this.app.room) return;
    this.app.room.onMessage("AutomaticDoor:Trigger", (message) => {
        if (message && this.id == message.id && this.entity.script.motion.currentMotion == false) {
            this.entity.fire("Motion", "AutomaticDoor");
            this.enterTrigger.sound.play("AutomaticDoor");
        }
    });
}

AutomaticDoor.prototype.enter = function (other) {
    if (!other.tags.has("Player")) return;
    if (this.app.room) {
        this.app.room.send("AutomaticDoor:Trigger", { id: this.id });
    } else {
        this.entity.fire("Motion", "AutomaticDoor");
    }
};