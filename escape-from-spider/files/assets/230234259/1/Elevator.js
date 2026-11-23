var Elevator = pc.createScript('elevator');
Elevator.attributes.add("id", { type: "number" });

Elevator.prototype.initialize = function () {
    this.enterTrigger = this.entity.findByName("enterTrigger");
    this.enterTrigger.collision.on("triggerenter", this.enter, this);
    eventSubscribe(this, "Connected", this.onListen);
};

Elevator.prototype.onListen = function () {
    if (!this.app.room) return;
    this.app.room.onMessage("Elevator:Trigger", (message) => {
        if (message && this.id == message.id && this.entity.script.motion.currentMotion == false) {
            this.entity.fire("Motion", "elevator");
            this.enterTrigger.sound.play("elevator");
        }
    });
}

Elevator.prototype.enter = function (other) {
    if (!other.tags.has("Player")) return;
    if (this.app.room) {
        this.app.room.send("Elevator:Trigger", { id: this.id });
    } else {
        this.entity.fire("Motion", "elevator");
    }
};