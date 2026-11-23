var PowerupArea = pc.createScript('powerupArea');
PowerupArea.attributes.add('powerupType', {
    type: 'number',
    enum: [
        { 'Empty': -1 },
        { 'Spider': -2 },
        { 'Flashlight': 0 },
        { 'Speed Boots': 1 },
        { 'Scissors': 4 },
        { 'Bear Trap': 5 },
        { 'Potion': 7 },
        { 'Xray Machine': 9 },
        { 'Fart Bomb': 21 },
        { 'Ice Cube': 22 },
        { 'Cage Spawner': 23 },
        { 'Flare Gun': 24 },
    ],
    default: -1
});
PowerupArea.attributes.add('body', {
    type: 'entity',
});
PowerupArea.attributes.add("name", { type: "string" })
PowerupArea.attributes.add("adCount", { type: "number" })
// initialize code called once per entity
PowerupArea.prototype.initialize = function () {
    this.item = this.powerupType >= 0 ? this.app.itemDatabase.items[this.powerupType] : null;

    this.entity.findByName("Title").element.text = this.name;
    this.priceText = this.body.findByName("PriceText").element;

    if (this.item != null) {
        if (this.adCount > 0) this.priceText.text = this.adCount;
        else this.priceText.text = numRound(this.item.price);
    }

    this.updatePrice();

    this.body.collision.on('triggerenter', this.onTriggerEnter, this);
    this.entity.on("purchase", this.purchase, this);
    this.entity.on("watchAd", this.watchAd, this);

    if (this.powerupType == Item.SpiderPowerup) {
        if (Utils.getItem("spiderAds")) {
            this.spiderAds = Utils.getItem("spiderAds") * 1;
        }
        else {
            this.spiderAds = 3;
            Utils.setItem("spiderAds", this.spiderAds);
        }
    }

    eventSubscribe(this, "Connected", this.onListen);
    eventSubscribe(this, "ConnectionFailed", this.connectionFailed);
    eventSubscribe(this, "CoinChanged", this.updatePrice);

    this.watchedAds = 0;
};

PowerupArea.prototype.onListen = function () {
    if (!this.app.room) return;
    switch (this.powerupType) {
        case "Spider":
            this.networkSpiderPowerup = this.app.room.state.spiderPowerup;
            this.networkSpiderPowerup.listen("isEnabled", (newState, oldState) => {
                this.body.enabled = newState;
            });
            this.networkSpiderPowerup.listen("ownerPlayerId", (newState, oldState) => {
                //server is controlling the spider, enable ai spider entity
                if (newState == null) {
                    this.app.spiderController.spider.enabled = true;
                } else { //player is controlling the spider, disable ai spider entity
                    this.app.spiderController.spider.enabled = false;
                }
            });
            break;
    }
};

PowerupArea.prototype.connectionFailed = function () {
    switch (this.powerupType) {
        //offline ise spider olamaz
        case "Spider":
            this.body.enabled = false;
            break;
    }
};

PowerupArea.prototype.receivable = function () {
    if (this.powerupType == Item.SpiderPowerup || this.powerupType == Item.Empty) return true;
    var inv = this.app.player && this.app.player.inventory;
    return !inv || inv.canReceive(this.powerupType);
};

PowerupArea.prototype.onTriggerEnter = function (entity) {
    if (!entity.tags.has("Player")) return;
    // eşya verilemiyorsa (zaten var / envanter dolu) reklam ya da para istenmez
    if (!this.receivable()) return;

    if (this.powerupType == Item.SpiderPowerup) {
        if (this.spiderAds > 3) this.spiderAds = 3;
        if (this.spiderAds < 0) this.spiderAds = 0;

        if (this.spiderAds == 3) {
            this.spiderAd = true;
            this.app.fire("popupController:showPopup", "Become Spider", "Would you like to become spider by watching 3 ads?", true, this.entity, "watchAd", "closePopup", [], true);
        }
        else if (this.spiderAds == 2) {
            this.spiderAd = true;
            this.app.fire("popupController:showPopup", "Become Spider", "Would you like to become spider by watching 2 more ad?", true, this.entity, "watchAd", "closePopup", [], true);
        }
        else if (this.spiderAds == 1) {
            this.spiderAd = true;
            this.app.fire("popupController:showPopup", "Become Spider", "Would you like to become spider by watching 1 more ad?", true, this.entity, "watchAd", "closePopup", [], true);
        }
        else {
            this.app.fire("popupController:showPopup", "Become Spider", "Would you like to become spider?", true, this.entity, "purchase", "closePopup");
        }
    }
    else if (this.adCount > 0 && this.watchedAds < this.adCount) {
        this.spiderAd = false;
        this.app.fire("popupController:showPopup", "Buy Powerup", "Would you like to get " + this.item.name + " by watching " + (this.adCount - this.watchedAds) + " ads?", true, this.entity, "watchAd", "closePopup");
    }
    else {
        this.app.fire("popupController:showPopup", "Buy Powerup", "Would you like to get " + this.item.name + " for " + numRound(this.item.price) + " coins?", true, this.entity, "purchase", "closePopup");
    }
};

PowerupArea.prototype.watchAd = function () {
    if (!this.spiderAd && !this.receivable()) return;
    watchRewarded(() => {
        if (this.spiderAd) {
            this.spiderAds -= 1;
            Utils.setItem("spiderAds", this.spiderAds);

            if (this.spiderAds <= 0 && this.body.enabled == true) {
                this.purchase();
            }
            else if (this.spiderAds > 0 && this.body.enabled == true) {
                this.onTriggerEnter(this.app.player.entity);
            }
        }
        else {
            this.watchedAds += 1;
            if (this.watchedAds >= this.adCount) {
                this.purchase();
            }

            this.priceText.text = this.adCount - this.watchedAds;
        }
    })
}

PowerupArea.prototype.purchase = function () {
    if (this.item != null && this.adCount <= 0 && this.watchedAds <= 0) {
        if (!this.receivable()) return;
        if (this.app.coin < this.item.price) {
            this.app.fire('WarningTextController:setWarning', "You don't have enough coins!", 5, new pc.Color(1, 0, 0, 1));
            return;
        }

        this.app.fire("AddCoin", -this.item.price);
        this.app.fire('WarningTextController:setWarning', "You bought " + this.name + "!", 5, new pc.Color(0, 1, 0, 1));
    }

    if (this.powerupType == Item.SpiderPowerup) {
        this.spiderAds = 3;
        Utils.setItem("spiderAds", this.spiderAds);

        this.app.fire('WarningTextController:setWarning', "You became SPIDER!", 5, new pc.Color(0, 1, 0, 1));

        //sunucuya paket gönder, offline iken spider olamaz
        if (this.app.room)
            this.app.room.send("PowerupArea:ReserveLimitedPowerup", { powerupType: this.powerupType });
    }
    else if (this.powerupType != Item.Empty) {
        if (this.adCount > 0)
            this.watchedAds = 0;

        this.app.player.inventory.addItem(this.powerupType);
    }
};

PowerupArea.prototype.updatePrice = function () {
    if (!this.item) return;

    this.entity.findByName("Title").element.color = this.app.coin >= this.item.price ? pc.Color.GREEN : pc.Color.RED;
}