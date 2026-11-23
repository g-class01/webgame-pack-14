var PlayerInventory = pc.createScript('playerInventory');
PlayerInventory.attributes.add("slotParent", { type: "entity" });
PlayerInventory.attributes.add("slotTemplate", { type: "asset", assetType: "template" });

PlayerInventory.prototype.initialize = function () {
    if (this.app.items == null) {
        this.app.items = new Storage("Powerups", {
            list: []
        })
    }

    this.controller = this.entity.script.playerController;
    this.powerup = this.entity.script.playerPowerup;

    this.slots = [];

    this.currentSlot = null;
    this.maxSlots = 9;

    this.activeItem = () => this.currentSlot?.item;

    this.app.keyboard.on(pc.EVENT_KEYDOWN, this.onKeyDown, this);

    this.app.on("BecomeSpider", this.onBecomeSpider, this);
    this.app.on("BecomeHuman", this.onBecomeHuman, this);

    // yükleme postInitialize'da: bazı sahnelerde (Lobby) Player, app.itemDatabase / app.player'ı kuran
    // LoadManager'dan önce başlıyor; burada yüklenince hata veriyordu. O zamana kadar boş liste kayda yazılmasın.
    this.saveLock = true;

    this.entity.on("destroy", () => {
        this.app.keyboard.off(pc.EVENT_KEYDOWN, this.onKeyDown, this);

        this.app.off("BecomeSpider", this.onBecomeSpider, this);
        this.app.off("BecomeHuman", this.onBecomeHuman, this);
    }, this);
};

PlayerInventory.prototype.postInitialize = function () {
    // lobide (mod seçme ekranı) envanter yok: yüklenmez, kayıtlı eşyalara da dokunulmaz (moda girince yüklenir)
    var ms = this.app.modeSelect;
    if (ms && ms.entity && !ms.entity._destroyed && PlayerInventory.sceneRoot(this.app, ms.entity) === PlayerInventory.sceneRoot(this.app, this.entity)) return;

    this.loadData();
};

PlayerInventory.sceneRoot = function (app, e) {
    while (e.parent && e.parent !== app.root) e = e.parent;
    return e;
};

PlayerInventory.prototype.onBecomeSpider = function () {
    this.slotParent.enabled = false;
    this.selectSlot(null);
};

PlayerInventory.prototype.onBecomeHuman = function () {
    this.slotParent.enabled = true;
};

PlayerInventory.prototype.checkItem = function (id) {
    let slot = this.slots.find(s => s.item.id == id);

    return slot != null;
}

PlayerInventory.prototype.checkUnusedItem = function (id) {
    let slot = this.slots.find(s => s.item.id == id);

    if (slot) {
        return slot.item.amount >= slot.item.startAmount;
    }
    else return false;
}

// Bu eşya şu an verilebilir mi (reklam/para istenmeden ÖNCE bakılır: ödül boşa gitmesin).
// Kullanılmamış aynısı varsa ya da envanter doluysa (ve eşya yoksa) uyarı verir, false döner.
PlayerInventory.prototype.canReceive = function (id, warn) {
    var msg = null;
    if (this.checkUnusedItem(id)) msg = "You already have this item!";
    else if (!this.checkItem(id) && this.slots.length >= this.maxSlots) msg = "Your inventory reached its slot limit!";
    if (msg && warn !== false) this.app.fire('WarningTextController:setWarning', msg, 5, new pc.Color(1, 0, 0, 1));
    return !msg;
};

PlayerInventory.prototype.addItem = function (id, overrideAmount = -1) {
    let item = this.app.itemDatabase.items.find(i => i.id == id);;
    if (item == undefined || item == null) return;
    item = Object.assign({}, item);

    // zaten olan eşya dolu envanterde de yenilenir (önce bakılır; ödül kaybolmasın)
    let slot = this.slots.find(s => s.item.id == item.id);

    if (!slot) {
        if (this.slots.length >= this.maxSlots) {
            this.app.fire('WarningTextController:setWarning', "Your inventory reached its slot limit!", 5, new pc.Color(1, 0, 0, 1));
            return;
        }
        slot = this.addSlot(item, overrideAmount);
    }

    slot.fire("Start");

    this.saveData();
};

PlayerInventory.prototype.removeItem = function (id) {
    for (let i = 0; i < this.slots.length; i++) {
        if (this.slots[i].item.id === id) {
            this.removeSlot(i);
            break;
        }
    }

    this.saveData();
};

