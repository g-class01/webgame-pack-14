var TutorialManagerThree = pc.createScript('tutorialManagerThree');
TutorialManagerThree.attributes.add("text", { type: "entity" })
TutorialManagerThree.attributes.add("notepad", { type: "entity" })
TutorialManagerThree.attributes.add("endTrigger", { type: "entity" })
TutorialManagerThree.attributes.add("liftCamera", { type: "entity" })
TutorialManagerThree.attributes.add("spiderNoCollider", { type: "entity", array: true })//spider olunca kapatilacaklar

const ObjectiveStatesThree = {
    RebuildLadder: 0,
    OpenLockedCase: 1,
    UnlockCampDoor: 2,
    ExplodeWall: 3, // explode tanker wall
    PowerElectric: 4, // power the town by refilling the tank
    RebuildGlider: 5,
    Escape: 6,
}

TutorialManagerThree.prototype.initialize = function () {
    this.app.tutorialManagerThree = this;
    eventSubscribe(this, "RefreshTutorial", this.refreshState);
    this.isRestarting = false;
    this.state = 0;
    this.refreshState();

    this.endTrigger.collision.on("triggerenter", (entity) => {
        //if (!entity.tags.has("Player")) return;
        //if (this.state != ObjectiveStatesTwo.Escape || this.app.isSpider) return;
        //this.endGame();
    }, this);

    if (this.app.touch)
        this.app.touch.on(pc.EVENT_TOUCHSTART, this.onTouchStart, this);

    this.entity.on("destroy", () => {
        if (this.app.touch)
            this.app.touch.off(pc.EVENT_TOUCHSTART, this.onTouchStart, this);
    }, this);
};

TutorialManagerThree.prototype.onTouchStart = function () {
    if (this.app.gameEnded)
        this.restart();
}

TutorialManagerThree.prototype.endGame = function () {
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

    //this.endTrigger.sound.play("escapeMusic");
    Utils.setItem("chapterThreeFinished", "true");

    let liftCamera = this.liftCamera;
    let glider = this.app.root.findByName("BuildedGlider");
    let gliderBottom = this.app.root.findByName("GliderBottom");

    let liftCameraTo = new pc.Vec3(76.415, 50, -75.258);
    let gliderTo = new pc.Vec3(99.245, 41.369, -89.982);
    let gliderBottomTo = new pc.Vec3(98.25, 39.418, -89.981);

    let liftCameraTo2 = new pc.Vec3(176.415, 100, -75.258);
    let gliderTo2 = new pc.Vec3(300, 41.369, -89.982);

    setTimeout(() => {
        liftCamera
            .tween(liftCamera.getLocalPosition())
            .to(liftCameraTo, 7.5, pc.Linear)
            .onComplete(() => {
                liftCamera
                    .tween(liftCamera.getLocalPosition())
                    .to(liftCameraTo2, 5, pc.Linear)
                    .start();
            })
            .start();

        glider
            .tween(glider.getLocalPosition())
            .to(gliderTo, 7.5, pc.Linear)
            .onComplete(() => {
                glider
                    .tween(glider.getLocalPosition())
                    .to(gliderTo2, 15, pc.QuinticOut)
                    .start();
            })
            .start();

        gliderBottom
            .tween(gliderBottom.getLocalPosition())
            .to(gliderBottomTo, 7.5, pc.Linear)
            .start();
    }, 500);
}

TutorialManagerThree.prototype.refreshState = function () {
    if (!SpawnManager.Instance.inited) return;

    this.notepad.children.forEach(c => c.enabled = false);

    if (this.app.ladder.complete != true) this.state = ObjectiveStatesThree.RebuildLadder;
    else if (this.app.lockedCase.locked == true) this.state = ObjectiveStatesThree.OpenLockedCase;
    else if (this.app.campDoor.locked == true) this.state = ObjectiveStatesThree.UnlockCampDoor;
    else if (this.app.tankerWall.locked == true) this.state = ObjectiveStatesThree.ExplodeWall;
    else if (this.app.generator.locked == true) this.state = ObjectiveStatesThree.PowerElectric;
    else if (this.app.brokenGlider.complete != true) this.state = ObjectiveStatesThree.RebuildGlider;
    else this.state = ObjectiveStatesThree.Escape;
    console.log("this.state", this.state)

    let obj = this.notepad.children[this.state];

    let checkItem = function (id) {
        if (pc.app.player.interact.rightItem != null) return pc.app.player.interact.rightItem.id == id;
        else return false;
    }

    switch (this.state) {
        case ObjectiveStatesThree.UnlockCampDoor:
            obj.findByName("Find").enabled = !checkItem(Item.KeyBlue);
            break;

        case ObjectiveStatesThree.ExplodeWall:
            obj.findByName("Find").enabled = !checkItem(Item.Grenade);
            break;

        case ObjectiveStatesThree.PowerElectric:
            obj.findByName("Find").enabled = !checkItem(Item.Fuel);
            obj.findByName("Refill").enabled = !this.app.refilledFuel;
            break;

        default:
            break;
    }

    obj.enabled = true;

    this.app.brokenGlider.countText.enabled = this.state == ObjectiveStatesThree.RebuildGlider;
};

TutorialManagerThree.prototype.restart = async function () {
    if (!this.app.gameEnded) return;
    if (this.isRestarting) return;
    this.isRestarting = true;
    this.app.ambienceManager.stop();
    this.app.musicPlayer.stop();
    if (this.app.room) await this.app.room.leave();
    this.app.scenes.changeScene('Chapter3');
    this.app.gameEnded = false;
}

TutorialManagerThree.prototype.update = function (dt) {
    if (pc.app.keyboard.wasPressed(pc.KEY_0)) {
        this.endGame();
    }
    if (this.app.gameEnded && pc.app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) {
        this.restart();
    }
}