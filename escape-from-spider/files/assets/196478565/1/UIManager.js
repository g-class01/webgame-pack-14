var UIManager = pc.createScript('uiManager');
UIManager.attributes.add("inventoryParent", { type: "entity" });
UIManager.attributes.add("rightHandSlot", { type: "entity" });
UIManager.attributes.add("powerupUI", { type: "entity" });
UIManager.attributes.add("timedRespawn", { type: "entity" });
UIManager.attributes.add("useButton", { type: "entity" });
UIManager.attributes.add("powerupButton", { type: "entity" });
UIManager.attributes.add("timerText", { type: "entity" });
UIManager.attributes.add("waitingText", { type: "entity" });
UIManager.attributes.add("gameEnd", { type: "entity" });
UIManager.attributes.add("gameLose", { type: "entity" });
UIManager.attributes.add("gameEndSpider", { type: "entity" });
UIManager.attributes.add("emotePanel", { type: "entity" });
UIManager.attributes.add("catchLose", { type: "entity" });
UIManager.attributes.add("catchWin", { type: "entity" });
UIManager.attributes.add("agarEnd", { type: "entity" });

UIManager.prototype.initialize = function () {
    this.app.endUI = false;

    this.respawnTimer = 60;
    this.respawnWaiting = false;
};

UIManager.prototype.update = function (dt) {
    if (this.respawnWaiting == true) {
        this.respawnTimer -= dt;

        this.timedRespawn.findByName("Text").element.text = "Respawn " + Math.round(this.respawnTimer);
        this.timedRespawn.button.active = false;

        if (this.respawnTimer <= 0) {
            this.respawnWaiting = false;
            this.respawnTimer = 60;

            this.timedRespawn.findByName("Text").element.text = "Respawn";
            this.timedRespawn.button.active = true;
        }
    }
};

UIManager.prototype.setPowerup = async function (powerup) {
    if (!powerup) {
        this.powerupUI.enabled = false;
        this.powerupButton.enabled = false;
        return;
    }

    let textElement = this.powerupUI.findByName("Text").element;
    let imageElement = this.powerupUI.findByName("Image").element;

    let text;

    switch (powerup.type) {
        case ItemType.Timed:
            text = powerup.amount + " sec";
            break;

        case ItemType.Consumable:
            text = powerup.amount + "/" + powerup.startAmount;
            break;
    }

    textElement.text = text;

    let texture = await getAsset(powerup.texture);
    imageElement.texture = await texture.resource;

    this.powerupButton.children[0].element.texture = await texture.resource;
    this.powerupButton.enabled = powerup.type == ItemType.Consumable;

    this.powerupUI.enabled = true;
};

UIManager.prototype.setRightHand = function (item) {
    if (!item) {
        this.rightHandSlot.enabled = false;
        return;
    }

    this.rightHandSlot.enabled = true;
    let tex = this.app.assets.get(item.texture);
    if (tex.loaded) {
        this.rightHandSlot.findByName("Image").element.texture = tex.resource;
    }
    else {
        this.app.assets.load(tex);
        tex.ready((asset) => {
            this.rightHandSlot.findByName("Image").element.texture = asset.resource;
        });
    }
}

UIManager.prototype.respawnUI = function () {
    this.respawnWaiting = true;
    this.inventoryParent.enabled = false;
};

UIManager.prototype.setSpectateControls = function (spectateControls) {
    this.app.root.findByName("SpectateControls").enabled = spectateControls;
}

UIManager.prototype.respawned = function () {
    this.respawnWaiting = false;
    this.respawnTimer = 60;
    this.inventoryParent.enabled = true;
}


UIManager.prototype.setTimer = function (seconds) {
    if (!this.timerText) return;
    this.seconds = seconds;
    this.timerText.element.text = formatTime(seconds);
}

