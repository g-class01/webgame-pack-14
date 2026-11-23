var CoinManager = pc.createScript('coinManager');
CoinManager.attributes.add("coinText", { type: "entity" })
CoinManager.attributes.add("coinTarget", { type: "entity" })
CoinManager.attributes.add("coinEntity", { type: "entity" })
CoinManager.attributes.add("coinTemplate", { type: "asset", assetType: "template" })

CoinManager.prototype.initialize = function () {
    this.app.coinManager = this;
    if (this.app.storage == null) {
        this.app.storage = new Storage("Coin", {
            coin: 0
        })
    }
    this.coinPitch = 0.8;
    this.setCoins(this.app.storage.coin);

    eventSubscribe(this, "AddCoin", this.addCoin);
    eventSubscribe(this, "SetCoins", this.setCoins);
};

CoinManager.prototype.playSound = function (soundName, randomPitch = false) {
    if (this.entity.sound == null) return;
    this.slot = this.entity.sound.slot(soundName);
    if (this.slot == null) return;
    if (randomPitch) {
        this.coinPitch += 0.04;
        this.slot.pitch = this.coinPitch;
        if (this.coinPitch >= 1.2)
            this.coinPitch = 0.8
    }
    this.slot.play();
};

CoinManager.prototype.addCoin = function (value, anim = true) {
    if (isNaN(value))
        value = 0;
    anim &&= value > 0;

    if (!anim)
        this.setCoins(this.app.coin + value);
    else {
        let xBounds = {
            min: 1250,
            max: 250,
        }

        let yBounds = {
            min: -250,
            max: -650
        }
        this.playSound("coinFound");
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {

                let xPos = randomNumber(xBounds.min, xBounds.max);
                let yPos = randomNumber(yBounds.min, yBounds.max);

                let pos = new pc.Vec3(xPos, -1000, 0);
                let firstPos = new pc.Vec3(xPos, yPos, 0);
                let targetPos = this.coinTarget.getLocalPosition().clone();

                let coinClone = this.coinTemplate.resource.instantiate();
                coinClone.reparent(this.app.root.findByName("GameUI"));

                coinClone.setLocalScale(pc.Vec3.ONE);
                coinClone.setLocalPosition(pos);

                coinClone.findByName("Text").element.text = "+" + numRound(parseFloat((value / 10).toFixed(1))).toString();

                coinClone
                    .tween(coinClone.getLocalPosition())
                    .to(firstPos, .5, pc.QuarticOut)
                    .onComplete(() => {
                        coinClone
                            .tween(coinClone.getLocalScale())
                            .to(new pc.Vec3(0, 0, 0), 1.5, pc.QuarticIn)
                            .start();

                        coinClone
                            .tween(coinClone.getLocalPosition())
                            .to(targetPos, 1.5, pc.SineIn)
                            .onComplete(() => {
                                this.playSound("coin", true);
                                coinClone.destroy();

                                this.setCoins(this.app.coin + (value / 10));

                                this.coinEntity
                                    .tween(this.coinEntity.getLocalScale())
                                    .to(new pc.Vec3(.3, .3, .3), .05, pc.SineInOut)
                                    .yoyo(true)
                                    .repeat(2)
                                    .start();
                            })
                            .start();
                    })
                    .start();
            }, i * 250);
        }
    }
}

CoinManager.prototype.setCoins = function (value) {
    if (isNaN(value))
        value = 0;
    this.app.coin = pc.math.clamp(value, 0, Infinity);
    this.coinText.element.text = numRound(value) + (value >= 1000 ? "" : "x");
    this.app.storage.coin = value;
    this.app.fire("CoinChanged", value);
}

CoinManager.prototype.update = function (dt) {
    //if (this.app.keyboard.wasPressed(pc.KEY_J)) this.addCoin(100);
    //if (this.app.keyboard.wasPressed(pc.KEY_K)) this.addCoin(1000);
    //if (this.app.keyboard.wasPressed(pc.KEY_L)) this.addCoin(-500);
}