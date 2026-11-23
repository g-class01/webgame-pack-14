var CatchManager = pc.createScript('catchManager');

CatchManager.prototype.initialize = function () {
    eventSubscribe(this, "Connected", this.onListen);

    if (this.app.touch)
        this.app.touch.on(pc.EVENT_TOUCHSTART, this.onTouchStart, this);

    this.entity.on("destroy", () => {
        if (this.app.touch)
            this.app.touch.off(pc.EVENT_TOUCHSTART, this.onTouchStart, this);
    }, this);
};

CatchManager.prototype.onTouchStart = function () {
    if (this.app.gameEnded)
        this.restart();
}

CatchManager.prototype.onListen = function () {
    if (!this.app.room) return;

    this.app.room.onMessage("Server:TungAttackAnim", (message) => {
        let player = this.app.networkManager.remotePlayers[message.player];
        if (!player) return;

        player.remotePlayerController.spiderAttackAnim();
    });
    
    this.app.room.onMessage("type", (message) => {

    });
}

CatchManager.prototype.restart = async function () {
    if (!this.app.gameEnded) return;
    if (this.isRestarting) return;
    this.isRestarting = true;
    this.app.ambienceManager.stop();
    this.app.musicPlayer.stop();
    if (this.app.room) await this.app.room.leave();
    this.app.scenes.changeScene('Chapter1');
    this.app.gameEnded = false;
}

CatchManager.prototype.update = function (dt) {
    if (this.app.gameEnded && pc.app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) {
        this.restart();
    }
}