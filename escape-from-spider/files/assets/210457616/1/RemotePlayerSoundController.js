var RemotePlayerSoundController = pc.createScript('remotePlayerSoundController');

RemotePlayerSoundController.attributes.add("animBody", { type: "entity" });
// initialize code called once per entity
RemotePlayerSoundController.prototype.initialize = function () {
    this.playerSpider = this.entity.findByName("PlayerSpider");
    //find footstep sfx
    this.playerChangedLocation(LOCATIONS.GARDEN);
    this.jumpSlot = this.entity.sound.slot("jump");
    this.pickupSlot = this.entity.sound.slot("pickup");
    this.dropSlot = this.entity.sound.slot("drop");
    this.climb = this.entity.sound.slot("climb");

    this.playerSpider.anim.on('footstep', () => {
        if (this.entity.script.remotePlayerController.isPlayerSpider) {
            const sound = this.footstepSounds[0];
            sound.pitch = pc.math.random(0.5, 1.2);
            sound.play();
        } else {
        }
    });
    this.animBody.anim.on('footstep', () => {
        if (this.entity.script.remotePlayerController.isPlayerSpider) {
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
};

RemotePlayerSoundController.prototype.playerChangedLocation = function (location) {
    if (this.entity.script.remotePlayerController.isPlayerSpider) {
        if (location == LOCATIONS.HOUSE) {
            this.footstepSounds = [
                this.playerSpider.sound.slot("footstepHouse"),
            ];
        } else if (location == LOCATIONS.BASEMENT) {
            this.footstepSounds = [
                this.playerSpider.sound.slot("footstepBasement"),
            ];
        } else {
            this.footstepSounds = [
                this.playerSpider.sound.slot("footstep"),
            ];
        }
    } else {
        if (location == LOCATIONS.HOUSE) {
            this.footstepSounds = [
                this.entity.sound.slot("footstep0House"),
                this.entity.sound.slot("footstep1House"),
                this.entity.sound.slot("footstep2House")
            ];
        } else if (location == LOCATIONS.BASEMENT) {
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