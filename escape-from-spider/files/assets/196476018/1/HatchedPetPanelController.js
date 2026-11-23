var HatchedPetPanelController = pc.createScript('hatchedPetPanelController');
HatchedPetPanelController.attributes.add('egg', { type: 'entity' });
HatchedPetPanelController.attributes.add('pet', { type: 'entity' });
HatchedPetPanelController.attributes.add('petname', { type: 'entity' });
HatchedPetPanelController.attributes.add('blackBackground', { type: 'entity' });
HatchedPetPanelController.attributes.add('radialSun', { type: 'entity' });
HatchedPetPanelController.attributes.add('whiteFlash', { type: 'entity' });
HatchedPetPanelController.attributes.add('petImages', { type: 'asset', assetType: "texture", array: true });

// initialize code called once per entity
HatchedPetPanelController.prototype.initialize = function () {
    this.petManager = this.app.root.findByName("PetManager").script.petManager;
    this.soundManager = this.app.root.findByName("SoundManager");

    this.app.on("HatchedPetController:hatchedPet", this.hatchedPet, this);
    this.app.on("HatchedPetController:hatchedPet10x", this.hatchedPet10x, this);

    this.on('destroy', function () {
        this.app.off('HatchedPetController:hatchedPet', this.hatchedPet, this);
        this.app.off('HatchedPetController:hatchedPet10x', this.hatchedPet10x, this);
    }, this);
};

HatchedPetPanelController.prototype.hatchedPet10x = function (hatchedPetTypes) {
    this.hatchedPet10xFunc(hatchedPetTypes, 0, true);
};

HatchedPetPanelController.prototype.hatchedPet10xFunc = function (hatchedPet, index = 0) {
    if (index >= 10) {
        return;
    }
    this.hatchedPet(hatchedPet[index]).then(() => {
        this.hatchedPet10xFunc(hatchedPet, index + 1);
    });
};