UIManager.prototype.openEndUISpider = function () {
    this.app.endUI = true;
    this.app.fire("lockCamera", true);

    let container = this.gameEndSpider;
    let bg = container.findByName("Background");
    let panel = container.findByName("Panel");

    let title = panel.findByName("Title");
    let stats = panel.findByName("Stats");
    let click = panel.findByName("ClickText");
    let trappedCount = stats.findByName("TrappedCount");
    let caughtCount = stats.findByName("CaughtCount");
    let coinCount = stats.findByName("CoinCount");

    let spiderText = "Spider";

    if (getCurrentChapter() == Chapters.Two)
        spiderText = "Centipede"
    else if (getCurrentChapter() == Chapters.Three)
        spiderText = "Wendigo"

    if (this.app.networkManager._playerCount > 9) {
        title.element.text = "Well done Mr. " + spiderText  + ", you are the best creature ever!";
    } else if (this.app.networkManager._playerCount > 6) {
        title.element.text = "Incredible! The " + spiderText.toLowerCase() + " is really good at this!";
    } else if (this.app.networkManager._playerCount > 3) {
        title.element.text = "Nice! The " + spiderText.toLowerCase() + " is getting good at this!";
    } else if (this.app.networkManager._playerCount > 0) {
        title.element.text = "Not bad! The " + spiderText.toLowerCase() + " got a few tasty snacks.";
    } else {
        title.element.text = "You are the worst " + spiderText.toLowerCase() + " ever..";
    }

    container.enabled = true;

    title.setLocalScale(pc.Vec3.ZERO);
    click.setLocalScale(pc.Vec3.ZERO);

    trappedCount.setLocalScale(pc.Vec3.ZERO);
    caughtCount.setLocalScale(pc.Vec3.ZERO);
    coinCount.parent.setLocalScale(pc.Vec3.ZERO);

    trappedCount.value = this.app.player.stats.trapped;
    caughtCount.value = this.app.player.stats.caught;
    coinCount.value = Math.max(100, (100 * this.app.networkManager._playerCount));

    this.tweenProps = { val: 0 };
    this.tweenPropsOther = { val: 0 };
    let shortAnimDur = .5;
    let animDur = 2;

    title
        .tween(title.getLocalScale())
        .to(pc.Vec3.ONE, shortAnimDur, pc.QuinticOut)
        .onComplete(() => {
            trappedCount
                .tween(trappedCount.getLocalScale())
                .to(pc.Vec3.ONE, shortAnimDur, pc.QuinticOut)
                .start();

            this.app.tween(this.tweenProps).to({ val: trappedCount.value }, animDur, pc.SineOut).onUpdate((dt) => trappedCount.element.text = "Trapped: " + Math.round(this.tweenProps.val)).onComplete(() => {
                caughtCount
                    .tween(caughtCount.getLocalScale())
                    .to(pc.Vec3.ONE, shortAnimDur, pc.QuinticOut)
                    .start();

                this.tweenProps.val = 0;
                this.app.tween(this.tweenProps).to({ val: caughtCount.value }, animDur, pc.SineOut).onUpdate((dt) => caughtCount.element.text = "Caught: " + Math.round(this.tweenProps.val)).onComplete(() => {
                    this.app.fire("AddCoin", coinCount.value);

                    coinCount.parent
                        .tween(coinCount.parent.getLocalScale())
                        .to(pc.Vec3.ONE, shortAnimDur, pc.QuinticOut)
                        .start();

                    this.tweenProps.val = 0;
                    this.app.tween(this.tweenProps).to({ val: coinCount.value }, animDur, pc.SineOut).onUpdate((dt) => coinCount.element.text = "Coins +" + Math.round(this.tweenProps.val)).onComplete(() => {
                        click
                            .tween(click.getLocalScale())
                            .to(pc.Vec3.ONE, shortAnimDur, pc.QuinticOut)
                            .start();
                    }).start();
                }).start();
            }).start();
        })
        .start();
}

