const LockType = {
    Item: 0,
    Spam: 1,
    PingPong: 2,
}

var InteractableLock = pc.createScript('interactableLock');
InteractableLock.attributes.add("id", { type: "number" })
InteractableLock.attributes.add("needId", { type: "number", default: -1 })
InteractableLock.attributes.add("doorEntity", { type: "entity" })
InteractableLock.attributes.add("type", { type: "number", enum: [{ 'Item': LockType.Item }, { 'Spam': LockType.Spam }, { 'Ping Pong': LockType.PingPong }] })

InteractableLock.prototype.initialize = function () {
    if (this.needId != -1)
        this.needItem = this.app.itemDatabase.items[this.needId];

    this.locked = true;

    this.model = this.entity.findByName("Model") ?? this.entity.children[0];
    this.indicator = this.entity.findByName("Indicator") ?? this.entity.children[1];

    this.collision = this.entity.collision;
    this.rigidbody = this.entity.rigidbody;

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle), this);

    this.entity.canInteract = true;

    this.doorId = this.doorEntity.script.interactableTransform.id;

    this.slider = this.indicator.findByName("Slider");
    this.sliderArrow = this.indicator.findByName("SliderArrow");
    this.sliderValue = -.9;

    // ping pong
    this.sliderForward = true;
    this.isSliding = true;
}

InteractableLock.prototype.update = function (dt) {
    if (!this.locked) return;
    if (this.type == LockType.Item) return;

    switch (this.type) {
        case LockType.Spam:
            this.sliderValue -= dt * .5;
            if (this.sliderValue < -.9)
                this.sliderValue = -.9;
            break;

        case LockType.PingPong:
            if (this.isSliding) {
                this.sliderValue += dt * (this.sliderForward ? 2.5 : -2.5);

                if (this.sliderForward && this.sliderValue > .9) this.sliderForward = false;
                else if (!this.sliderForward && this.sliderValue < -.9) this.sliderForward = true;
            }
            break;
    }


    this.sliderArrow.setLocalPosition(this.sliderValue, .1, 0);
}

InteractableLock.prototype.interact = function (playerInteract) {
    if (this.needId != -1 && (!playerInteract.rightItem || this.needId != playerInteract.rightItem.id)) {
        this.doorEntity.script.interactableTransform.playSound("locked", true);
        this.app.fire('WarningTextController:setWarning', "You need " + this.needItem.name + " to unlock!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    switch (this.type) {
        case LockType.Item:
            if (this.needId != -1 && (!playerInteract.rightItem || this.needId != playerInteract.rightItem.id)) {
                this.doorEntity.script.interactableTransform.playSound("locked", true);
                this.app.fire('WarningTextController:setWarning', "You need " + this.needItem.name + " to unlock!", 3, new pc.Color(1, 0, 0, 1));
                return;
            }
            break;

        case LockType.Spam:
            this.doorEntity.script.interactableTransform.playSound("lockClick", true);
            this.sliderValue += .2;
            this.indicator.setLocalScale(1.15, 1.15, 1.15);
            this.indicator
                .tween(this.indicator.getLocalScale())
                .to(new pc.Vec3(1, 1, 1), .25, pc.SineOut)
                .start();

            if (this.sliderValue < .8)
                return;
            break;

        case LockType.PingPong:
            if (!this.isSliding) return;

            this.isSliding = false;

            if (this.sliderValue > .2 || this.sliderValue < -.2) {
                this.indicator.setLocalScale(1.15, 1.15, 1.15);
                this.indicator
                    .tween(this.indicator.getLocalScale())
                    .to(new pc.Vec3(1, 1, 1), .25, pc.SineOut)
                    .start();

                this.app.fire('WarningTextController:setWarning', "Miss!", 3, new pc.Color(1, 1, 0, 1));

                setTimeout(() => {
                    this.isSliding = true;
                }, 500);

                return;
            }
            break;
    }

    this.app.fire('WarningTextController:setWarning', "You unlocked the lock!", 3, new pc.Color(0, 1, 0, 1));

    if (this.type == LockType.Item && this.needId != -1) {
        playerInteract.setRightHand(null);
    }

    if (this.app.room) {
        this.app.room.send("InteractableLock:Interact", { id: this.id });
    }
    else {
        this.unlock();
    }
}

InteractableLock.prototype.unlock = function () {
    this.entity.canInteract = false;

    this.locked = false;
    this.model.enabled = false;

    this.collision.enabled = false;
    this.rigidbody.enabled = false;

    this.app.fire("OpenLock:" + this.doorId);

    this.app.player.interact.refresh();

    toggleIndicator(this, false);

    this.app.fire("RefreshTutorial");
}