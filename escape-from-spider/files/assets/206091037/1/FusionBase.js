var FusionBase = pc.createScript('fusionBase');
FusionBase.attributes.add('radioTowerHalos', { type: 'entity' });
FusionBase.prototype.initialize = function () {
    this.blueCell = this.entity.findByName("Blue");
    this.greenCell = this.entity.findByName("Green");
    this.yellowCell = this.entity.findByName("Yellow");

    this.locked = true;

    this.placings = {
        blue: false,
        green: false,
        yellow: false
    }

    this.indicator = this.entity.findByName("Indicator");

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle), this);

    this.app.fusionBase = this;
    this.entity.canInteract = true;

    this.app.on("UnlockRadioTower", this.unlock, this);

    this.entity.on("destroy", () => {
        this.app.off("UnlockRadioTower", this.unlock, this);
    }, this);
};

FusionBase.prototype.playSound = function (soundName, randomPitch = false) {
    if (this.entity.sound == null) return;
    this.slot = this.entity.sound.slot(soundName);
    if (this.slot == null) return;
    if (randomPitch) {
        this.slot.pitch = pc.math.random(0.8, 1.2);
    }
    this.slot.play();
};

FusionBase.prototype.unlock = function () {
    this.locked = false;
    this.radioTowerHalos.enabled = true;
    this.app.fire("RefreshTutorial");
}

FusionBase.prototype.interact = function (playerInteract) {
    if (this.placings.blue == true && this.placings.green == true && this.placings.yellow == true) {
        this.app.fire('WarningTextController:setWarning', "All fusions are placed, leave the house and escape now!", 3, new pc.Color(0, 1, 1, 1));
        return;
    }

    if (this.locked) {
        this.app.fire('WarningTextController:setWarning', "You have to power the radio tower!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    if (!playerInteract.rightItem || (Item.Fusion != playerInteract.rightItem.id && Item.GreenFusion != playerInteract.rightItem.id && Item.YellowFusion != playerInteract.rightItem.id)) {
        this.app.fire('WarningTextController:setWarning', "You need a fusion cell to place!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    if (Item.Fusion == playerInteract.rightItem.id && this.placings.blue == true) {
        this.app.fire('WarningTextController:setWarning', "The blue fusion is already placed!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }
    else if (Item.GreenFusion == playerInteract.rightItem.id && this.placings.green == true) {
        this.app.fire('WarningTextController:setWarning', "The green fusion is already placed!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }
    else if (Item.YellowFusion == playerInteract.rightItem.id && this.placings.yellow == true) {
        this.app.fire('WarningTextController:setWarning', "The yellow fusion is already placed!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    if (this.app.room) {
        this.app.room.send("FusionBase:Place", { id: playerInteract.rightItem.id });
    }
    else {
        this.place(playerInteract.rightItem.id);
    }

    playerInteract.setRightHand(null);
};

FusionBase.prototype.place = function (id) {
    switch (id) {
        case Item.Fusion: this.placings.blue = true; break;
        case Item.GreenFusion: this.placings.green = true; break;
        case Item.YellowFusion: this.placings.yellow = true; break;
    }

    this.checkFusions();
}

FusionBase.prototype.setPlacings = function (blue, green, yellow) {
    this.placings.blue = blue;
    this.placings.green = green;
    this.placings.yellow = yellow;

    this.checkFusions();

    this.playSound("place");

    this.app.fire("RefreshTutorial");
}

FusionBase.prototype.checkFusions = function () {
    this.blueCell.enabled = this.placings.blue;
    this.greenCell.enabled = this.placings.green;
    this.yellowCell.enabled = this.placings.yellow;

    if (this.placings.blue == true && this.placings.green == true && this.placings.yellow == true) {
        this.app.musicPlayer.stop();
        this.app.musicPlayer.entity.sound.play("rushMusic");
        this.app.fire('WarningTextController:setWarning', "All fusions are placed, leave the house and escape now!", 5, new pc.Color(0, 1, 1, 1));
    }
}