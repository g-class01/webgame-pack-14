var Ladder = pc.createScript('ladder');

Ladder.prototype.initialize = function () {
    this.indicator = this.entity.findByName("Indicator");
    this.piecesParent = this.entity.findByName("Pieces");
    this.interactableLadder = this.entity.findByName("InteractableLadder");

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle), this);

    this.app.ladder = this;
    this.entity.canInteract = true;

    this.pieces = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.setPieces(this.pieces);
    this.complete = false;
};

Ladder.prototype.interact = function (playerInteract) {
    if (this.complete) {
        return;
    }

    //this.app.room.send("Ladder:Place", { id: Item.WoodPiece });
    //return;

    if (!playerInteract.rightItem || (Item.WoodPiece != playerInteract.rightItem.id && Item.MetalPiece != playerInteract.rightItem.id && Item.IronPiece != playerInteract.rightItem.id)) {
        this.app.fire('WarningTextController:setWarning', "You need a wood, metal or iron piece to place!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    if (this.app.room) {
        this.app.room.send("Ladder:Place", { id: playerInteract.rightItem.id });
    }
    else {
        this.place(playerInteract.rightItem.id);
    }

    this.app.currentInteractable.entity.enabled = false;
    this.app.player.interact.setRightHand(null);
    this.app.fire("RefreshTutorial");
};

Ladder.prototype.place = function (id) {
    let pieceType = 0;
    let itemId = Number(id);

    if (!itemId || isNaN(itemId)) return;
    if (itemId != Item.WoodPiece && itemId != Item.MetalPiece && itemId != Item.IronPiece) return;

    switch (itemId) {
        case Item.WoodPiece: pieceType = 1; break;
        case Item.MetalPiece: pieceType = 2; break;
        case Item.IronPiece: pieceType = 3; break;
    }

    for (let i = 0; i < this.pieces.length; i++) {
        if (this.pieces[i] <= 0) {
            this.pieces[i] = pieceType;
            break;
        }
    }

    this.setPieces(this.pieces);
}

Ladder.prototype.setPieces = function (piecesArray) {
    this.pieces = piecesArray;

    for (let i = 0; i < this.pieces.length; i++) {
        for (let j = 0; j < this.piecesParent.children[i].children.length; j++) {
            this.piecesParent.children[i].children[j].enabled = j == this.pieces[i];
        }
    }

    if (!this.complete) {
        this.complete = this.pieces.every(p => p > 0);

        if (this.complete) {
            this.entity.canInteract = false;
            this.app.player.interact.refresh();
            toggleIndicator(this, false);

            this.interactableLadder.enabled = true;
            this.app.fire('WarningTextController:setWarning', "Ladder is fixed!", 3, new pc.Color(1, 1, 1, 1));
            this.app.fire("RefreshTutorial");
        }
    }
}