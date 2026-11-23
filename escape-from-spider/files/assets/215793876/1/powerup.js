var Powerup = pc.createScript('powerup');
Powerup.attributes.add('powerupType', {
    type: 'number',
    enum: [
        { 'Empty': -1 },
        { 'Spider': -2 },
        { 'Catch': -4 },
        { 'Agar': -5 },
        { 'GoldChest': 0 },
        { 'Speed Boots': 1 },
        { 'Scissors': 4 },
        { 'Bear Trap': 5 },
        { 'Potion': 7 },
        { 'Xray Machine': 9 },
        { 'Fart Bomb': 21 },
        { 'Ice Cube': 22 },
        { 'Cage Spawner': 23 },
        { 'Flare Gun': 24 },
        { 'Become Human': -3 },
    ],
    default: -1
});
Powerup.attributes.add("adCount", { type: "number" })

Powerup.prototype.initialize = function () {
    this.circle = this.entity.findByName("Loading Radial");
    this.circle.script.progressRadial.powerup = this;
    if (this.adCount > 0) {
        this.adElement = this.entity.findByName("PriceText").element;
        this.adElement.text = this.adCount;
    }
    this.entity.collision.on("triggerenter", this.triggerenter, this);
    this.entity.collision.on("triggerleave", this.triggerleave, this);
    eventSubscribe(this, "Connected", this.onListen);
    eventSubscribe(this, "ConnectionFailed", this.onConnectionFailed);
};

Powerup.prototype.onListen = function () {
    if (!this.app.room) return;

    if (this.powerupType == Item.SpiderPowerup) {
        this.becomeSpiderUI = this.entity.findByName("BecomeSpiderUI");
        this.claimedUI = this.entity.findByName("ClaimedUI");
        this.spiderOwnerText = this.claimedUI.findByName("SpiderOwnerText").element;
        this.networkSpiderPowerup = this.app.room.state.spiderPowerup;
        this.networkSpiderPowerup.listen("isEnabled", (newState, oldState) => {
            this.becomeSpiderUI.enabled = newState;
            this.claimedUI.enabled = !newState;
            this.entity.collision.enabled = newState;
        }, false);
        this.networkSpiderPowerup.listen("ownerPlayerUsername", (newState, oldState) => {
            this.spiderOwnerText.text = newState + " is the spider";
        }, false);
        this.networkSpiderPowerup.listen("ownerPlayerId", (newState, oldState) => {
            //server is controlling the spider, enable ai spider entity
            if (newState == null) {
                this.app.spiderController.spider.enabled = true;
                this.app.spiderPlayer = null;
            } else { //player is controlling the spider, disable ai spider entity
                this.app.spiderController.spider.enabled = false;
            }
        }, false);
    }
};

//Singleplayer da spider olmayi kapattik
Powerup.prototype.onConnectionFailed = function () {
    if (this.powerupType == Item.SpiderPowerup || this.powerupType == Item.Catch || this.powerupType == Item.Agar) {
        this.entity.enabled = false;
    }
};

Powerup.prototype.triggerenter = function (entity) {
    if (entity.tags.has("Player")) {
        if (this.powerupType > 0) {
            if (!this.app.player.inventory.canReceive(this.powerupType)) return;
        }

        this.circle.script.progressRadial.isUse = true;
        this.soundStart()
    }
};

Powerup.prototype.triggerleave = function (entity) {
    if (entity.tags.has("Player")) {
        this.circle.script.progressRadial.isUse = false;
        this.soundStop();
    }
};