PlayerInventory.prototype.addSlot = function (item, overrideAmount = -1) {
    if (this.slots.length >= this.maxSlots) return;

    item.startAmount = this.app.itemDatabase.items.find(i => i.id == item.id).amount;

    let slotEntity = this.slotTemplate.resource.instantiate();
    this.slotParent.addChild(slotEntity);

    let slot = slotEntity.script.inventorySlot;
    this.slots.push(slot);

    let itemEntity = item.template.resource.instantiate();

    let fpsEntity = null;
    if (item.fpsTemplate)
        fpsEntity = item.fpsTemplate.resource.instantiate();

    this.app.player.interact.leftHand.addChild(itemEntity);
    if (fpsEntity) this.app.player.fpsAnimator.left.addChild(fpsEntity);

    itemEntity.enabled = false;
    if (fpsEntity) fpsEntity.enabled = false;

    let renders = [...findAllRenderEntities(itemEntity), ...findAllRenderEntities(fpsEntity)];

    if (renders.length > 0) {
        for (let i = 0; i < renders.length; i++) {
            let r = renders[i];

            const worldLayer = this.app.scene.layers.getLayerByName('World');
            const playerLayer = this.app.scene.layers.getLayerByName('Player');

            r.render.layers = [
                worldLayer.id,
                playerLayer.id
            ];
        }
    }

    itemEntity.on("useItem", (val = 1) => {
        slot.item.amount -= val;

        if (slot.item.amount <= 0) {
            this.removeSlot(slot.index - 1);
            this.app.ui.setPowerup(null);
        }
        else
            this.app.ui.setPowerup(slot.item);

        this.saveData();
    })

    slot.on("Start", () => {
        itemEntity.fire("Start");

        slot.item.amount = slot.item.startAmount;
        console.log(slot.item.name, slot.item.startAmount);

        if (overrideAmount != -1 && !slot.overrided && !isNaN(overrideAmount) && !isNaN(slot.item.startAmount)) {
            if (overrideAmount > slot.item.startAmount + 10) {
                // HACKER
                window.localStorage.clear();
                location.reload();
                return;
            }

            slot.item.amount = overrideAmount;
            slot.overrided = true;
        }

        if (slot.selected)
            this.app.ui.setPowerup(slot.item);

        this.saveData();
    });

    slot.on("Removal", () => {
        itemEntity.fire("Removal");

        this.saveData();
    });

    slot.init(item, itemEntity, fpsEntity, this.slots.length);

    this.saveData();
    return slot;
};

PlayerInventory.prototype.removeSlot = function (index) {
    let slot = this.slots[index];
    if (slot.selected) {
        slot.deselect();
        this.currentSlot = null;
    }

    slot.fire("Removal");

    this.updateItemData();

    this.slotParent.removeChild(slot.entity);
    slot.entity.destroy();
    slot.itemEntity.destroy();
    if (slot.fpsEntity)
        slot.fpsEntity.destroy();

    for (let i = 0; i < slot.item.entities.length; i++) {
        let ent = this.app.player.entity.findByName(slot.item.entities[i]);
        ent.enabled = false;
    }

    this.slots.splice(index, 1);

    for (let i = 0; i < this.slots.length; i++) {
        this.slots[i].init(this.slots[i].item, this.slots[i].itemEntity, this.slots[i].fpsEntity, i + 1);
    }

    this.saveData();
};

PlayerInventory.prototype.onKeyDown = function (event) {
    if (this.app.isSpider || this.app.isProp() || this.app.player.controller.isGrabbedBySpider || this.app.isDied) return;

    let key = event.key;

    switch (key) {
        case pc.KEY_1: this.selectSlot(0); break;
        case pc.KEY_2: this.selectSlot(1); break;
        case pc.KEY_3: this.selectSlot(2); break;
        case pc.KEY_4: this.selectSlot(3); break;
        case pc.KEY_5: this.selectSlot(4); break;
        case pc.KEY_6: this.selectSlot(5); break;
        case pc.KEY_7: this.selectSlot(6); break;
        case pc.KEY_8: this.selectSlot(7); break;
        case pc.KEY_9: this.selectSlot(8); break;
    }
};

PlayerInventory.prototype.selectSlot = function (index) {
    if (index == null) {
        let oldSlot = this.currentSlot;
        if (oldSlot != null) {
            oldSlot.deselect();
            this.currentSlot = null;
            this.updateItemData();
            this.entity.sound.play("unequip");

            this.app.ui.setPowerup(null);
            return;
        }

        return;
    }

    if (this.app.isSpider || this.app.isProp() || this.app.player.controller.isGrabbedBySpider || this.app.isDied) return;

    if (index >= 0 && index < this.slots.length) {
        let oldSlot = this.currentSlot;

        let slot = this.slots[index];

        if (oldSlot == slot) {
            slot.deselect();
            this.currentSlot = null;
            this.updateItemData();
            this.entity.sound.play("unequip");

            this.app.ui.setPowerup(null);
            return;
        }

        if (oldSlot != null) {
            oldSlot.deselect();
        }

        slot.select();
        this.currentSlot = slot;

        this.app.ui.setPowerup(slot.item);

        this.entity.sound.play("equip");

        this.updateItemData();
    }
};

PlayerInventory.prototype.updateItemData = function () {
    if (!this.app.room) return;

    let id = -1;

    if (this.currentSlot != null && this.currentSlot.item != null) {
        id = this.currentSlot.item.id;
    }

    this.app.room.send("Client:LeftItem", {
        id: id,
    });

    this.saveData();
};

PlayerInventory.prototype.loadData = function () {
    this.saveLock = false;

    if (this.app.items.list.length > 0) {
        this.saveLock = true;

        for (let i = 0; i < this.app.items.list.length; i++) {
            let id = this.app.items.list[i].id;
            let amount = this.app.items.list[i].amount;

            this.addItem(id, amount);
        }

        setTimeout(() => {
            this.saveLock = false;
            this.saveData();
        }, 5);
    }
}

PlayerInventory.prototype.saveData = function () {
    if (this.saveLock) return;

    let data = this.slots
        .filter(s => s.item != null)
        .map(s => ({
            id: s.item.id,
            amount: s.item.amount
        }));

    this.app.items.list = data;
}