var PlayAreaManager = pc.createScript('playAreaManager');
PlayAreaManager.attributes.add("waitingText", { type: "entity" })

PlayAreaManager.prototype.initialize = function () {
    eventSubscribe(this, "Connected", this.onListen);
};

PlayAreaManager.prototype.onListen = function () {
    if (!this.app.room) return;

    this.assignAreas();

    this.app.room.state.areas.onAdd((area, sessionId) => {
        if (area.id in this.areas) {
            let ar = this.areas[area.id];

            area.onChange(() => {
                ar.cooldownText.enabled = area.players.length > 0;
                ar.cooldownText.element.text = "(" + area.cooldown + " sec)";
            })

            area.players.onAdd(() => {
                ar.cooldownText.enabled = area.players.length > 0;
            });
            
            area.players.onRemove(() => {
                ar.cooldownText.enabled = area.players.length > 0;
            });
        }
    })

    this.app.room.onMessage("type", (message) => {

    });
}

PlayAreaManager.prototype.assignAreas = function () {
    this.areas = this.app.root.findByTag("PlayArea")
        .reduce((dict, e) => {
            if (e.script && e.script.playArea) {
                let playArea = e.script.playArea;
                dict[playArea.id] = playArea;
            }
            return dict;
        }, {});
};