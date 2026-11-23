var OfflineGameManager = pc.createScript('offlineGameManager');

OfflineGameManager.prototype.initialize = function () {
    this.gameManager = this.entity.script.gameManager;

    this.poopSpawnCooldown = 30;
    this.poopRate = 0;
};

OfflineGameManager.prototype.update = function (dt) {
    if (this.app.room) return;
    this.handlePoopSpawn(dt);
}

OfflineGameManager.prototype.handlePoopSpawn = function (dt) {
    this.poopRate += dt;
    if (this.poopRate > this.poopSpawnCooldown) {
        this.poopRate = 0;
        if (Math.random() > 0.5) {
            let spawnPos = this.gameManager.poopSpawns.children[Math.floor(pc.math.random(0, this.gameManager.poopSpawns.children.length))].getPosition().clone();
            let poop = this.gameManager.poopTemplate.resource.instantiate();
            poop.reparent(this.app.root);
            poop.setPosition(spawnPos);
        }
    }
}