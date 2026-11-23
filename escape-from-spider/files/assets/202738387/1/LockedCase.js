var LockedCase = pc.createScript('lockedCase');
LockedCase.attributes.add("password", { type: "number", default: 111 })
LockedCase.attributes.add("id", { type: "number" })
LockedCase.attributes.add("item", { type: "entity" })

LockedCase.prototype.initialize = function () {
    this.locked = true;
    this.model = this.entity.findByName("Model") ?? this.entity.children[0];
    this.indicator = this.entity.findByName("Indicator") ?? this.entity.children[1];
    this.camera = this.entity.findByName("Camera") ?? this.entity.children[2];
    this.cover = this.entity.findByName("Cover") ?? this.model.children[0];

    this.cylinders = this.model.children[0].children;
    for (let i = 0; i < this.cylinders.length; i++) {
        this.cylinders[i].number = 1;
    }

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle && !this.active && this.entity.canInteract && !this.app.isSpider), this);

    this.entity.canInteract = true;

    this.active = false;

    if (this.app.lockedCasePassword)
        this.setPass(this.app.lockedCasePassword);

    eventSubscribe(this, "SetLockedCasePassword", this.setPass);
    eventSubscribe(this, "CloseCase", this.closeCase);
    eventSubscribe(this, "CaseEvent", this.caseEvent);

    if (getCurrentChapter() == Chapters.Three) this.app.lockedCase = this;
};

LockedCase.prototype.playSound = function (soundName, randomPitch = false) {
    if (this.entity.sound == null) return;
    this.slot = this.entity.sound.slot(soundName);
    if (this.slot == null) return;
    if (randomPitch) {
        this.slot.pitch = pc.math.random(0.8, 1.2);
    }
    this.slot.play();
};

LockedCase.prototype.setPass = function (pass) {
    if (pass == null || isNaN(pass)) return;

    this.password = pass;
    console.log("locked case pass:", pass);
}

LockedCase.prototype.interact = function (playerInteract) {
    if (!this.entity.canInteract || this.app.isSpider) return;

    this.app.fire("OpenMenu", "LockedCase");
    this.camera.enabled = true;
    this.active = true;
    this.app.caseScreen = true;
    this.app.player.canMove = false;
    this.app.player.controller.faceSprite.enabled = false;
    this.playSound("swoosh", true);

    toggleIndicator(this, false);
}

LockedCase.prototype.closeCase = function () {
    if (!this.active) return;

    this.app.fire("CloseMenu");
    this.playSound("swoosh", true);
    this.app.player.canMove = true;
    this.app.caseScreen = false;
    this.camera.enabled = false;
    this.active = false;

    if (!this.app.isFPS)
        this.app.player.controller.faceSprite.enabled = true;
};

LockedCase.prototype.caseEvent = function (dir, forward) {
    if (!this.active || this.app.isSpider) return;

    toggleIndicator(this, false);

    let cylinder = this.cylinders[dir];

    cylinder.number += forward ? 1 : -1;
    if (cylinder.number < 0) cylinder.number = 9;
    if (cylinder.number > 9) cylinder.number = 0;

    this.playSound("button", true);

    let pass = Number(this.cylinders.map(cylinder => cylinder.number).join(''));
    if (pass == this.password) {
        this.app.fire('WarningTextController:setWarning', "You unlocked the case!", 5, new pc.Color(0, 1, 0, 1));

        if (this.app.room) {
            this.closeCase();
            this.app.room.send("InteractableCase:Interact", { id: this.id });
        }
        else {
            this.unlock(false);
        }
    }

    if (!cylinder.yRot)
        cylinder.yRot = 0;

    cylinder.yRot += forward ? -36 : 36;

    cylinder.targetRot = this.getRot(cylinder.yRot);
}


LockedCase.prototype.getRot = function (yRot) {
    let targetRot = new pc.Vec3(0, yRot, 0);
    let targetQuat = new pc.Quat().setFromEulerAngles(targetRot);

    let finalQuat = new pc.Quat();
    finalQuat.mul(targetQuat);

    return finalQuat;
};

LockedCase.prototype.update = function (dt) {
    for (let i = 0; i < this.cylinders.length; i++) {
        let cylinder = this.cylinders[i];
        let quat = cylinder.getLocalRotation().clone();

        if (!cylinder.targetRot)
            cylinder.targetRot = quat;

        let slerp = quat.slerp(quat, cylinder.targetRot, dt * 10);
        cylinder.setLocalRotation(slerp);
    }
};

LockedCase.prototype.unlock = function () {
    this.playSound("unlock", true);

    if (!this.locked) return;
    this.locked = false;

    this.closeCase();
    this.entity.canInteract = false;
    this.item.enabled = true;
    toggleIndicator(this, false);

    this.cover
        .tween(this.cover.getLocalEulerAngles())
        .rotate(new pc.Vec3(0, 0, 115), .5, pc.SineOut)
        .start();

    this.app.fire("RefreshTutorial");
}