var InteractableCage = pc.createScript('interactableCage');
InteractableCage.attributes.add("id", { type: "number" })

InteractableCage.prototype.initialize = function () {
    this.player = null;

    this.indicator = this.entity.findByName("Indicator");
    this.collider = this.entity.findByName("Collider");
    this.door = this.entity.findByName("CageDoor");

    this.escapeSlider = this.indicator.findByName("EscapeSlider");
    this.escapeArrow = this.escapeSlider.findByName("Arrow");
    this.rescueSlider = this.indicator.findByName("RescueSlider");
    this.rescueArrow = this.rescueSlider.findByName("Arrow");

    this.sliderValue = -.9;

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle && this.player), this);

    this.entity.canInteract = true;

    this.points = 0;

    this.setDoor(true);
    this.canAttack = true;
};

InteractableCage.prototype.playSound = function (soundName, randomPitch = false) {
    if (this.entity.sound == null) return;
    this.slot = this.entity.sound.slot(soundName);
    if (this.slot == null) return;
    if (randomPitch) {
        this.slot.pitch = pc.math.random(0.8, 1.2);
    }
    this.slot.play();
};

InteractableCage.prototype.register = function () {
    if (!this.app.room) return;
    this.app.room.send("InteractableCage:Register", {
        id: this.id
    })
};

InteractableCage.prototype.playerHitAnimation = function () {
    if (this.canAttack) {
        this.canAttack = false;
        this.app.player.controller._animComponent.setBoolean("hit", true);

        if (this.app.isFPS)
            this.app.player.fpsAnimator.right.fire("Motion", "hit");

        setTimeout(() => {
            this.app.player.controller._animComponent.setBoolean("hit", false);
        }, 500);
        setTimeout(() => {
            this.canAttack = true;
        }, 1500);
    }
};

InteractableCage.prototype.interact = function () {
    if (!this.player) return;

    let add = 0;
    if (this.app.room)
        add = this.app.location == LOCATIONS.PRISON || this.player == this.app.room.sessionId ? 1 : 10;
    else
        add = 1;

    this.playerHitAnimation();

    this.indicator.setLocalScale(115, 115, 115);
    this.indicator
        .tween(this.indicator.getLocalScale())
        .to(new pc.Vec3(100, 100, 100), .1, pc.SineOut)
        .start();

    if (this.app.room) {
        this.app.room.send("InteractableCage:Interact", {
            id: this.id,
            add: add
        })
    }
    else {
        this.setPoints(this.points + add);
    }

    const gameplayStartCheck = this.app.gamePlayStarted || this.app.isPopupEnabled || this.app.isWatchingAd
        || this.app.anyMenuEnabled() || this.app.rewardedPanelEnabled || this.app.player.controller.isDied || this.app.gameEnded;

    if (!gameplayStartCheck) {
        this.app.gamePlayStarted = true;
        PokiSDK.gameplayStart();
    }
};

InteractableCage.prototype.setPlayer = function (player) {
    if (this.app.room != null) {
        if (this.player == this.app.room.sessionId && player == null) {
            watchCommercial(() => {
                this.app.fire('WarningTextController:setWarning', "You escaped the prison!", 5, new pc.Color(0, 1, 0, 1))
            });
        }

        if (this.player != null && player == null) toggleIndicator(this, false);
        else if (player == this.app.room.sessionId) toggleIndicator(this, true);

        this.player = player;
        this.setDoor(player == null);
    }
    else {
        if (player == null) {
            this.app.location = LOCATIONS.BASEMENT;
            watchCommercial(() => {
                this.app.fire('WarningTextController:setWarning', "You escaped the prison!", 5, new pc.Color(0, 1, 0, 1))
            });
            toggleIndicator(this, false);
            this.setDoor(true);
            this.player = null;
        }
        else {
            this.player = player;
            toggleIndicator(this, true);
            this.setDoor(false);
        }
    }
}

InteractableCage.prototype.setDoor = function (doorOpen) {
    if (!this.collider) return;
    this.collider.enabled = !doorOpen;

    if (doorOpen)
        this.playSound("close", true);
    else
        this.playSound("open", true);

    this.door
        .tween(this.door.getLocalEulerAngles())
        .rotate(new pc.Vec3(0, 0, doorOpen ? 120 : 0), 1, pc.QuinticOut)
        .start();
}

InteractableCage.prototype.setPoints = function (points) {
    this.points = points;
    this.sliderValue = mapRange(points, 0, 50, -0.9, 0.9);

    this.escapeArrow.setLocalPosition(this.sliderValue, .1, 0);
    this.rescueArrow.setLocalPosition(this.sliderValue, .1, 0);

    if (!this.app.room) {
        if (this.points >= 50) {
            // escape prison
            this.points = 0;

            this.setPlayer(null);
        }
    }
}