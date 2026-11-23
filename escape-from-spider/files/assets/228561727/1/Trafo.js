var Trafo = pc.createScript('trafo');
Trafo.attributes.add("turnstill", { type: "entity" });
Trafo.attributes.add("turnstillCollider", { type: "entity" });
Trafo.attributes.add("turnstillTrue", { type: "entity" });
Trafo.attributes.add("lid", { type: "entity" });

Trafo.prototype.initialize = function () {
    this.blueCable = this.entity.findByName("Blue");
    this.greenCable = this.entity.findByName("Green");
    this.redCable = this.entity.findByName("Red");

    this.placings = {
        blue: false,
        green: false,
        red: false
    }

    this.indicator = this.entity.findByName("Indicator");

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle), this);

    this.app.trafo = this;
    this.entity.canInteract = true;
};

Trafo.prototype.playSound = function (soundName, randomPitch = false) {
    if (this.entity.sound == null) return;
    this.slot = this.entity.sound.slot(soundName);
    if (this.slot == null) return;
    if (randomPitch) {
        this.slot.pitch = pc.math.random(0.8, 1.2);
    }
    this.slot.play();
};

Trafo.prototype.interact = function (playerInteract) {
    if (this.placings.blue == true && this.placings.green == true && this.placings.red == true) {
        this.app.fire('WarningTextController:setWarning', "All cables are placed!", 3, new pc.Color(0, 1, 1, 1));
        return;
    }

    if (!playerInteract.rightItem || (Item.TrafoCableBlue != playerInteract.rightItem.id && Item.TrafoCableGreen != playerInteract.rightItem.id && Item.TrafoCableRed != playerInteract.rightItem.id)) {
        this.app.fire('WarningTextController:setWarning', "You need a cable to place!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    if (Item.TrafoCableBlue == playerInteract.rightItem.id && this.placings.blue == true) {
        this.app.fire('WarningTextController:setWarning', "The blue cable is already placed!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }
    else if (Item.TrafoCableGreen == playerInteract.rightItem.id && this.placings.green == true) {
        this.app.fire('WarningTextController:setWarning', "The green cable is already placed!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }
    else if (Item.TrafoCableRed == playerInteract.rightItem.id && this.placings.red == true) {
        this.app.fire('WarningTextController:setWarning', "The red cable is already placed!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    if (this.app.room) {
        this.app.room.send("Trafo:Place", { id: playerInteract.rightItem.id });
    }
    else {
        this.place(playerInteract.rightItem.id);
    }

    playerInteract.setRightHand(null);
};

Trafo.prototype.place = function (id) {
    switch (id) {
        case Item.TrafoCableBlue: this.placings.blue = true; break;
        case Item.TrafoCableGreen: this.placings.green = true; break;
        case Item.TrafoCableRed: this.placings.red = true; break;
    }

    this.checkCables();
}

Trafo.prototype.setPlacings = function (blue, green, red) {
    this.placings.blue = blue;
    this.placings.green = green;
    this.placings.red = red;

    this.checkCables();

    this.playSound("place");

    this.app.fire("RefreshTutorial");
}

Trafo.prototype.checkCables = function () {
    this.blueCable.enabled = this.placings.blue;
    this.greenCable.enabled = this.placings.green;
    this.redCable.enabled = this.placings.red;

    if (this.placings.blue == true && this.placings.green == true && this.placings.red == true) {
        this.unlocked = true;
        this.playSound("electric");
        //this.app.musicPlayer.stop();
        //this.app.musicPlayer.entity.sound.play("rushMusic");
        this.app.fire('WarningTextController:setWarning', "All cables are placed!", 5, new pc.Color(0, 1, 1, 1));

        this.turnstillCollider.enabled = false;
        this.turnstillTrue.enabled = true;

        for (let i = 0; i < this.turnstill.children.length; i++) {
            this.turnstill.children[i].enabled = true;
        }

        this.lid
            .tween(this.lid.getLocalEulerAngles())
            .rotate(new pc.Vec3(0, 0, 0), 1, pc.ElasticOut)
            .start();

        this.entity.canInteract = false;
        this.app.player.interact.refresh();
        toggleIndicator(this, false);

        this.app.fire("RefreshTutorial");
    }
}

Trafo.prototype.update = function (dt) {
    //if (pc.app.keyboard.wasPressed("b")) this.setPlacings(true, true, true);

    if (!this.unlocked) return;
    this.turnstillCollider.enabled = false;
    this.turnstill.rotateLocal(0, 0, 50 * dt);
}