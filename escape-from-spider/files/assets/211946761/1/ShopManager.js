var ShopManager = pc.createScript('shopManager');
ShopManager.attributes.add("camera", { type: "entity" })
ShopManager.attributes.add("shopEntity", { type: "entity" })
ShopManager.attributes.add("rewardedButtonEntity", { type: "entity" })
ShopManager.attributes.add("skinSlotTemplate", { type: "asset", assetType: "template" })
ShopManager.attributes.add("hatSlotTemplate", { type: "asset", assetType: "template" })
ShopManager.attributes.add("faceSlotTemplate", { type: "asset", assetType: "template" })
ShopManager.attributes.add("powerupSlotTemplate", { type: "asset", assetType: "template" })

ShopManager.prototype.initialize = function () {
    ShopData.Init();

    this.app.shop = this;

    this.activePanel = null;

    this.slotTemplates = {
        [ShopData.Type.Skin]: this.skinSlotTemplate,
        [ShopData.Type.Hat]: this.hatSlotTemplate,
        [ShopData.Type.Face]: this.faceSlotTemplate,
        [ShopData.Type.Powerup]: this.powerupSlotTemplate,
    }

    this.rewardedButtonEntity.button.on("click", () => {
        watchRewarded(() => {
            this.app.coinManager.addCoin(250);
            this.rewardedButtonEntity.enabled = false;
        })
    });
};

ShopManager.prototype.postInitialize = function () {
    this.mannequin = {
        entity: this.camera.findByName("Mannequin"),
        avatar: pc.app.player.getAvatar().clone(),
        baseAvatar: pc.app.player.getAvatar().clone(),
        reload: () => this.reloadMannequin(),
        playEffect: (rotate) => this.mannequinEffect(rotate),
        skin: this.camera.findByName("MannequinSkin").findByName("Skin"),
        hat: this.camera.findByName("MannequinSkin").findByName("Hat"),
        face: this.camera.findByName("Mannequin").findByName("FaceSprite"),
        particle: this.camera.findByName("Particle"),
    }

    this.initEntities();
    this.initEvents();
    // Panels are built on the first open: the 39 slots and their thumbnails
    // (~25 MB of textures) used to be created in every scene even if the shop
    // was never opened.
}

ShopManager.prototype.initEntities = function () {
    this.buyButton = this.shopEntity.findByName("BuyButton");
    this.buyButton.text = this.buyButton.findByName("Text");
    this.buyButton.adImage = this.buyButton.findByName("AdImage");
    this.closeButton = this.shopEntity.findByName("ShopClose");
    this.colorPickButton = this.shopEntity.findByName("ColorPickButton");
    this.colorPickPanel = this.shopEntity.findByName("ColorPickPanel");
    this.colorPickPanel.closeButton = this.colorPickPanel.findByName("CloseButton");
    this.colorPickPanel.slotParent = this.colorPickPanel.findByName("Content");
}

ShopManager.prototype.initEvents = function () {
    this.closeButton.button.on("click", () => {
        this.app.fire("CloseMenu");
    });

    this.buyButton.button.on("click", () => {
        this.onBuyOrEquip(this.buyButton.text.element.text == "Buy");
    });

    this.colorPickButton.button.on("click", () => {
        let data = ShopData.getSelected();
        if (!data || !data.colorVariants || data.colorVariants.length <= 0) return;

        this.openColorPanel(data);
    });

    this.colorPickPanel.closeButton.button.on("click", () => {
        this.openColorPanel(null);
    });

    eventSubscribe(this, "ShopOpen", this.onOpen);
    eventSubscribe(this, "ShopClose", this.onClose);
    eventSubscribe(this, "OpenShop", this.open);
}

ShopManager.prototype.open = function () {
    this.app.fire("OpenMenu", "Shop")
}

ShopManager.prototype.initPanels = function () {
    this.panels = {};

    const types = [
        { type: ShopData.Type.Skin, name: "Skin" },
        { type: ShopData.Type.Hat, name: "Hat" },
        { type: ShopData.Type.Face, name: "Face" },
        { type: ShopData.Type.Powerup, name: "Powerup" },
    ];

    types.forEach(({ type, name }) => {
        this.panels[type] = {
            type: type,
            name: name,
            entity: this.shopEntity.findByName(`${name}Panel`),
            button: this.shopEntity.findByName(`${name}PanelButton`),
            slotParent: this.shopEntity.findByName(`${name}Slots`),
            slotTemplate: this.slotTemplates[type],
            list: ShopData.Lists[type],
            reload: () => this.reloadPanel(type),
        };

        let panel = this.panels[type];

        for (let i = 0; i < panel.list.length; i++) {
            let data = panel.list[i];

            data.slot = panel.slotTemplate.resource.instantiate();
            data.slot.reparent(panel.slotParent);
            data.slot.data = data;

            this.loadSlot(data);
        }

        panel.button.button.on("click", () => this.openPanel(panel.type));
    });

    this.openPanel(ShopData.Type.Skin);
}

