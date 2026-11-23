var PlayArea = pc.createScript('playArea');
PlayArea.attributes.add("id", { type: "number" })
PlayArea.attributes.add("maxPlayers", { type: "number" })
PlayArea.attributes.add("cooldownText", { type: "entity" })

PlayArea.prototype.initialize = function () {
    this.body = this.entity.findByName("Body");

    this.body.collision.on('triggerenter', this.onTriggerEnter, this);
    this.body.collision.on('triggerleave', this.onTriggerExit, this);
};

PlayArea.prototype.onTriggerEnter = function (entity) {
    if (!entity.tags.has("Player")) return;

    this.app.area.waitingText.enabled = true;

    this.app.room.send("PlayArea:Enter", {
        id: this.id,
        maxPlayers: this.maxPlayers
    })
};

PlayArea.prototype.onTriggerExit = function (entity) {
    if (!entity.tags.has("Player")) return;

    this.app.area.waitingText.enabled = false;

    this.app.room.send("PlayArea:Leave", {
        id: this.id,
        maxPlayers: this.maxPlayers
    })
};