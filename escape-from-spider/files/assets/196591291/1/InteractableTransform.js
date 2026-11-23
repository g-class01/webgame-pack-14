const InteractableType = {
    Door: 0,
}

var InteractableTransform = pc.createScript('interactableTransform');
InteractableTransform.attributes.add("id", { type: "number", default: 0 })
InteractableTransform.attributes.add("needId", { type: "number", default: -1 })
InteractableTransform.attributes.add("remote", { type: "boolean" })
InteractableTransform.attributes.add("locked", { type: "boolean" })
InteractableTransform.attributes.add("planked", { type: "boolean" })
InteractableTransform.attributes.add("toggleCollider", { type: "boolean" })
InteractableTransform.attributes.add("animDuration", { type: "number", default: .25 })
InteractableTransform.attributes.add("lockPos", { type: "boolean", default: true })
InteractableTransform.attributes.add("targetPos", { type: "vec3" })
InteractableTransform.attributes.add("lockRot", { type: "boolean", default: true })
InteractableTransform.attributes.add("targetRot", { type: "vec3" })
InteractableTransform.attributes.add("targetEntity", { type: "entity" })
InteractableTransform.attributes.add("plank", { type: "entity" })
InteractableTransform.attributes.add("itemParentAnim", { type: "boolean", default: false })

InteractableTransform.prototype.initialize = function () {
    this.targetEntity ||= this.entity;

    if (this.needId != -1)
        this.needItem = this.app.itemDatabase.items[this.needId];

    if (this.toggleCollider)
        this.collider = this.entity.findByName("Collider");

    this.toggle = false;

    this.model = this.entity.findByName("Model");
    this.indicator = this.entity.findByName("Indicator");
    this.itemParent = this.entity.findByName("ItemParent");

    if (!this.itemParent) {
        this.itemParent = new pc.Entity("ItemParent");
        this.itemParent.reparent(this.entity);
    }

    this.startPos = this.targetEntity.getLocalPosition().clone();
    this.startRot = this.targetEntity.getLocalEulerAngles().clone();

    if (this.lockPos) this.targetPos = this.startPos;
    if (this.lockRot) this.targetRot = this.startRot;

    this.entity.on("interact", this.interact, this);
    //this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle), this);
    this.entity.on("toggleIndicator", (toggle) => {
        if (this.planked && this.plankHp > 0) return;
        toggleIndicator(this, toggle);
    }, this);

    this.app.on("OpenDoor:" + this.id, this.interact, this);
    this.app.on("OpenLock:" + this.id, this.openLock, this);

    this.entity.on("destroy", () => {
        this.app.off("OpenDoor:" + this.id, this.interact, this);
        this.app.off("OpenLock:" + this.id, this.openLock, this);
    })

    this.entity.canInteract = !this.remote && !this.locked;

    if (this.planked) {
        this.plank.enabled = true;
        this.plankHp = 3;
        this.plank.transform = this;

        this.plank.on("damage", this.damagePlank, this);
    }

    this.itemParent.enabled = false;
    this.snake = null;
};

InteractableTransform.prototype.playSound = function (soundName, randomPitch = false) {
    if (this.entity.sound == null) return;
    this.slot = this.entity.sound.slot(soundName);
    if (this.slot == null) return;
    if (randomPitch) {
        this.slot.pitch = pc.math.random(0.8, 1.2);
    }
    this.slot.play();
};

InteractableTransform.prototype.interact = function (playerInteract) {
    if (this.locked) return;
    if (this.planked && this.plankHp > 0) return;

    if (this.needId != -1 && (!playerInteract.rightItem || this.needId != playerInteract.rightItem.id)) {
        this.playSound("locked", true);
        this.app.fire('WarningTextController:setWarning', "You need " + this.needItem.name + " to open this door!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    if (this.snake && this.toggle) return;

    if (this.snake) {
        if (this.app.room) {
            this.app.room.send("InteractableTransform:Interact", { id: this.id, toggle: true });
        }
        this.snake.damage = true;

        setTimeout(() => {
            if (this.app.room) {
                this.app.room.send("InteractableTransform:Interact", { id: this.id, toggle: false });
            }
            this.snake.damage = false;
        }, 3000);
    }

    if (this.app.room) {
        this.app.room.send("InteractableTransform:Interact", { id: this.id, toggle: !this.toggle });
    }
    else {
        this.setToggle(!this.toggle)
    }
};

InteractableTransform.prototype.setToggle = function (toggle) {
    this.toggle = toggle;

    if (this.toggle)
        this.playSound("open", true);
    else
        this.playSound("close", true);

    if (toggle)
        this.itemParent.enabled = true;

    if (this.itemParentAnim) {
        this.itemParent
            .tween(this.itemParent.getLocalPosition())
            .to(new pc.Vec3(0, 0, toggle ? 1.5 : 0), 1, pc.QuinticOut)
            .start();
    }

    let targetPos = this.toggle ? this.targetPos : this.startPos;
    let targetRot = this.toggle ? this.targetRot : this.startRot;

    this.targetEntity
        .tween(this.targetEntity.getLocalPosition())
        .to(targetPos, this.animDuration, pc.QuinticOut)
        .onComplete(() => {
            if (!toggle)
                this.itemParent.enabled = false;
        })
        .start();

    this.targetEntity
        .tween(this.targetEntity.getLocalEulerAngles())
        .rotate(targetRot, this.animDuration, pc.QuinticOut)
        .start();

    if (this.toggleCollider) {
        if (this.colliderTimeout)
            clearTimeout(this.colliderTimeout);

        if (this.toggle) this.collider.enabled = false;
        else this.colliderTimeout = setTimeout(() => this.collider.enabled = true, this.animDuration * 1000);
    }

    if (this.snake && this.toggle) this.snake.attack();
}

InteractableTransform.prototype.openLock = function () {
    this.locked = false;
    this.entity.canInteract = !this.remote && !this.locked;
    this.playSound("unlock", true);
    this.app.player.interact.refresh();

    if (this.app.room)
        this.app.room.send("InteractableTransform:Interact", { id: this.id, toggle: true });
    else
        this.setToggle(true);
}

InteractableTransform.prototype.damagePlank = function (hp = null) {
    if (!this.planked) return;
    if (this.plankHp <= 0) return;
    if (!this.plank.enabled) return;

    this.plank
        .tween(this.plank.getLocalScale())
        .to(new pc.Vec3(1.1, 1.1, 1.1), .2, pc.QuinticOut)
        .onComplete(() => {
            this.plank
                .tween(this.plank.getLocalScale())
                .to(pc.Vec3.ONE, .2, pc.QuinticOut)
                .onComplete(() => {
                    if (hp == null)
                        this.plankHp -= 1;
                    else
                        this.plankHp = hp;

                    if (this.plankHp <= 0) {
                        this.plank.enabled = false;
                    }

                    this.app.fire("RefreshTutorial");
                })
                .start();
        })
        .start();
}

InteractableTransform.prototype.initSnake = function (snake) {
    this.snake = snake;
}