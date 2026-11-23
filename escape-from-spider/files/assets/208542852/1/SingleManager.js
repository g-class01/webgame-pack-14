var SingleManager = pc.createScript('singleManager');

SingleManager.prototype.initialize = function () {
    this.active = false;
    
    this.app.on("StartOfflineGame", this.startGame, this);

    this.entity.on("destroy", () => {
        this.app.off("StartOfflineGame", this.startGame, this);
    });
};

SingleManager.prototype.startGame = function () {
    this.app.offline = true;

    this.app.network.onlineCounter.enabled = false;

    let pass = Math.floor(Math.random() * 900) + 100;
    this.app.fire("SetLockedCasePassword", pass);
    this.app.lockedCasePassword = pass;

    let compPass = parseInt(
        // 4 haneli içinde 0 olmayan şifre
        Array.from({ length: 4 }, () => Math.floor(Math.random() * 9) + 1).join('')
    );
    this.app.fire("SetComputerPassword", compPass);
    this.app.computerPassword = compPass;

    this.app.fire("GenerateSpawns");

    this.timer = 900;
    this.active = true;

    console.log("Singleplayer game started!");
};

SingleManager.prototype.update = function (dt) {
    if (!this.active) return;

    this.timer -= dt;
    this.app.ui.setTimer(Math.floor(this.timer));

    if (this.timer <= 0 && this.active) {
        this.active = false;
        //this.app.fire("EndGameLose");
    }
};