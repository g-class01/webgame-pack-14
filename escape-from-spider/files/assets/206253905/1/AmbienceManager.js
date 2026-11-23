var AmbienceManager = pc.createScript('ambienceManager');
AmbienceManager.attributes.add("spawnTrigger", { type: "entity" })
AmbienceManager.attributes.add("houseTrigger", { type: "entity" })
AmbienceManager.attributes.add("basementTrigger", { type: "entity" })
AmbienceManager.attributes.add("dustAmbienceParticle", { type: "entity" })

AmbienceManager.prototype.initialize = function () {
    this.app.ambienceManager = this;
    this.app.spiderLocation = LOCATIONS.GARDEN;
    this.app.playerLocation = LOCATIONS.GARDEN;
    this.outsideSound = this.entity.findByName("Outside").sound;
    this.houseSound = this.entity.findByName("House").sound;
    this.basementSound = this.entity.findByName("Basement").sound;

    this.volumes = {
        outside: .3,
        house: 0,
        basement: 0,
    }

    this.spawnTrigger.collision.on("triggerenter", (other) => {
        if (!other.tags.has("Player")) return;
        if (this.app.isSpider || this.app.inSafeArea) return;

        this.app.fire('WarningTextController:setWarning', "You are in the safe area.", 5, new pc.Color(0, 1, 0, 1));
        this.app.inSafeArea = true;
        this.resetSounds();
    })

    this.spawnTrigger.collision.on("triggerleave", (other) => {
        if (!other.tags.has("Player")) return;
        if (this.app.isSpider || !this.app.inSafeArea) return;

        this.app.fire('WarningTextController:setWarning', "You are out of the safe area!", 5, new pc.Color(1, 1, 0, 1));
        this.app.inSafeArea = false;
    })

    this.houseTrigger.collision.on("triggerenter", (other) => {
        if (other.tags.has("Spider")) {
            this.app.spiderLocation = LOCATIONS.HOUSE;
            this.app.fire("AmbienceManager:SpiderChangedLocation");
        }
        if (!other.tags.has("Player")) return;

        this.fadeTo({ outside: 0, house: .3, basement: 0 });
        this.dustAmbienceParticle.particlesystem.play();
        this.app.playerLocation = LOCATIONS.HOUSE;
        this.app.fire("AmbienceManager:PlayerChangedLocation");
        if (this.app.room)
            this.app.room.send("Client:AmbienceManager:PlayerChangedLocation", { location: this.app.playerLocation });
    })

    this.houseTrigger.collision.on("triggerleave", (other) => {
        if (other.tags.has("Spider")) {
            this.app.spiderLocation = LOCATIONS.GARDEN;
            this.app.fire("AmbienceManager:SpiderChangedLocation");
        }
        if (!other.tags.has("Player")) return;

        this.fadeTo({ outside: .3, house: 0, basement: 0 });
        this.dustAmbienceParticle.particlesystem.stop();
        this.app.playerLocation = LOCATIONS.GARDEN;
        this.app.fire("AmbienceManager:PlayerChangedLocation");
        if (this.app.room)
            this.app.room.send("Client:AmbienceManager:PlayerChangedLocation", { location: this.app.playerLocation });
    })

    this.basementTrigger.collision.on("triggerenter", (other) => {
        if (other.tags.has("Spider")) {
            this.app.spiderLocation = LOCATIONS.BASEMENT;
            this.app.fire("AmbienceManager:SpiderChangedLocation");
        }
        if (!other.tags.has("Player")) return;

        this.fadeTo({ outside: 0, house: 0, basement: .3 });
        this.dustAmbienceParticle.particlesystem.play();
        this.app.playerLocation = LOCATIONS.BASEMENT;
        this.app.fire("AmbienceManager:PlayerChangedLocation");
        if (this.app.room)
            this.app.room.send("Client:AmbienceManager:PlayerChangedLocation", { location: this.app.playerLocation });
    })

    this.basementTrigger.collision.on("triggerleave", (other) => {
        if (other.tags.has("Spider")) {
            this.app.spiderLocation = LOCATIONS.GARDEN;
            this.app.fire("AmbienceManager:SpiderChangedLocation");
        }
        if (!other.tags.has("Player")) return;

        this.fadeTo({ outside: .3, house: 0, basement: 0 });
        this.dustAmbienceParticle.particlesystem.stop();
        this.app.playerLocation = LOCATIONS.GARDEN;
        this.app.fire("AmbienceManager:PlayerChangedLocation");
        if (this.app.room)
            this.app.room.send("Client:AmbienceManager:PlayerChangedLocation", { location: this.app.playerLocation });
    })
};

// House and Basement no longer autoplay at volume 0 for the whole game: a loop
// is started when a crossfade raises it and stopped once it has faded out.
AmbienceManager.prototype.fadeTo = function (target) {
    if (this.fadeTween) this.fadeTween.stop();

    if (target.outside > 0) this.ensurePlaying(this.outsideSound);
    if (target.house > 0) this.ensurePlaying(this.houseSound);
    if (target.basement > 0) this.ensurePlaying(this.basementSound);

    this.fadeTween = this.app
        .tween(this.volumes)
        .to(target, 5, pc.Linear)
        .onUpdate(() => this.updateVolumes())
        .onComplete(() => {
            if (this.volumes.outside <= 0) this.outsideSound.stop();
            if (this.volumes.house <= 0) this.houseSound.stop();
            if (this.volumes.basement <= 0) this.basementSound.stop();
        })
        .start();
};

AmbienceManager.prototype.ensurePlaying = function (sound) {
    for (const name in sound.slots) {
        const slot = sound.slots[name];
        if (!slot.isPlaying) slot.play();
        return;
    }
};

AmbienceManager.prototype.updateVolumes = function () {
    this.outsideSound.volume = this.volumes.outside;
    this.houseSound.volume = this.volumes.house;
    this.basementSound.volume = this.volumes.basement;
};

AmbienceManager.prototype.stop = function () {
    if (this.fadeTween) this.fadeTween.stop();
    this.outsideSound.stop();
    this.houseSound.stop();
    this.basementSound.stop();
};

// play() without a slot name is a no-op, so this used to leave every ambience
// silent after re-entering the safe area.
AmbienceManager.prototype.resetSounds = function () {
    this.stop();
    this.volumes.outside = .3;
    this.volumes.house = 0;
    this.volumes.basement = 0;
    this.updateVolumes();
    this.ensurePlaying(this.outsideSound);
    this.dustAmbienceParticle.particlesystem.stop();
};
