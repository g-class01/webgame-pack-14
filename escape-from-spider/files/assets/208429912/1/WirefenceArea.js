var WirefenceArea = pc.createScript('wirefenceArea');
WirefenceArea.attributes.add("collider", { type: "entity" })
WirefenceArea.attributes.add("trigger", { type: "entity" })
WirefenceArea.attributes.add("electricyParent", { type: "entity" })

WirefenceArea.prototype.initialize = function () {
    this.trigger.collision.on("triggerenter", (other) => {
        if (!other.tags.has("Player")) return;

        this.app.fire('WarningTextController:setWarning', "You have to cut the electric leak to enter!", 3, new pc.Color(1, 0, 0, 1));
    }, this);

    this.app.on("UnlockElectricArea", this.unlock, this);

    this.entity.on("destroy", () => {
        this.app.off("UnlockElectricArea", this.unlock, this);
    }, this);
};

WirefenceArea.prototype.unlock = function () {
    this.collider.enabled = false;
    this.trigger.enabled = false;
    this.electricyParent.enabled = false;
    this.electricyParent.sound.stop("electric");
    this.entity.sound.play("cut");
}