Powerup.prototype.watchAds = function () {
    if (this.powerupType == Item.SpiderPowerup && window.location.href.indexOf('launch.playcanvas.com') > -1) {
        this.success();
        this.circle.script.progressRadial.isUse = false;
        return;
    }

    if (this.powerupType == Item.SpiderPowerup) {
        if (Utils.getItem("chapterOneFinished") != "true") {
            this.app.fire('WarningTextController:setWarning', "Complete Chapter 1 to unlock!", 7, new pc.Color(1, 0, 0, 1));
            this.circle.script.progressRadial.isUse = false;
            return;
        }
    }
    //become human
    if (this.powerupType == Item.BecomeHuman) {
        this.success();
        this.circle.script.progressRadial.isUse = false;
        return;
    }

    if (this.powerupType == Item.Catch || this.powerupType == Item.Agar) {
        this.success();
        this.circle.script.progressRadial.isUse = false;
        return;
    }

    // reklamdan önce tekrar bak (bu arada envanter dolmuş olabilir)
    if (this.powerupType > 0 && !this.app.player.inventory.canReceive(this.powerupType)) {
        this.circle.script.progressRadial.isUse = false;
        return;
    }

    //watch ads
    let adSize;
    if (this.adCount == 1) {
        adSize = "small";
    } else if (this.adCount == 2) {
        adSize = "medium";
    } else if (this.adCount == 3) {
        adSize = "large";
    } else {
        adSize = "small";
    }

    watchRewarded(() => this.success(), adSize);
    this.circle.script.progressRadial.isUse = false;
}

Powerup.prototype.success = async function () {
    if (this.powerupType == Item.SpiderPowerup) {
        if (this.app.networkManager.currentSceneName == "Chapter3") {
            this.app.fire('WarningTextController:setWarning', "You are the WENDIGO!", 5, new pc.Color(0, 1, 0, 1));
            setTimeout(() => {
                if (!this.app.isMobile)
                    this.app.fire('WarningTextController:setWarning', "Hit left mouse to attack!", 10, new pc.Color(0, 1, 0, 1));
            }, 2000);
        }
        else if (this.app.networkManager.currentSceneName == "Chapter2") {
            this.app.fire('WarningTextController:setWarning', "You are the CENTIPEDE!", 5, new pc.Color(0, 1, 0, 1));
            setTimeout(() => {
                if (!this.app.isMobile)
                    this.app.fire('WarningTextController:setWarning', "Hit left mouse to attack!", 10, new pc.Color(0, 1, 0, 1));
            }, 2000);
            setTimeout(() => {
                if (!this.app.isMobile)
                    this.app.fire('WarningTextController:setWarning', "Hit right mouse to drop poison!", 10, new pc.Color(0, 1, 0, 1));
            }, 4000);
        } else {
            this.app.fire('WarningTextController:setWarning', "You are the SPIDER!", 5, new pc.Color(0, 1, 0, 1));
            setTimeout(() => {
                if (!this.app.isMobile)
                    this.app.fire('WarningTextController:setWarning', "Hit left mouse to attack!", 10, new pc.Color(0, 1, 0, 1));
            }, 2000);
            setTimeout(() => {
                if (!this.app.isMobile)
                    this.app.fire('WarningTextController:setWarning', "Hit right mouse to drop webs!", 10, new pc.Color(0, 1, 0, 1));
            }, 4000);
        }

        if (this.app.room)
            this.app.room.send("PowerupArea:ReserveLimitedPowerup", { powerupType: this.powerupType });
    }
    else if (this.powerupType == Item.BecomeHuman) { //become human
        if (this.app.room)
            this.app.room.send("PowerupArea:BecomeHuman");
    }
    else if (this.powerupType == Item.Agar) {
        if (this.app.room)
            await this.app.room.leave();
        this.app.musicPlayer.stop();
        this.app.ambienceManager.stop();
        this.app.scenes.changeScene("Agar");
        this.app.player.canMove = false;
    }
    else if (this.powerupType == Item.Catch) {
        if (this.app.room)
            await this.app.room.leave();
        this.app.musicPlayer.stop();
        this.app.ambienceManager.stop();
        this.app.scenes.changeScene("Catch");
        this.app.player.canMove = false;
    }
    else if (this.powerupType == Item.GoldChest) {
        this.app.coinManager.addCoin(100);
    }
    else if (this.powerupType != Item.Empty) {
        this.app.player.inventory.addItem(this.powerupType);
    }
    this.entity.sound.play("reward");
}

Powerup.prototype.soundStart = function () {
    if (!this.isSound) {
        this.isSound = true;
        if (this.entity)
            this.entity.sound.play("load");
    }
}

Powerup.prototype.soundStop = function () {
    if (this.isSound) {
        this.isSound = false;
        if (this.entity)
            this.entity.sound.stop("load");
    }
}