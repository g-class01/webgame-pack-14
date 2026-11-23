var GameManager = pc.createScript('gameManager');
GameManager.attributes.add("bearTrapTemplate", { type: "asset", assetType: "template" })
GameManager.attributes.add("spiderWebTemplate", { type: "asset", assetType: "template" })
GameManager.attributes.add("poopTemplate", { type: "asset", assetType: "template" })
GameManager.attributes.add("flyArmyTemplate", { type: "asset", assetType: "template" })
GameManager.attributes.add("fartTemplate", { type: "asset", assetType: "template" })
GameManager.attributes.add("iceTemplate", { type: "asset", assetType: "template" })
GameManager.attributes.add("cageTemplate", { type: "asset", assetType: "template" })
GameManager.attributes.add("flareTemplate", { type: "asset", assetType: "template" })
GameManager.attributes.add("flareExplodeTemplate", { type: "asset", assetType: "template" })
GameManager.attributes.add("poopSpawns", { type: "entity" })
GameManager.attributes.add("prisonCells", { type: "entity", array: true })
GameManager.attributes.add("centipedePoisonBallTemplate", { type: "asset", assetType: "template" })
GameManager.attributes.add("centipedePoisonExplosionTemplate", { type: "asset", assetType: "template" })

GameManager.prototype.initialize = function () {
    this.app.gameManager = this;
    this.app.pixelRatio = Math.min(devicePixelRatio, 1.5);
    pc.Application.getApplication().graphicsDevice.maxPixelRatio = this.app.pixelRatio;
    this.totalCCU = this.app.root.findByName("AnnouncementTableTotalCCU");
    eventSubscribe(this, "Connected", this.onListen);
};