ShopManager.prototype.onOpen = function () {
    if (!this.panels) this.initPanels();
    this.reload();
    this.toggle(true);
    this.playSound("popup");

    if (this.app.gamePlayStarted) {
        this.app.gamePlayStarted = false;
        PokiSDK.gameplayStop();
    }
}

ShopManager.prototype.onClose = function () {
    watchCommercial(() => {
        this.toggle(false);
        this.playSound("closepopup");
    });
}

ShopManager.prototype.reload = function () {
    this.activePanel.reload();
    this.mannequin.reload();
}

ShopManager.prototype.toggle = function (toggle) {
    this.app.marketEnabled = toggle;
    this.camera.enabled = toggle;
}

ShopManager.prototype.reloadMannequin = async function () {
    let skin = await this.mannequin.avatar.skin.getAsset();
    let hat = await (ShopData.hatFor ? ShopData.hatFor(this.mannequin.avatar.skin, this.mannequin.avatar.hat) : this.mannequin.avatar.hat).getAsset();   // saçlı skinde şapka yerine saç
    let face = await this.mannequin.avatar.face.getAsset();

    //this.mannequin.skin.render.asset = await skin;
    //this.mannequin.hat.render.asset = await hat;
    //this.mannequin.face.render.meshInstances[0].material = await face;
    if (skin && skin.resource) this.mannequin.skin.render.asset = skin;
    if (hat && hat.resource) this.mannequin.hat.render.asset = hat;
    if (this.mannequin.face.render && this.mannequin.face.render.meshInstances && this.mannequin.face.render.meshInstances[0] && face) {
        this.mannequin.face.render.meshInstances[0].material = face;
    } else {
        console.warn("⚠️ Mannequin face asset is missing or not loaded!", face);
    }
}

ShopManager.prototype.playSound = function (soundName, randomPitch = false) {
    if (this.entity.sound == null) return;
    this.slot = this.entity.sound.slot(soundName);
    if (this.slot == null) return;
    if (randomPitch) {
        this.slot.pitch = pc.math.random(0.8, 1.2);
    }
    this.slot.play();
};

ShopManager.prototype.openPanel = function (dataType) {
    if (this.activePanel) this.activePanel.entity.enabled = false;

    if (!this.mannequin.avatar.equals(this.mannequin.baseAvatar)) {
        this.mannequin.avatar = this.mannequin.baseAvatar.clone();
        this.mannequin.reload();
    }

    this.selectSlot(null);

    this.activePanel = this.panels[dataType];
    this.activePanel.reload();
    this.activePanel.entity.enabled = true;
    this.playSound("openPanel", true);
}

ShopManager.prototype.reloadPanel = function (dataType) {
    let panel = this.panels[dataType];
    let list = ShopData.Lists[dataType];
};

ShopManager.prototype.loadSlot = async function (data) {
    let slot = data.slot;

    slot.activeItem = slot.findByName("ActiveItem");
    slot.selectedItem = slot.findByName("SelectedItem");
    slot.image = slot.findByName("Image");
    slot.priceArea = slot.findByName("PriceArea");
    slot.priceImage = slot.priceArea.findByName("Image");
    slot.priceText = slot.priceArea.findByName("Price");
    slot.adImage = slot.priceArea.findByName("AdImage");

    slot.image.element.texture = await data.getTexture();

    slot.activeItem.enabled = data.isEquipped;
    slot.selectedItem.enabled = data.isSelected;

    slot.priceArea.enabled = !data.isBought;
    slot.priceImage.enabled = !data.isAd;
    slot.adImage.enabled = data.isAd;
    slot.priceText.element.text = numRound(data.price);

    slot.button.off("click");
    slot.button.on("click", () => this.selectSlot(slot));
}

