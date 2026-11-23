var InventorySlot = pc.createScript('inventorySlot');
InventorySlot.attributes.add("selectedEntity", { type: "entity" })
InventorySlot.attributes.add("nameEntity", { type: "entity" })
InventorySlot.attributes.add("imageEntity", { type: "entity" })
InventorySlot.attributes.add("indexEntity", { type: "entity" })

InventorySlot.prototype.init = function (item, itemEntity, fpsEntity, index) {
    this.playerInventory = this.app.player.inventory

    this.item = item;
    this.index = index;
    this.item.slot = this;

    this.itemEntity = itemEntity;
    this.fpsEntity = fpsEntity;
    this.itemEntity.slot = this;
    this.itemEntity.model = this.itemEntity.findByName("Model");

    this.selected = false;

    if (item.texture != null) {
        let tex = this.app.assets.get(item.texture);
        if (tex.loaded) {
            this.imageEntity.enabled = true;
            this.imageEntity.element.texture = tex.resource;
        }
        else {
            this.app.assets.load(tex);
            tex.ready((asset) => {
                this.imageEntity.enabled = true;
                this.imageEntity.element.texture = asset.resource;
            });
        }
    }
    else {
        this.nameEntity.enabled = true;
        this.nameEntity.element.text = this.item.name;
    }

    this.indexEntity.element.text = index;

    this.entity.button.off("click");
    this.entity.button.on("click", () => {
        this.playerInventory.selectSlot(index - 1);
    });

    this.app.on("EnterFPS", this.enterFps, this);
    this.app.on("ExitFPS", this.exitFps, this);

    this.app.on("LockedCaseOpen", this.lockedCaseOpen, this);
    this.app.on("LockedCaseClose", this.lockedCaseClose, this);

    this.entity.on("destroy", () => {
        this.app.off("EnterFPS", this.enterFps, this);
        this.app.off("ExitFPS", this.exitFps, this);

        this.app.off("LockedCaseOpen", this.lockedCaseOpen, this);
        this.app.off("LockedCaseClose", this.lockedCaseClose, this);
    }, this);
};

InventorySlot.prototype.select = function () {
    if (this.selected) return;

    this.selected = true;
    this.selectedEntity.enabled = true;

    this.itemEntity.enabled = true;
    this.itemEntity.fire("Enabled");

    if (this.itemEntity.model)
        this.itemEntity.model.enabled = !this.app.isFPS;

    if (this.fpsEntity)
        this.fpsEntity.enabled = this.app.isFPS;

    for (let i = 0; i < this.item.entities.length; i++) {
        let ent = this.app.player.entity.findByName(this.item.entities[i]);
        ent.enabled = !this.app.isFPS;
    }

    this.entity
        .tween(this.entity.getLocalScale())
        .to(new pc.Vec3(1.15, 1.15, 1.15), .25, pc.SineOut)
        .start();

    this.indexEntity
        .tween(this.indexEntity.getLocalEulerAngles())
        .rotate(new pc.Vec3(0, 0, -7.5), .25, pc.SineOut)
        .start();
};

InventorySlot.prototype.deselect = function () {
    if (!this.selected) return;

    this.selected = false;
    this.selectedEntity.enabled = false;

    this.itemEntity.enabled = false;
    if (this.fpsEntity)
        this.fpsEntity.enabled = false;
    this.itemEntity.fire("Disabled");

    for (let i = 0; i < this.item.entities.length; i++) {
        let ent = this.app.player.entity.findByName(this.item.entities[i]);
        ent.enabled = false;
    }

    this.entity
        .tween(this.entity.getLocalScale())
        .to(new pc.Vec3(1, 1, 1), .25, pc.SineOut)
        .start();

    this.indexEntity
        .tween(this.indexEntity.getLocalEulerAngles())
        .rotate(new pc.Vec3(0, 0, 0), .25, pc.SineOut)
        .start();
};

InventorySlot.prototype.enterFps = function () {
    if (!this.selected) return;

    if (this.itemEntity.model)
        this.itemEntity.model.enabled = false;

    for (let i = 0; i < this.item.entities.length; i++) {
        let ent = this.app.player.entity.findByName(this.item.entities[i]);
        ent.enabled = false;
    }

    if (this.fpsEntity)
        this.fpsEntity.enabled = true;
}

InventorySlot.prototype.exitFps = function () {
    if (!this.selected) return;

    if (this.itemEntity.model)
        this.itemEntity.model.enabled = true;

    for (let i = 0; i < this.item.entities.length; i++) {
        let ent = this.app.player.entity.findByName(this.item.entities[i]);
        ent.enabled = true;
    }

    if (this.fpsEntity)
        this.fpsEntity.enabled = false;
}

InventorySlot.prototype.lockedCaseOpen = function () {
    if (!this.selected) return;

    if (this.itemEntity.model)
        this.itemEntity.model.enabled = false;

    for (let i = 0; i < this.item.entities.length; i++) {
        let ent = this.app.player.entity.findByName(this.item.entities[i]);
        ent.enabled = false;
    }

    if (this.fpsEntity)
        this.fpsEntity.enabled = false;
}

InventorySlot.prototype.lockedCaseClose = function () {
    if (!this.selected) return;

    if (this.itemEntity.model)
        this.itemEntity.model.enabled = !this.app.isFPS;

    for (let i = 0; i < this.item.entities.length; i++) {
        let ent = this.app.player.entity.findByName(this.item.entities[i]);
        ent.enabled = this.app.isFPS;
    }

    if (this.fpsEntity)
        this.fpsEntity.enabled = this.app.isFPS;
}