HatchedPetPanelController.prototype.hatchedPet = function (hatchedPet) {
    return new Promise((resolve) => {
        this.app.isHatching = true;
        if (this.tween0)
            this.tween0.stop();
        if (this.tween1)
            this.tween1.stop();
        if (this.tween2)
            this.tween2.stop();
        if (this.tween3)
            this.tween3.stop();
        if (this.tween4)
            this.tween4.stop();
        if (this.tween5)
            this.tween5.stop();
        if (this.tween6)
            this.tween6.stop();
        if (this.tween7)
            this.tween7.stop();
        if (this.tween8)
            this.tween8.stop();
        if (this.tween9)
            this.tween9.stop();
        if (this.tween10)
            this.tween10.stop();

        this.petname.element.color = this.petManager.getRarityColor(hatchedPet);
        this.petname.element.text = hatchedPet.name + " (" + hatchedPet.percentage + "%)";
        this.egg.enabled = true;
        //set black background
        this.blackBackground.enabled = true;
        this.data = { value: 0 };
        this.tween0 = this.blackBackground
            .tween(this.data).to({ value: 0.7 }, 0.2, pc.SineOut)
            .onUpdate((dt) => {
                this.blackBackground.element.opacity = this.data.value;
            })
            .start();

        this.pet.enabled = false;
        this.pet.setLocalPosition(0, 0, 0);
        this.egg.element.opacity = 1;
        this.egg.setLocalPosition(0, 500, 0);
        this.egg.setLocalScale(1, 1, 1);
        this.whiteFlash.element.opacity = 0;
        this.whiteFlash.enabled = false;
        const targetPos = new pc.Vec3(0, 0, 0);
        this.soundManager.sound.play("egg1");
        this.egg.setLocalRotation(new pc.Quat().setFromEulerAngles(0, 0, 0));
        this.tween1 = this.egg.tween(this.egg.getLocalPosition())
            .to(targetPos, 0.7, pc.SineOut)
            .onComplete(() => {
                this.soundManager.sound.play("egg2");
                this.tween2 = this.egg.tween(this.egg.getLocalRotation())
                    .to(new pc.Quat().setFromEulerAngles(0, 0, 35), 0.1, pc.QuinticOut)
                    .yoyo(true)
                    .repeat(2)
                    .onComplete(() => {
                        this.soundManager.sound.play("egg2");
                        this.tween3 = this.egg.tween(this.egg.getLocalRotation())
                            .to(new pc.Quat().setFromEulerAngles(0, 0, -35), 0.1, pc.QuinticOut)
                            .yoyo(true)
                            .repeat(2)

                            .onComplete(() => {
                                this.soundManager.sound.play("egg2");
                                this.tween4 = this.egg.tween(this.egg.getLocalRotation())
                                    .to(new pc.Quat().setFromEulerAngles(0, 0, 35), 0.1, pc.QuinticOut)
                                    .yoyo(true)
                                    .repeat(2)

                                    .onComplete(() => {
                                        this.soundManager.sound.play("egg4");
                                        this.tween5 = this.egg.tween(this.egg.getLocalScale())
                                            .to(new pc.Vec3(0.5, 0.5, 0.5), 0.7, pc.SineOut)  // Yumurta küçülüyor
                                            .onComplete(() => {
                                                this.soundManager.sound.play("egg3");
                                                //flash
                                                this.flashData = { value: 0 };
                                                this.whiteFlash.element.opacity = 0;
                                                this.whiteFlash.enabled = true;
                                                this.tween6 = this.whiteFlash
                                                    .tween(this.flashData).to({ value: 1 }, 0.3, pc.Linear)
                                                    .onUpdate((dt) => {
                                                        this.whiteFlash.element.opacity = this.flashData.value;
                                                    })
                                                    .onComplete(() => {
                                                        this.whiteFlash.enabled = false;
                                                    })
                                                    .yoyo(true)
                                                    .repeat(2)
                                                    .start();

                                                this.tween7 = this.egg.tween(this.egg.getLocalScale())
                                                    .to(new pc.Vec3(1.5, 1.5, 1.5), 0.2, pc.SineOut)  // Yumurta birden büyüyor
                                                    .onUpdate((dt) => {
                                                        this.egg.element.opacity -= dt * 5;
                                                    })
                                                    .onComplete(() => {
                                                        // Yumurta kırıldı, pet ekrana geliyor

                                                        let petImageAsset = this.app.assets.get(hatchedPet.thumbnailId);
                                                        if (petImageAsset.loaded) {
                                                            this.pet.children[1].element.texture = petImageAsset.resource;
                                                        } else {
                                                            this.app.assets.load(petImageAsset);
                                                            petImageAsset.ready((asset) => {
                                                                this.pet.children[1].element.texture = asset.resource;
                                                            });
                                                        }

                                                        this.pet.setLocalScale(0, 0, 0);
                                                        this.pet.enabled = true;
                                                        if (hatchedPet.rarity == 2)
                                                            this.soundManager.sound.play("epicPetFound");
                                                        else if (hatchedPet.rarity == 3)
                                                            this.soundManager.sound.play("legenderyPetFound");
                                                        else if (hatchedPet.rarity == 4)
                                                            this.soundManager.sound.play("legenderyPetFound");
                                                        this.tween8 = this.pet.tween(this.pet.getLocalScale())
                                                            .to(new pc.Vec3(1, 1, 1), 0.4, pc.SineOut)
                                                            .onComplete(() => {
                                                                // Oyuncu çıkan peti görsün diye bir gecikme tween'i
                                                                this.data = { value: 0.7 };
                                                                this.tween9 = this.blackBackground
                                                                    .tween(this.data).to({ value: 0 }, 0.2, pc.SineOut)
                                                                    .onUpdate((dt) => {
                                                                        this.blackBackground.element.opacity = this.data.value;
                                                                    })
                                                                    .onComplete(() => {
                                                                        this.blackBackground.enabled = false;
                                                                        this.pet.enabled = false;
                                                                        this.egg.enabled = false;
                                                                    })
                                                                    .delay(1)
                                                                    .start();

                                                                this.tween10 = this.pet.tween(this.pet.getLocalPosition())
                                                                    .to(new pc.Vec3(0, 1000, 0), 1, pc.ElasticIn)
                                                                    .onComplete(() => {
                                                                        // Tamamlandığında yapılacak işlemler
                                                                        this.app.isHatching = false;
                                                                        resolve();
                                                                    })
                                                                    .delay(0.2)
                                                                    .start();
                                                            })
                                                            .start();
                                                    })
                                                    .start();
                                            })
                                            .start();
                                    })
                                    .start();
                            })
                            .start();
                    })
                    .start();
            })
            .start();
    });
};