ShopManager.prototype.selectSlot = function (slot) {
    if (slot != null) {
        slot.data.isSelected = true;
        this.playSound("select", true);
        this.buyButton.parent.enabled = !slot.data.isBought || (slot.data.isBought && !slot.data.isEquipped);
        this.buyButton.text.element.text = !slot.data.isBought ? "Buy" : "Equip";
        this.buyButton.adImage.enabled = slot.data.isAd;

        this.colorPickButton.enabled = slot.data.colorVariants != null && slot.data.colorVariants.length > 0 && slot.data.isBought && slot.data.isEquipped;
    }
    else {
        ShopData.resetSelected();

        this.buyButton.parent.enabled = false;
        this.colorPickButton.enabled = false;
    }
}

ShopManager.prototype.onBuyOrEquip = function (isBuy, instantBuy = false) {
    let data = ShopData.getSelected();
    if (!data) return;

    let isPowerup = data.type == ShopData.Type.Powerup;

    if (isBuy && !instantBuy) {
        // güç eşyası verilemiyorsa (zaten var / envanter dolu) reklam ya da para istenmez
        if (isPowerup && this.app.player && this.app.player.inventory && !this.app.player.inventory.canReceive(data.assetId)) return;
        if (!data.isAd) {
            if (this.app.coin < data.price) {
                this.app.fire('WarningTextController:setWarning', "You don't have enough coins!", 5, new pc.Color(1, 0, 0, 1));
                return;
            }
            this.playSound("bought");
            this.app.fire("AddCoin", -data.price);
        }
        else {
            watchRewarded(() => {
                this.onBuyOrEquip(true, true);
            }, toAdSize(data.price))
            return;
        }
    } else if (isBuy && instantBuy) {
        this.playSound("bought");
    }
    else {
        this.playSound("equip");
    }

    if (!isPowerup) {
        this.mannequin.baseAvatar = this.mannequin.avatar.clone();
        ShopData.resetSelected();
        ShopData.resetEquipped(data.type);

        data.isBought = true;
        data.isEquipped = true;

        this.app.player.avatar = this.mannequin.avatar.clone();
        this.app.player.reloadAvatar();

        if (isBuy) this.mannequin.playEffect();
    }
    else if (isBuy) {
        ShopData.resetSelected();

        this.app.player.inventory.addItem(data.assetId);

        this.app.fire('WarningTextController:setWarning', "You bought " + data.name + " powerup!", 5, new pc.Color(0, 1, 0, 1));

        this.mannequin.playEffect(false);
    }

    this.selectSlot(null);
    ShopData.Save();
}

ShopManager.prototype.openColorPanel = async function (data) {
    if (!data) {
        this.colorPickPanel.enabled = false;
        return;
    }

    this.colorPickPanel.enabled = true;

    destroyChilds(this.colorPickPanel.slotParent);

    let spacings = {
        [ShopData.Type.Skin]: 50,
        [ShopData.Type.Hat]: -35,
    }

    this.colorPickPanel.slotParent.layoutgroup.spacing = new pc.Vec2(spacings[data.type], 25);

    for (let i = 0; i < data.colorVariants.length; i++) {
        let slot = this.slotTemplates[data.type].resource.instantiate();
        slot.data = data;
        slot.colorData = data.colorVariants[i];
        slot.index = i;

        this.colorPickPanel.slotParent.addChild(slot);

        let image = slot.findByName("Image");
        let priceArea = slot.findByName("PriceArea");

        priceArea.enabled = false;
        image.element.texture = await slot.colorData.getTexture();

        slot.button.on("click", () => {
            slot.data.activeColor = slot.index;

            this.mannequin.avatar[slot.data.type] = slot.colorData;
            this.mannequin.baseAvatar = this.mannequin.avatar.clone();
            this.mannequin.reload();

            this.app.player.avatar = this.mannequin.avatar.clone();
            this.app.player.reloadAvatar();

            this.openColorPanel(null);

            ShopData.Save();
        });
    }

    this.app.fire("contentchanged");
}

ShopManager.prototype.mannequinEffect = function (rotate = true) {
    if (rotate) {
        this.tweenProps = { yRot: 20 };

        this.app
            .tween(this.tweenProps)
            .to({ yRot: 380 }, 0.5, pc.SineOut)
            .onUpdate(() => this.mannequin.entity.setLocalRotation(getRotationQuat(this.tweenProps.yRot)))
            .onComplete(() => this.mannequin.entity.setLocalEulerAngles(0, 20, 0))
            .start();
    }

    this.mannequin.particle.particlesystem.reset();
    this.mannequin.particle.particlesystem.play();
};