var PlayerSpider = pc.createScript('playerSpider');

PlayerSpider.prototype.initialize = function () {
    this.canSpiderAttack = true;
    this._requestAttack = false;
    this.app.on("BecomeSpider", this.onBecomeSpider, this);
    this.app.on("BecomeHuman", this.onBecomeHuman, this);

    this.entity.on("destroy", () => {
        this.app.off("BecomeSpider", this.onBecomeSpider, this);
        this.app.off("BecomeHuman", this.onBecomeHuman, this);
        clearTimeout(this.spiderAttackTimeout);
    }, this);
};

PlayerSpider.prototype.onBecomeSpider = function () {
    this.canSpiderAttack = true;
    this.app.networkManager.spiderWebUI.children[0].element.text = (5 - this.app.webCount) + "/5";
};

PlayerSpider.prototype.onBecomeHuman = function () {
    this.canSpiderAttack = false;
};

PlayerSpider.prototype.update = function (dt) {
    if (!this.app.isSpider) return;

    this.handleWeb();
    this.handleAttack();
};

PlayerSpider.prototype.handleWeb = function () {
    if (!this.app.room || this.app.anyMenuEnabled() || this.app.networkManager.currentSceneName == "Catch") return;

    if (window.touchJoypad.buttons.wasPressed('spiderWeb') || this.app.mouse.wasPressed(pc.MOUSEBUTTON_RIGHT)) {
        if (getCurrentChapter() == Chapters.Three) {

        }
        else if (getCurrentChapter() == Chapters.Two) {
            if (this.app.webCount < 5) {
                if (this.app.room) {
                    this.app.room.send("Spawn:CentipedePoisonBall", {
                        dirX: this.app.player.controller.playerSpider.forward.x,
                        dirY: this.app.player.controller.playerSpider.forward.y + 0.5,
                        dirZ: this.app.player.controller.playerSpider.forward.z,
                    });
                }
            } else {
                this.app.fire('WarningTextController:setWarning', "Out of poisons! Recharging..", 5, new pc.Color(1, 1, 0, 1));
            }
        } else {
            const rayStart = this.entity.getPosition().clone();
            const rayEnd = rayStart.clone().sub(new pc.Vec3(0, 1.25, 0));

            const _rayResults = [
                this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd, "Ground"),
                this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd.clone().add(new pc.Vec3(0.5, 0, 0.5)), "Ground"),
                this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd.clone().add(new pc.Vec3(0.5, 0, -0.5)), "Ground"),
                this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd.clone().add(new pc.Vec3(-0.5, 0, 0.5)), "Ground"),
                this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd.clone().add(new pc.Vec3(-0.5, 0, -0.5)), "Ground")
            ];

            let success = false;
            let pos = pc.Vec3.ZERO;
            for (const result of _rayResults) {
                if (result) {
                    pos = result.point.clone().add(new pc.Vec3(0, .1, 0));
                    success = true;
                    break;
                }
            }

            if (success) {
                if (this.app.webCount < 5) {
                    if (this.app.room) {
                        this.app.room.send("Spawn:SpiderWeb", {
                            xPos: pos.x,
                            yPos: pos.y,
                            zPos: pos.z,
                        });
                    }
                } else {
                    this.app.fire('WarningTextController:setWarning', "Out of webs! Recharging..", 5, new pc.Color(1, 1, 0, 1));
                }
            }
        }
    }
};

PlayerSpider.prototype.handleAttack = function () {
    if (this.app.player.controller.isDied || !this.app.player.canMove || this.app.anyMenuEnabled()) return;

    if (window.touchJoypad.buttons.wasPressed('spiderAttackButton') || this.app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) {
        if (this.app.isSpider && this.canSpiderAttack) {
            //carrying some player in mouth
            if (this.app.room.state.spider.grabbedPlayerSession != "" && this.app.room.state.spider.grabbedPlayerSession != null) {
                if (this.app.room) {
                    //yakinda prison varsa hapse at yoksa yere birak
                    let prisonCells = this.app.gameManager.prisonCells;
                    let playerPos = this.entity.getPosition();
                    let closestCell = null;
                    let closestDistance = 10;

                    for (let i = 0; i < prisonCells.length; i++) {
                        let cell = prisonCells[i];
                        let dist = cell.children[0].getPosition().distance(playerPos);

                        if (dist < closestDistance) {
                            closestDistance = dist;
                            closestCell = cell;
                        }
                    }
                    if (closestCell) {
                        this.app.room.send("Client:SpiderDropPlayer", { cageId: closestCell.script.interactableCage.id });
                    } else {
                        this.app.room.send("Client:SpiderDropPlayer");
                    }
                }
            } else {
                this.app.player.controller.playerSpider.anim.setBoolean("attack", true);
                this.canSpiderAttack = false;
                if (this.app.room && this.app.networkManager.currentSceneName != "Catch") this.app.room.send("Client:SpiderAttackAnim");
                else if (this.app.room && this.app.networkManager.currentSceneName == "Catch") this.app.room.send("Client:TungAttackAnim");

                this.spiderAttackTimeout = setTimeout(() => {
                    let player = null;
                    let checkedPlayer = this.checkPlayer();

                    if (checkedPlayer != null && checkedPlayer.script.remotePlayerController.propObject == null) player = checkedPlayer.sessionId;
                    
                    if (checkedPlayer != null && this.app.networkManager.currentSceneName == "Catch" && checkedPlayer.script.remotePlayerController.isPlayerSpider) player = null;
                    else if (checkedPlayer != null && this.app.networkManager.currentSceneName == "Catch" && !checkedPlayer.script.remotePlayerController.isPlayerSpider) {
                        this.app.fire("AddCoin", 20);
                        console.log("catched player")
                    }

                    if (this.app.room && player != null)
                        this.app.room.send("Client:SpiderAttack", { player: player });

                    this.app.player.controller.playerSpider.anim.setBoolean("attack", false);
                    this.canSpiderAttack = true;
                }, 500);
            }
        }
    }
};

PlayerSpider.prototype.checkPlayer = function () {
    if (this.app.network.remotePlayers == null) return;
    let playerController = this.entity.script.playerController;
    for (const [key, remotePlayer] of Object.entries(this.app.network.remotePlayers)) {
        //pass local player
        if (key == this.entity.sessionId) continue;
        if (remotePlayer == null || remotePlayer.entity == null) return;
        // Calculate the direction vector from the current player to the other player
        let direction = this.entity.getPosition().clone().sub(remotePlayer.entity.getPosition());
        // Check if the other player is in front
        if (direction.dot(playerController.body.forward) >= 0) {
            // Check if the other player is within 10 units
            const distance = direction.length();
            if (distance < 5 && !remotePlayer.entity.isProtected &&
                remotePlayer.entity.location != LOCATIONS.PRISON && remotePlayer.entity.isWatchingAd != true) {
                return remotePlayer.entity;
            }
        }
    }
}