var PlayerSoundController = pc.createScript('playerSoundController');
PlayerSoundController.attributes.add("animBody", { type: "entity" });
// initialize code called once per entity
PlayerSoundController.prototype.initialize = function () {
    this.playerSpider = this.entity.findByName("PlayerSpider");
    //find footstep sfx
    this.playerChangedLocation();
    this.app.on("AmbienceManager:PlayerChangedLocation", this.playerChangedLocation, this);

    this.jumpSlot = this.entity.sound.slot("jump");
    this.pickupSlot = this.entity.sound.slot("pickup");
    this.dropSlot = this.entity.sound.slot("drop");
    this.climb = this.entity.sound.slot("climb");
    this.hit = this.entity.sound.slot("hit");
    this.collectCoin = this.entity.sound.slot("collectCoin");

    this.playerSpider.anim.on('footstep', () => {
        if (this.app.isSpider) {
            const sound = this.footstepSounds[0];
            sound.pitch = pc.math.random(0.5, 1.2);
            sound.play();
        } else {
        }
    });
    this.animBody.anim.on('footstep', () => {
        if (this.app.isSpider) {
        } else {
            const sound = this.footstepSounds[Math.floor(pc.math.random(0, 3))];
            sound.pitch = pc.math.random(0.8, 1.2);
            sound.play();
        }
    });
    this.animBody.anim.on('climb', () => {
        this.climb.pitch = pc.math.random(0.8, 1.2);
        this.climb.play();
    });
    this.animBody.anim.on('hit', () => {
        this.hit.pitch = pc.math.random(0.8, 1.2);
        this.hit.play();
    });
    this.animBody.anim.on('died', () => {
        this.entity.sound.slot("died").play();
    });
    this.entity.on('jump', () => {
        this.jumpSlot.pitch = pc.math.random(0.9, 1.1);
        this.jumpSlot.play();
    });
    this.entity.on('pickupObject', () => {
        this.pickupSlot.pitch = pc.math.random(0.9, 1.1);
        this.pickupSlot.play();
    });
    this.entity.on('dropObject', () => {
        this.dropSlot.pitch = pc.math.random(0.9, 1.1);
        this.dropSlot.play();
    });
    this.entity.on('collectCoin', () => {
        this.collectCoin.pitch = pc.math.random(0.9, 1.1);
        this.collectCoin.play();
    });
    this.entity.on('ropeTension', () => {
        this.ropeTension.pitch = pc.math.random(0.9, 1.1);
        this.ropeTension.play();
    });

    this.on('destroy', function () {
        this.app.off("AmbienceManager:PlayerChangedLocation", this.playerChangedLocation, this);
    }, this);
};

PlayerSoundController.prototype.playerChangedLocation = function () {
    if (this.app.isSpider) {
        if (this.app.playerLocation == LOCATIONS.HOUSE) {
            this.footstepSounds = [
                this.playerSpider.sound.slot("footstepHouse"),
            ];
        } else if (this.app.playerLocation == LOCATIONS.BASEMENT) {
            this.footstepSounds = [
                this.playerSpider.sound.slot("footstepBasement"),
            ];
        } else {
            this.footstepSounds = [
                this.playerSpider.sound.slot("footstep"),
            ];
        }
    } else {
        if (this.app.playerLocation == LOCATIONS.HOUSE) {
            this.footstepSounds = [
                this.entity.sound.slot("footstep0House"),
                this.entity.sound.slot("footstep1House"),
                this.entity.sound.slot("footstep2House")
            ];
        } else if (this.app.playerLocation == LOCATIONS.BASEMENT) {
            this.footstepSounds = [
                this.entity.sound.slot("footstep0Basement"),
                this.entity.sound.slot("footstep1Basement"),
                this.entity.sound.slot("footstep2Basement")
            ];
        } else {
            this.footstepSounds = [
                this.entity.sound.slot("footstep0"),
                this.entity.sound.slot("footstep1"),
                this.entity.sound.slot("footstep2")
            ];
        }
    }
};