UIManager.prototype.openEndUI = function (isLose = false) {
    this.app.endUI = true;
    this.app.fire("lockCamera", true);

    let container = isLose ? this.gameLose : this.gameEnd;
    let bg = container.findByName("Background");
    let panel = container.findByName("Panel");

    let title = panel.findByName("Title");
    let stats = panel.findByName("Stats");
    let click = panel.findByName("ClickText");

    let dieCount = stats.findByName("DieCount");
    let caughtCount = stats.findByName("CaughtCount");
    let timeCount = stats.findByName("TimeCount");
    let coinCount = stats.findByName("CoinCount");

    let spiderText = "Spider";

    if (getCurrentChapter() == Chapters.Two)
        spiderText = "Centipede"
    else if (getCurrentChapter() == Chapters.Three)
        spiderText = "Wendigo"

    title.element.text = "You escaped from the " + spiderText.toUpperCase() + "!";

    container.enabled = true;

    title.setLocalScale(pc.Vec3.ZERO);
    click.setLocalScale(pc.Vec3.ZERO);

    dieCount.setLocalScale(pc.Vec3.ZERO);
    caughtCount.setLocalScale(pc.Vec3.ZERO);
    if (!isLose) {
        timeCount.setLocalScale(pc.Vec3.ZERO);
    }
    coinCount.parent.setLocalScale(pc.Vec3.ZERO);

    function convertSeconds(seconds) {
        return {
            minutes: Math.floor(seconds / 60),
            seconds: seconds % 60
        };
    }

    dieCount.value = this.app.player.stats.die;
    caughtCount.value = this.app.player.stats.caught;
    coinCount.value = isLose ? 50 : Math.round(this.seconds / 4) + 50;
    if (!isLose) {
        timeCount.value = convertSeconds(this.seconds);
    }

    this.tweenProps = { val: 0 };
    this.tweenPropsOther = { val: 0 };
    let shortAnimDur = .5;
    let animDur = 2;

    title
        .tween(title.getLocalScale())
        .to(pc.Vec3.ONE, shortAnimDur, pc.QuinticOut)
        .onComplete(() => {
            dieCount
                .tween(dieCount.getLocalScale())
                .to(pc.Vec3.ONE, shortAnimDur, pc.QuinticOut)
                .start();

            this.app.tween(this.tweenProps).to({ val: dieCount.value }, animDur, pc.SineOut).onUpdate((dt) => dieCount.element.text = "Died: " + Math.round(this.tweenProps.val)).onComplete(() => {
                caughtCount
                    .tween(caughtCount.getLocalScale())
                    .to(pc.Vec3.ONE, shortAnimDur, pc.QuinticOut)
                    .start();

                this.tweenProps.val = 0;
                this.app.tween(this.tweenProps).to({ val: caughtCount.value }, animDur, pc.SineOut).onUpdate((dt) => caughtCount.element.text = "Caught: " + Math.round(this.tweenProps.val)).onComplete(() => {
                    if (!isLose) {
                        timeCount
                            .tween(timeCount.getLocalScale())
                            .to(pc.Vec3.ONE, shortAnimDur, pc.QuinticOut)
                            .start();

                        function formatTime(val) {
                            let minutes = String(val.minutes).padStart(2, '0');
                            let seconds = String(val.seconds).padStart(2, '0');
                            return `${minutes}:${seconds}`;
                        }

                        this.tweenProps.val = 0;
                        this.tweenPropsOther.val = 0;

                        this.app.tween(this.tweenPropsOther).to({ val: timeCount.value.seconds }, animDur, pc.SineOut).start();
                        this.app.tween(this.tweenProps).to({ val: timeCount.value.minutes }, animDur, pc.SineOut).onUpdate((dt) => timeCount.element.text = "Escape Time: " + formatTime({ minutes: Math.round(this.tweenProps.val), seconds: Math.round(this.tweenPropsOther.val) })).onComplete(() => {
                            this.app.fire("AddCoin", coinCount.value);

                            coinCount.parent
                                .tween(coinCount.parent.getLocalScale())
                                .to(pc.Vec3.ONE, shortAnimDur, pc.QuinticOut)
                                .start();

                            this.tweenProps.val = 0;
                            this.app.tween(this.tweenProps).to({ val: coinCount.value }, animDur, pc.SineOut).onUpdate((dt) => coinCount.element.text = "Coins +" + Math.round(this.tweenProps.val)).onComplete(() => {
                                click
                                    .tween(click.getLocalScale())
                                    .to(pc.Vec3.ONE, shortAnimDur, pc.QuinticOut)
                                    .start();
                            }).start();
                        }).start();
                    } else {
                        this.app.fire("AddCoin", coinCount.value);

                        coinCount.parent
                            .tween(coinCount.parent.getLocalScale())
                            .to(pc.Vec3.ONE, shortAnimDur, pc.QuinticOut)
                            .start();

                        this.tweenProps.val = 0;
                        this.app.tween(this.tweenProps).to({ val: coinCount.value }, animDur, pc.SineOut).onUpdate((dt) => coinCount.element.text = "Coins +" + Math.round(this.tweenProps.val)).onComplete(() => {
                            click
                                .tween(click.getLocalScale())
                                .to(pc.Vec3.ONE, shortAnimDur, pc.QuinticOut)
                                .start();
                        }).start();
                    }
                }).start();
            }).start();
        })
        .start();
}
