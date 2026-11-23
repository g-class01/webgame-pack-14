var TutorialManager = pc.createScript('tutorialManager');
TutorialManager.attributes.add("text", { type: "entity" })
TutorialManager.attributes.add("notepad", { type: "entity" })
TutorialManager.attributes.add("powerSwitch", { type: "entity" })
TutorialManager.attributes.add("leakSwitch", { type: "entity" })
TutorialManager.attributes.add("yellowFusionDoor", { type: "entity" })
TutorialManager.attributes.add("lift", { type: "entity" })
TutorialManager.attributes.add("liftTarget", { type: "entity" })
TutorialManager.attributes.add("liftTrigger", { type: "entity" })
TutorialManager.attributes.add("liftCamera", { type: "entity" })

const ObjectiveStates = {
    UnlockBasement: 0, // Find the red key and open the basement door!
    StopLeak: 1, // Pull the switch to stop the electrical leak!
    CutFence: 2, // Find the cutter and cut the fence!
    PowerTower: 3, // Power the radio tower by pulling the switch!
    PlaceGreenFusion: 4, // Pick up the green fusion and place it to radio tower!
    OpenLockedCase: 5, // Find the password and unlock locked case with it!
    PlaceBlueFusion: 6, // Pick up the blue fusion and place it to radio tower!
    UnlockDoor: 7, // Find the wrench and unlock the door in front yard with it!
    PlaceYellowFusion: 8, // Pick up the yellow fusion and place it to radio tower!
    Escape: 9, // Go to the radio tower and escape!
}

TutorialManager.prototype.initialize = function () {
    TutorialManager.Instance = this;

    eventSubscribe(this, "RefreshTutorial", this.refreshState);
    this.isRestarting = false;
    this.state = 0;
    this.refreshState();

    this.liftTrigger.collision.on("triggerenter", (entity) => {
        if (!entity.tags.has("Player")) return;
        if (this.state != ObjectiveStates.Escape || this.app.isSpider) return;
        this.endGame()
    }, this);

    if (this.app.touch)
        this.app.touch.on(pc.EVENT_TOUCHSTART, this.onTouchStart, this);

    this.entity.on("destroy", () => {
        if (this.app.touch)
            this.app.touch.off(pc.EVENT_TOUCHSTART, this.onTouchStart, this);
    }, this);
};

TutorialManager.prototype.onTouchStart = function () {
    if (this.app.gameEnded)
        this.restart();
}

TutorialManager.prototype.endGame = function () {
    this.app.gameEnded = true;

    this.app.player.canMove = false;
    this.app.player.entity.collision.enabled = false;
    this.app.player.entity.reparent(this.lift);
    this.app.player.entity.rigidbody.type = pc.BODYTYPE_KINEMATIC;
    this.app.player.controller._animComponent.setBoolean("isInAir", false);
    this.app.player.entity.rigidbody.teleport(this.lift.findByName("Middle").getPosition().clone());
    this.app.player.entity.setLocalEulerAngles(90, 0, 0);
    this.liftTrigger.sound.play("escapeMusic");
    this.app.musicPlayer.stop();
    this.app.musicPlayer.entity.sound.stop("rushMusic");

    this.liftCamera.enabled = true;

    this.app.ui.openEndUI();

    Utils.setItem("chapterOneFinished", "true");

    setTimeout(() => {
        this.lift
            .tween(this.lift.getLocalPosition())
            .to(this.liftTarget.getLocalPosition().clone(), 10, pc.Linear)
            .start();
    }, 500);
}

TutorialManager.prototype.refreshState = function () {
    if (!SpawnManager.Instance.inited) return;

    this.notepad.children.forEach(c => c.enabled = false);

    if (this.app.basementDoor.locked == true) this.state = ObjectiveStates.UnlockBasement;
    else if (!this.leakSwitch.script.interactableSwitch.toggle) this.state = ObjectiveStates.StopLeak;
    else if (this.app.metalFence.locked) this.state = ObjectiveStates.CutFence;
    else if (this.app.fusionBase.locked) this.state = ObjectiveStates.PowerTower;
    else if (this.app.fusionBase.placings.green != true) this.state = ObjectiveStates.PlaceGreenFusion;
    else if (this.app.lockedCase.locked == true) this.state = ObjectiveStates.OpenLockedCase;
    else if (this.app.fusionBase.placings.blue != true) this.state = ObjectiveStates.PlaceBlueFusion;
    else if (this.yellowFusionDoor.script.interactableTransform.locked == true) this.state = ObjectiveStates.UnlockDoor;
    else if (this.app.fusionBase.placings.yellow != true) this.state = ObjectiveStates.PlaceYellowFusion;
    else this.state = ObjectiveStates.Escape;

    let obj = this.notepad.children[this.state];

    let checkItem = function (id) {
        if (pc.app.player.interact.rightItem != null) return pc.app.player.interact.rightItem.id == id;
        else return false;
    }

    switch (this.state) {
        case ObjectiveStates.UnlockBasement:
            obj.findByName("Find").enabled = !checkItem(Item.KeyRed);
            break;

        case ObjectiveStates.StopLeak: break;

        case ObjectiveStates.CutFence:
            obj.findByName("Find").enabled = !checkItem(Item.Cutter);
            break;

        case ObjectiveStates.PowerTower: break;

        case ObjectiveStates.PlaceGreenFusion:
            obj.findByName("Find").enabled = !checkItem(Item.GreenFusion);
            obj.findByName("Go").enabled = checkItem(Item.GreenFusion);
            obj.findByName("Place").enabled = checkItem(Item.GreenFusion);
            break;

        case ObjectiveStates.OpenLockedCase: break;

        case ObjectiveStates.PlaceBlueFusion:
            obj.findByName("Find").enabled = !checkItem(Item.Fusion);
            obj.findByName("Go").enabled = checkItem(Item.Fusion);
            obj.findByName("Place").enabled = checkItem(Item.Fusion);
            break;

        case ObjectiveStates.UnlockDoor:
            obj.findByName("Find").enabled = !checkItem(Item.Wrench);
            break;

        case ObjectiveStates.PlaceYellowFusion:
            obj.findByName("Find").enabled = !checkItem(Item.YellowFusion);
            obj.findByName("Go").enabled = checkItem(Item.YellowFusion);
            obj.findByName("Place").enabled = checkItem(Item.YellowFusion);
            break;

        default:
            break;
    }

    obj.enabled = true;
};

TutorialManager.prototype.restart = async function () {
    if (!this.app.gameEnded) return;
    if (this.isRestarting) return;

    if (this.app.gamePlayStarted) {
        this.app.gamePlayStarted = false;
        PokiSDK.gameplayStop();
    }

    this.isRestarting = true;
    this.app.ambienceManager.stop();
    this.app.musicPlayer.stop();
    if (this.app.room) await this.app.room.leave();
    this.app.scenes.changeScene('Chapter1');
    this.app.gameEnded = false;
}

TutorialManager.prototype.update = function (dt) {
    if (this.app.gameEnded && pc.app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) {
        this.restart();
    }
}