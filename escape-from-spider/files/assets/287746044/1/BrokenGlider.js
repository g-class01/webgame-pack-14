var BrokenGlider = pc.createScript('brokenGlider');
BrokenGlider.attributes.add("seatEntity", { type: "entity" });
BrokenGlider.attributes.add("wingEntity", { type: "entity" });
BrokenGlider.attributes.add("wheelEntities", { type: "entity", array: true });
BrokenGlider.attributes.add("propellerEntity", { type: "entity" });
BrokenGlider.attributes.add("engineEntity", { type: "entity" });
BrokenGlider.attributes.add("normalMat", { type: "asset", assetType: "material" });
BrokenGlider.attributes.add("transparentMat", { type: "asset", assetType: "material" });

BrokenGlider.prototype.initialize = function () {
    this.indicator = this.entity.findByName("Indicator");
    this.countText = this.entity.findByName("CountText");

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle), this);

    this.app.brokenGlider = this;
    this.entity.canInteract = true;

    this.pieces = [false, false, false, false, false, false, false];
    this.pieceEntities = [this.seatEntity, this.wingEntity, ...this.wheelEntities, this.propellerEntity, this.engineEntity];
    this.setPieces(this.pieces);
    this.complete = false;
};

BrokenGlider.prototype.interact = function (playerInteract) {
    if (this.complete && this.app.tutorialManagerThree.state == ObjectiveStatesThree.Escape) {
        // finish game
        this.entity.canInteract = false;
        this.app.player.interact.refresh();
        toggleIndicator(this, false);

        this.app.tutorialManagerThree.endGame();
        return;
    }

    if (this.app.tutorialManagerThree.state != ObjectiveStatesThree.RebuildGlider) {
        this.app.fire('WarningTextController:setWarning', "Finish other tasks first!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    if (!playerInteract.rightItem || (Item.GliderSeat != playerInteract.rightItem.id && Item.GliderWing != playerInteract.rightItem.id
        && Item.GliderWheel != playerInteract.rightItem.id && Item.GliderPropeller != playerInteract.rightItem.id && Item.GliderEngine != playerInteract.rightItem.id)) {
        this.app.fire('WarningTextController:setWarning', "You need a glider piece to place!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    let alreadyHas = false;
    let itemId = playerInteract.rightItem.id;
    if (itemId == 34 && this.pieces[0] == true) { // seat
        alreadyHas = true;
    }
    if (itemId == 35 && this.pieces[1] == true) { // wing
        alreadyHas = true;
    }
    if (itemId == 36 && (this.pieces[2] == true && this.pieces[3] == true && this.pieces[4] == true)) { // wheels
        alreadyHas = true;
    }
    if (itemId == 37 && this.pieces[5] == true) { // propeller
        alreadyHas = true;
    }
    if (itemId == 38 && this.pieces[6] == true) { // engine
        alreadyHas = true;
    }

    if (alreadyHas) {
        this.app.fire('WarningTextController:setWarning', "Glider already has this piece!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    this.complete = this.pieces.every(value => value === true);

    this.app.currentInteractable.entity.enabled = false;

    if (this.app.room) {
        this.app.room.send("BrokenGlider:Place", { id: playerInteract.rightItem.id });
    }
    else {
        this.place(playerInteract.rightItem.id);
    }

    this.app.player.interact.setRightHand(null);
};

BrokenGlider.prototype.place = function (id) {
    if (id == Item.GliderSeat && !this.pieces[0]) { // seat
        this.pieces[0] = true;
    }
    if (id == Item.GliderWing && !this.pieces[1]) { // wing
        this.pieces[1] = true;
    }
    if (id == Item.GliderWheel && (!this.pieces[2] || !this.pieces[3] || !this.pieces[4])) { // wheels
        for (let i = 2; i < 5; i++) {
            if (this.pieces[i] == false) {
                this.pieces[i] = true;
                break;
            }
        }
    }
    if (id == Item.GliderPropeller && !this.pieces[5]) { // propeller
        this.pieces[5] = true;
    }
    if (id == Item.GliderEngine && !this.pieces[6]) { // engine
        this.pieces[6] = true;
    }

    this.complete = this.pieces.every(value => value === true);
}

BrokenGlider.prototype.setPieces = function (piecesArray) {
    // seat, wing, wheel0, wheel1, wheel2, propeller, engine
    this.pieces = piecesArray;

    for (let i = 0; i < this.pieceEntities.length; i++) {
        let entity = this.pieceEntities[i];
        if (!entity || !entity.render.meshInstances[0] || !entity.render.meshInstances[0].material) continue;
        entity.render.meshInstances[0].material = piecesArray[i] ? this.normalMat.resource : this.transparentMat.resource;
    }

    if (!this.complete) {
        this.complete = piecesArray.every(v => v == true);
        //this.countText.enabled = !this.complete;

        if (this.complete) {
            this.onComplete();
        }
    }

    let pieceCount = piecesArray.filter(p => p == true).length;

    this.app.fire("RefreshTutorial");
    this.countText.element.text = pieceCount + "/" + this.pieces.length;

}

BrokenGlider.prototype.onComplete = function () {
    this.app.player.interact.refresh();
    toggleIndicator(this, false);

    this.entity.findByName("PickupText").element.text = "Escape";

    this.app.musicPlayer.stop();
    this.app.musicPlayer.entity.sound.play("rushMusic");

    this.app.fire('WarningTextController:setWarning', "Glider is rebuilded, enter it and escape!", 5, new pc.Color(0, 1, 0, 1));
}