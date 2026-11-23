var TutorialManagerTwo = pc.createScript('tutorialManagerTwo');
TutorialManagerTwo.attributes.add("text", { type: "entity" })
TutorialManagerTwo.attributes.add("notepad", { type: "entity" })
TutorialManagerTwo.attributes.add("endTrigger", { type: "entity" })
TutorialManagerTwo.attributes.add("liftCamera", { type: "entity" })
TutorialManagerTwo.attributes.add("spiderNoCollider", { type: "entity", array: true })//spider olunca kapatilacaklar

const ObjectiveStatesTwo = {
    OpenLockedCase: 0,
    PlaceCables: 1,
    PlaceCarjack: 2,
    UnlockComputer: 3,
    PowerGenerator: 4,
    Escape: 5,
}

TutorialManagerTwo.prototype.initialize = function () {
    this.app.tutorialManagerTwo = this;
    eventSubscribe(this, "RefreshTutorial", this.refreshState);
    this.isRestarting = false;
    this.state = 0;
    this.refreshState();

    this.endTrigger.collision.on("triggerenter", (entity) => {
        if (!entity.tags.has("Player")) return;
        //if (this.state != ObjectiveStatesTwo.Escape || this.app.isSpider) return;
        this.endGame();
    }, this);

    if (this.app.touch)
        this.app.touch.on(pc.EVENT_TOUCHSTART, this.onTouchStart, this);

    this.entity.on("destroy", () => {
        if (this.app.touch)
            this.app.touch.off(pc.EVENT_TOUCHSTART, this.onTouchStart, this);
    }, this);
};

TutorialManagerTwo.prototype.onTouchStart = function () {
    if (this.app.gameEnded)
        this.restart();
}

TutorialManagerTwo.prototype.endGame = function () {
    this.app.gameEnded = true;
    if (this.app.gamePlayStarted) {
        this.app.gamePlayStarted = false;
        PokiSDK.gameplayStop();
    }
    this.app.player.canMove = false;
    this.app.player.entity.collision.enabled = false;
    this.app.player.entity.rigidbody.type = pc.BODYTYPE_KINEMATIC;
    this.app.player.controller._animComponent.setBoolean("isInAir", false);
    this.app.musicPlayer.stop();
    this.app.musicPlayer.entity.sound.stop("rushMusic");

    this.liftCamera.enabled = true;

    this.app.ui.openEndUI();

    this.endTrigger.sound.play("escapeMusic");
    Utils.setItem("chapterTwoFinished", "true");
}

TutorialManagerTwo.prototype.refreshState = function () {
    if (!SpawnManager.Instance.inited) return;

    this.notepad.children.forEach(c => c.enabled = false);

    if (this.app.lockedCase.locked == true) this.state = ObjectiveStatesTwo.OpenLockedCase;
    else if (this.app.trafo.unlocked != true) this.state = ObjectiveStatesTwo.PlaceCables;
    else if (this.app.abandonedCar.locked) this.state = ObjectiveStatesTwo.PlaceCarjack;
    else if (this.app.passwordComputer.locked) this.state = ObjectiveStatesTwo.UnlockComputer;
    else if (this.app.generator.locked) this.state = ObjectiveStatesTwo.PowerGenerator;
    else this.state = ObjectiveStatesTwo.Escape;

    let obj = this.notepad.children[this.state];

    let checkItem = function (id) {
        if (pc.app.player.interact.rightItem != null) return pc.app.player.interact.rightItem.id == id;
        else return false;
    }

    switch (this.state) {
        case ObjectiveStatesTwo.OpenLockedCase: break;

        case ObjectiveStatesTwo.PlaceCables: break;

        case ObjectiveStatesTwo.PlaceCarjack:
            obj.findByName("Find").enabled = !checkItem(Item.Carjack);
            break;

        case ObjectiveStatesTwo.UnlockComputer:
            obj.findByName("Find").enabled = !checkItem(Item.Codebook);
            break;

        case ObjectiveStatesTwo.PowerGenerator:
            obj.findByName("Find").enabled = !checkItem(Item.Fuel);
            break;

        default:
            break;
    }

    obj.enabled = true;
};

TutorialManagerTwo.prototype.restart = async function () {
    if (!this.app.gameEnded) return;
    if (this.isRestarting) return;
    this.isRestarting = true;
    this.app.ambienceManager.stop();
    this.app.musicPlayer.stop();
    if (this.app.room) await this.app.room.leave();
    this.app.scenes.changeScene('Chapter2');
    this.app.gameEnded = false;
}

TutorialManagerTwo.prototype.update = function (dt) {
    if (this.app.gameEnded && pc.app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) {
        this.restart();
    }
}