GameManager.prototype.onListen = function () {
    if (!this.app.room) return;

    this.app.fire("SetLockedCasePassword", this.app.room.state.lockedCasePassword);
    this.app.lockedCasePassword = this.app.room.state.lockedCasePassword;

    this.app.fire("SetComputerPassword", this.app.room.state.computerPassword);
    this.app.computerPassword = this.app.room.state.computerPassword;


    if (getCurrentChapter() == Chapters.Three) {
        this.passwordPapersParent = this.app.root.findByName("PasswordPapers");

        this.passwordPapersParent.children[this.app.room.state.passwordPaperIndex].findByName("Text").element.text = this.app.room.state.lockedCasePassword;
    }

    if (this.app.room.state.itemSpawns.lockedCase != -1) {
        this.app.fire("SetSpawns", this.app.room.state.itemSpawns);
    }
    else {
        this.app.fire("GenerateSpawns");
    }

    this.app.room.state.itemSpawns.onChange(() => {
        if (this.app.room.state.itemSpawns.lockedCase != -1) {
            //console.log("spawnlar geldu", this.app.room.state.itemSpawns)
            this.app.fire("SetSpawns", this.app.room.state.itemSpawns);
        }
    })

    this.app.room.onMessage("Spawn:BearTrap", (message) => {
        let isOwner = this.app.room.sessionId == message.owner;
        let spawnPos = new pc.Vec3(message.xPos, message.yPos, message.zPos);

        let trap = this.bearTrapTemplate.resource.instantiate();
        trap.reparent(this.app.root);
        trap.tags.add("BearTrap");
        trap.setPosition(spawnPos);
        trap.script.metalTrap.isOwner = isOwner;
        trap.script.metalTrap.owner = message.owner;
        trap.script.metalTrap.id = message.id;
        trap.script.metalTrap.username = message.name;
    })

    this.app.room.onMessage("Despawn:BearTrap", (message) => {
        let trap = this.app.root.findByTag("BearTrap").find(t => t.script.metalTrap.id == message.id);
        if (trap)
            trap.destroy();
    })

    this.app.room.onMessage("Caught:BearTrap", (message) => {
        let trap = this.app.root.findByTag("BearTrap").find(t => t.script.metalTrap.id == message.id);
        if (trap) {
            if (message.spiderCaught == true) {
                trap.script.metalTrap.caughtAnim();
            }
            else {
                trap.script.metalTrap.caughtAnim(message.name, message.caughtName);
                if (this.app.room.sessionId == message.caughtPlayer) {
                } else {
                    this.app.network.remotePlayers[message.caughtPlayer].remotePlayerController.trap(5);
                }
            }
        }
    })

    this.app.room.onMessage("Spawn:CentipedePoisonExplosion", (message) => {
        let isOwner = this.app.room.sessionId == message.owner;
        let spawnPos = new pc.Vec3(message.xPos, message.yPos, message.zPos);

        let exp = this.centipedePoisonExplosionTemplate.resource.instantiate();
        exp.reparent(this.app.root);
        exp.tags.add("CentipedePoisonExplosion");
        exp.setPosition(spawnPos);
        exp.script.poisonExplosion.isOwner = isOwner;
        exp.script.poisonExplosion.owner = message.owner;
        exp.script.poisonExplosion.id = message.id;
        exp.script.poisonExplosion.username = message.name;
    })

    this.app.room.onMessage("Despawn:CentipedePoisonExplosion", (message) => {
        let exp = this.app.root.findByTag("CentipedePoisonExplosion").find(w => w.script.poisonExplosion.id == message.id);
        if (exp) {
            if (this.app.caughtWeb && this.app.caughtWeb != null) {
                if (this.app.caughtWeb.id == exp.script.poisonExplosion.id) {
                    this.app.player.canMove = true;
                    this.app.player.controller.setCaught(false);
                    this.app.caughtWeb = null;
                }
            }

            exp.destroy();
            this.app.webCount -= 1;
            this.app.networkManager.spiderWebUI.children[0].element.text = (5 - this.app.webCount) + "/5";
            if (this.app.isSpider)
                this.app.fire('WarningTextController:setWarning', "+1 Poison", 5, new pc.Color(0, 1, 0, 1));
        }
    })

    this.app.room.onMessage("Spawn:CentipedePoisonBall", (message) => {
        let isOwner = this.app.room.sessionId == message.owner;
        if (message.owner == null)
            isOwner = null;
        let spawnPos = new pc.Vec3(message.xPos, message.yPos, message.zPos);
        let targetDir = new pc.Vec3(message.dirX, message.dirY, message.dirZ);
        let ball = this.centipedePoisonBallTemplate.resource.instantiate();
        ball.reparent(this.app.root);
        ball.tags.add("CentipedePoisionBall");
        ball.rigidbody.teleport(spawnPos.add(targetDir));
        ball.script.poisonBall.isOwner = isOwner;
        ball.script.poisonBall.owner = message.owner;
        ball.script.poisonBall.id = message.id;
        ball.script.poisonBall.username = message.name;
        ball.script.poisonBall.targetDir = targetDir;
        ball.script.poisonBall.applyForceToBall();
        console.log("SPAWN CENTIPEDE BALL", spawnPos)
        this.app.webCount += 1;
        this.app.networkManager.spiderWebUI.children[0].element.text = (5 - this.app.webCount) + "/5";
    })

    this.app.room.onMessage("Despawn:CentipedePoisonBall", (message) => {
        let poisonBall = this.app.root.findByTag("CentipedePoisionBall").find(w => w.script.poisonBall.id == message.id);
        if (poisonBall) {
            poisonBall.destroy();
        }
    })

    this.app.room.onMessage("Spawn:SpiderWeb", (message) => {
        let isOwner = this.app.room.sessionId == message.owner;
        let spawnPos = new pc.Vec3(message.xPos, message.yPos, message.zPos);

        let web = this.spiderWebTemplate.resource.instantiate();
        web.reparent(this.app.root);
        web.tags.add("SpiderWeb");
        web.setPosition(spawnPos);
        web.script.spiderWeb.isOwner = isOwner;
        web.script.spiderWeb.owner = message.owner;
        web.script.spiderWeb.id = message.id;
        web.script.spiderWeb.username = message.name;
        this.app.webCount += 1;
        this.app.networkManager.spiderWebUI.children[0].element.text = (5 - this.app.webCount) + "/5";
    })

    this.app.room.onMessage("Despawn:SpiderWeb", (message) => {
        let web = this.app.root.findByTag("SpiderWeb").find(w => w.script.spiderWeb.id == message.id);
        if (web) {
            if (this.app.caughtWeb && this.app.caughtWeb != null) {
                if (this.app.caughtWeb.id == web.script.spiderWeb.id) {
                    this.app.player.canMove = true;
                    this.app.player.controller.setCaught(false);
                    this.app.caughtWeb = null;
                }
            }

            web.destroy();
            this.app.webCount -= 1;
            this.app.networkManager.spiderWebUI.children[0].element.text = (5 - this.app.webCount) + "/5";
            if (this.app.isSpider)
                this.app.fire('WarningTextController:setWarning', "+1 Web", 5, new pc.Color(0, 1, 0, 1));
        }
    })

    this.app.room.onMessage("Despawn:WaypointWeb", (message) => {
        let web = this.app.root.findByTag("SpiderWeb").find(w => w.id == message.id);
        if (web)
            web.destroy();
    })

    this.app.room.onMessage("Spawn:Poop", (message) => {
        if (!this.poopSpawns) return;
        let spawnPos = this.poopSpawns.children[message.index].getPosition().clone();

        let poop = this.poopTemplate.resource.instantiate();
        poop.reparent(this.app.root);
        poop.setPosition(spawnPos);
        poop.script.poop.id = message.id;
    })

    this.app.room.onMessage("Caught:Poop", (message) => {
        let poop = this.app.root.findByTag("Poop").find(p => p.script.poop.id == message.id);
        if (poop)
            poop.destroy();

        let targetEntity;

        if (this.app.room.sessionId == message.caughtPlayer) targetEntity = this.app.player.entity;
        else targetEntity = this.app.network.remotePlayers[message.caughtPlayer].entity;

        let flyArmy = this.flyArmyTemplate.resource.instantiate();
        this.app.root.addChild(flyArmy);
        flyArmy.script.flyArmy.setTarget(targetEntity);
    })

    this.app.room.onMessage("Spawn:Fart", (message) => {
        let isOwner = this.app.room.sessionId == message.owner;
        let spawnPos = new pc.Vec3(message.xPos, message.yPos, message.zPos);

        let fart = this.fartTemplate.resource.instantiate();
        fart.reparent(this.app.root);
        fart.tags.add("Fart");
        fart.setPosition(spawnPos);
        fart.script.fart.isOwner = isOwner;
        fart.script.fart.owner = message.owner;
        fart.script.fart.id = message.id;

        fart.setLocalScale(pc.Vec3.ZERO);
        fart
            .tween(fart.getLocalScale())
            .to(pc.Vec3.ONE, .25, pc.QuinticOut)
            .start();
    })

    this.app.room.onMessage("Despawn:Fart", (message) => {
        let fart = this.app.root.findByTag("Fart").find(w => w.script.fart.id == message.id);
        if (fart)
            fart.destroy();
    })

    this.app.room.onMessage("Spawn:IceCube", (message) => {
        let isOwner = this.app.room.sessionId == message.owner;
        let spawnPos = new pc.Vec3(message.xPos, message.yPos, message.zPos);

        let ice = this.iceTemplate.resource.instantiate();
        ice.reparent(this.app.root);
        ice.tags.add("Ice");
        ice.setPosition(spawnPos);
        ice.script.ice.isOwner = isOwner;
        ice.script.ice.owner = message.owner;
        ice.script.ice.id = message.id;

        ice.setLocalScale(pc.Vec3.ZERO);
        ice
            .tween(ice.getLocalScale())
            .to(pc.Vec3.ONE, .25, pc.QuinticOut)
            .start();
    })

    this.app.room.onMessage("Despawn:IceCube", (message) => {
        let ice = this.app.root.findByTag("Ice").find(w => w.script.ice.id == message.id);
        if (ice)
            ice.destroy();
    })

    this.app.room.onMessage("Spawn:Cage", (message) => {
        let isOwner = this.app.room.sessionId == message.owner;
        let spawnPos = new pc.Vec3(message.xPos, message.yPos, message.zPos);
        let playerPos = new pc.Vec3(message.playerX, message.playerY, message.playerZ);
        let reverseRot = message.reverseRot;

        let cage = this.cageTemplate.resource.instantiate();
        cage.reparent(this.app.root);
        cage.setPosition(spawnPos);
        cage.lookAt(playerPos);

        let eulerAngles = cage.getEulerAngles();
        cage.setEulerAngles(eulerAngles.x, eulerAngles.y + (reverseRot ? -90 : 90), eulerAngles.z);

        cage.script.interactablePlayerCage.isOwner = isOwner;
        cage.script.interactablePlayerCage.owner = message.owner;
        cage.script.interactablePlayerCage.id = message.id;

        cage.canInteract = isOwner;

        if (!isOwner) {
            let dis = cage.getPosition().distance(this.app.player.entity.getPosition());
            if (dis < 8) {
                this.app.player.entity.rigidbody.teleport(cage.children[0].getPosition());
                this.app.player.interact.refresh();

                if (!this.app.network.remotePlayers[message.owner].entity) return;
                let name = this.app.network.remotePlayers[message.owner].entity.username;

                this.app.fire('WarningTextController:setWarning', "You got prisoned by " + name + "!", 5, new pc.Color(1, 0, 0, 1));
            }
        }
    })

    this.app.room.onMessage("Despawn:Cage", (message) => {
        let cage = this.app.root.findByTag("PlayerCage").find(w => w.script.interactablePlayerCage.id == message.id);
        if (cage)
            cage.destroy();
    })

    this.app.room.onMessage("InteractablePlayerCage:Interact", (message) => {
        let cage = this.app.root.findByTag("PlayerCage").find(w => w.script.interactablePlayerCage.id == message.id).script.interactablePlayerCage;
        if (cage) {
            cage.setDoor(message.toggle);
        }
    })

    this.app.room.onMessage("InteractablePlayerCage:Unlock", (message) => {
        let cage = this.app.root.findByTag("PlayerCage").find(w => w.script.interactablePlayerCage.id == message.id).script.interactablePlayerCage;
        if (cage) {
            cage.unlock();
        }
    })

    this.app.room.onMessage("Spawn:Flare", (message) => {
        let isOwner = this.app.room.sessionId == message.owner;
        let spawnPos = new pc.Vec3(message.xPos, message.yPos, message.zPos);
        let lookPos = new pc.Vec3(message.xLook, message.yLook, message.zLook);

        let flare = this.flareTemplate.resource.instantiate();
        this.app.root.addChild(flare);
        flare.setPosition(spawnPos);
        flare.script.flare.isOwner = isOwner;
        flare.lookAt(lookPos);
    })

    this.app.room.state.listen("totalCCU", (message) => {
        this.totalCCU.element.text = "Total " + message + " players online";
    })
}