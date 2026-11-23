var Generator = pc.createScript('generator');
Generator.attributes.add("trueLight", { type: "entity" })
Generator.attributes.add("elevator", { type: "entity" }) // -1392.62 > -5939.604
Generator.attributes.add("exitDoor", { type: "entity" }) // -6006.34 > -5000
Generator.attributes.add("exitDoorCollider", { type: "entity" })
Generator.attributes.add("valveLeft", { type: "entity" }) // z > -359
Generator.attributes.add("valveRight", { type: "entity" })
Generator.attributes.add("body", { type: "entity" })

Generator.prototype.initialize = function () {
    this.indicator = this.entity.findByName("Indicator");
    this.indicator.startScale = this.indicator.getLocalScale().clone();

    this.slider = this.indicator.findByName("Slider");
    this.sliderArrow = this.indicator.findByName("SliderArrow");

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle), this);

    this.app.generator = this;
    this.locked = true;

    this.entity.canInteract = true;

    this.fuel = 0;

    this.on('destroy', function () {
        this.entity.sound.stop("loop");
    }, this);
};

Generator.prototype.interact = function (playerInteract) {
    if (!playerInteract.rightItem || Item.Fuel != playerInteract.rightItem.id) {
        this.app.fire('WarningTextController:setWarning', "You need a fuel to add!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    if (getCurrentChapter() == Chapters.Three) {
        if (!this.app.refilledFuel) {
            this.app.fire('WarningTextController:setWarning', "Go to tanker and refill this fuel can!", 3, new pc.Color(1, 0, 0, 1));
            return;
        }
        else {
            this.app.refilledFuel = false;
        }
    }

    if (this.app.room) {
        this.app.room.send("Generator:AddFuel");
        this.entity.sound.play("fuel");
    } else {
        let fuelAmount = 10;
        if (getCurrentChapter() == Chapters.Three) {
            fuelAmount = 25;
        }

        this.setFuel(this.fuel + fuelAmount);
        this.entity.sound.play("fuel");
    }

    this.app.currentInteractable.entity.enabled = false;
    this.app.player.interact.setRightHand(null);
    this.app.fire("RefreshTutorial");
};

Generator.prototype.setFuel = function (fuel) {
    this.fuel = fuel;
    this.sliderArrow.setLocalPosition(mapRange(this.fuel, 0, 100, -.9, .9), .1, 0);

    let mul = 1.15;
    this.indicator.setLocalScale(new pc.Vec3(this.indicator.startScale.x * mul, this.indicator.startScale.y * mul, this.indicator.startScale.z * mul));
    this.indicator
        .tween(this.indicator.getLocalScale())
        .to(this.indicator.startScale, .25, pc.SineOut)
        .start();
}

Generator.prototype.unlock = function () {
    this.locked = false;

    this.entity.canInteract = false;
    this.app.player.interact.refresh();
    toggleIndicator(this, false);

    if (getCurrentChapter() == Chapters.Two) this.unlockChapterTwo();
    else if (getCurrentChapter() == Chapters.Three) this.unlockChapterThree();
}

Generator.prototype.unlockChapterTwo = function () {
    this.trueLight.enabled = true;

    let pos = this.elevator.getLocalPosition().clone();
    this.elevator.tween(this.elevator.getLocalPosition())
        .to(new pc.Vec3(pos.x, -5939.604, pos.z), 5, pc.Linear)
        .onComplete(() => {
            this.exitDoorCollider.enabled = false;

            this.valveLeft.tween(this.valveLeft.getLocalEulerAngles())
                .rotate(new pc.Vec3(-90, -90, -180), 5, pc.Linear)
                .start();

            this.valveRight.tween(this.valveRight.getLocalEulerAngles())
                .rotate(new pc.Vec3(-90, 90, -180), 5, pc.Linear)
                .start();

            let exitDoorPos = this.exitDoor.getLocalPosition().clone();
            this.exitDoor.tween(this.exitDoor.getLocalPosition())
                .to(new pc.Vec3(exitDoorPos.x, -5000, exitDoorPos.z), 5, pc.Linear)
                .start();
        })
        .start();

    this.app.musicPlayer.stop();
    this.app.musicPlayer.entity.sound.play("rushMusic");

    this.app.fire('WarningTextController:setWarning', "Generator is powered, go to elevator and escape!", 5, new pc.Color(0, 1, 0, 1));
    this.app.fire("RefreshTutorial");

    this.entity.sound.play("start");
    setTimeout(() => {
        this.entity.sound.play("loop");
        this.body.tween(this.body.getLocalEulerAngles())
            .rotate(new pc.Vec3(-95, 0, 0), 0.05, pc.Linear)
            .loop(true)
            .yoyo(true)
            .start();
        this.body.children[0].particlesystem.play();
    }, 500);
}

Generator.prototype.unlockChapterThree = function () {
    this.app.fire('WarningTextController:setWarning', "Generator is powered!", 5, new pc.Color(0, 1, 0, 1));
    this.app.fire("RefreshTutorial");
}