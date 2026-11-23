var RemotePlayerController = pc.createScript('remotePlayerController');
RemotePlayerController.attributes.add("playerBody", { type: "entity" });
RemotePlayerController.attributes.add("camParent", { type: "entity" });
RemotePlayerController.attributes.add("username", { type: "entity" });
RemotePlayerController.attributes.add("leftHand", { type: "entity" });
RemotePlayerController.attributes.add("rightHand", { type: "entity" });
RemotePlayerController.attributes.add("spine", { type: "entity" });
RemotePlayerController.attributes.add("mainSkins", { type: "entity" });
RemotePlayerController.attributes.add("matEntity", { type: "entity" });
RemotePlayerController.attributes.add("protectShield", { type: "entity" });
RemotePlayerController.attributes.add("agarParent", { type: "entity" });
RemotePlayerController.attributes.add("agarPoints", { type: "entity" });

RemotePlayerController.prototype.initialize = function () {
    this.emoteParent = this.entity.findByName("EmoteParent");
    this.spiderUsername = this.entity.findByName("SpiderUsername");
    this.targetPos = new pc.Vec3(0, 0, 0);
    this.xRot = 0;
    this.yRot = 0;
    this.zRot = 0;

    this.yRotOffset = 180;
    //if (getCurrentChapter() == Chapters.Three) this.yRotOffset = 270;

    if (this.app.agar) {
        this.agarModels = this.agarParent.children;
    }

    this.camPos = new pc.Vec3(0, 0, 0);
    this.camEuler = new pc.Vec3(0, 0, 0);

    this.walk = false;
    this.idle = true;
    this.isInAir = false;
    this.isClimbing = false;
    this.isOnLadder = false;
    this.isAiming = false;
    this.isDied = false;
    this.caught = false;
    this.hit = false;
    this.sitting = false;
    this.isPlayerSpider = false;
    this.entity.isGrabbedBySpider = false;

    this.leftEntities = [];
    this.rightEntities = [];

    this.playerSpider = this.entity.findByName("PlayerSpider");
    this.playerRendererEntity = this.playerBody.findByName("Body");

    this.skin = this.mainSkins.findByName("Skin");
    this.hat = this.mainSkins.findByName("Hat");
    this.face = this.playerBody.findByName("FaceSprite");

    if (this.app.agar) {
        this.mainSkins.enabled = false;
        this.playerRendererEntity.enabled = false;
        this.face.enabled = false;
        // İskeletteki diğer yüz kopyaları da (newchar_face / FaceSprite) kapansın
        this.playerBody.find(e => e.name === "newchar_face" || e.name === "FaceSprite").forEach(e => { e.enabled = false; });
    }

    this.propObject = null;
    this.potionObjects = this.entity.findByName("PotionObjects");

    this.anim = this.playerBody.anim;

    this.app.on("ConnectionFailed", this.connectionFailed, this);

    this.eaten = false;
    this.eatenTimeout = null;

    this.entity.collision.on("triggerenter", (other) => {
        if (!other.tags.has("Player")) return;
        if (this.app.room && this.app.agar && this.app.exitzone) {
            if (this.eaten) return;

            if (this.app.player.controller.agarScale > this.agarScale) {
                this.app.room.send("Agar:EatPlayer", {
                    eatenPlayer: this.sessionId
                })

                this.eaten = true;

                this.eatenTimeout = setTimeout(() => {
                    this.eaten = false;
                }, 3000);
            }
        }
    });

    this.on('destroy', function () {
        //this.app.networkManager.localCamera.reparent(this.app.player.entity);
        //this.app.player.controller.resetSpectatingPlayer();
        this.app.off("ConnectionFailed", this.connectionFailed, this);
        clearTimeout(this.trapTimeout);
        clearTimeout(this.stunTimeout);
        clearTimeout(this.spiderAttackTimeout);
        clearTimeout(this.eatenTimeout);
    }, this);

};

RemotePlayerController.prototype.setFrozen = function (isFrozen) {
    if (this.app.agar) return;

    this.anim.enabled = !isFrozen;
    this.matEntity.render.meshInstances[0].material = isFrozen ? this.app.player.controller.frozenMat.resource : this.app.player.controller.defaultMat.resource;

    if (this.isPlayerSpider) {
        this.playerSpider.anim.enabled = !isFrozen;
        this.playerSpider.children[0].render.meshInstances[0].material = isFrozen ? this.app.player.controller.frozenMat.resource : this.app.player.controller.defaultMatSpider.resource;
    }

    if (this.app.networkManager.currentSceneName == "Catch") {
        setTimeout(() => {
            this.setFrozen(false);
        }, 5000);
    }
};

RemotePlayerController.prototype.update = function (dt) {
    if (this.isNoneLerp) {
        this.isNoneLerp = false;
        return;
    }

    if (this.isPlayerSpider) {
        this.app.playerSpiderDistance = this.entity.getPosition().distance(this.app.networkManager.localPlayer.getPosition());
    }

    this.animUpdate();

    //if player is free to move
    if (!this.networkData.isGrabbedBySpider || this.app.agar) {
        let pos = this.entity.getPosition().clone();
        if (pos.distance(this.targetPos) > 15) {
            this.entity.setPosition(this.targetPos);
        } else {
            let lerp = pos.lerp(pos, this.targetPos, dt * 8);
            this.entity.setPosition(lerp);
        }

        if (this.isPlayerSpider) {
            let rot = this.playerSpider.getLocalRotation().clone();
            let slerp = rot.slerp(rot, this.playerSpider.getRotation().clone().setFromEulerAngles(this.xRot, this.yRot, this.zRot), dt * 12);
            this.playerSpider.setLocalRotation(slerp);
        } else {
            let rot = this.playerBody.getLocalRotation().clone();
            let slerp = rot.slerp(rot, this.entity.getRotation().clone().setFromEulerAngles(0, this.yRot + this.yRotOffset, 0), dt * 15);
            this.playerBody.setLocalRotation(slerp);
        }
    }

    //username opacity lerp
    /*
    const localPlayerDistance = this.app.networkManager.localPlayer.getPosition().distance(this.entity.getPosition());
    if (localPlayerDistance >= 10 && localPlayerDistance <= 30) {
        const normalizedDistance = (localPlayerDistance - 10) / (30 - 10);
        this.username.element.opacity = 1 - normalizedDistance;
        this.username.element.outlineThickness = 1 - normalizedDistance;
    } else if (localPlayerDistance > 30) {
        this.username.element.opacity = 0;
        this.username.element.outlineThickness = 0;
    } else {
        this.username.element.opacity = 1;
        this.username.element.outlineThickness = 1;
    }
    */
};

RemotePlayerController.prototype.grabbedBySpider = function (state) {
    this.isGrabbedBySpider = state;
    this.entity.isGrabbedBySpider = state;
    if (state) {
        this.entity.setLocalPosition(0, 0, 0);
        this.playerBody.setLocalEulerAngles(0, 0, 0);
    } else {
        this.entity.reparent(pc.app.root);
        this.playerBody.setLocalEulerAngles(0, 0, 0);
        let pos;
        if (this.app.spiderPlayer) {
            pos = this.app.spiderPlayer.getPosition().clone();
        } else {
            pos = this.app.spiderController.entity.getPosition().clone();
        }
        pos.y += 1;
        this.teleport(pos);
    }
}

RemotePlayerController.prototype.becomeSpider = function () {
    if (this.isPlayerSpider == true) return;
    if (this.app.agar) return;

    if (this.propObject != null) {
        this.propObject.enabled = false;
        this.propObject = null;
    }

    this.isPlayerSpider = true;
    this.playerSpider.enabled = true;
    this.playerRendererEntity.enabled = false;
    this.face.enabled = false;
    this.mainSkins.enabled = false
    this.username.enabled = false;
    this.app.spiderPlayer = this.playerSpider;
    console.log("remote become spider")
};

RemotePlayerController.prototype.becomeHuman = function () {
    if (this.isPlayerSpider == false) return;
    if (this.app.agar) return;

    this.isPlayerSpider = false;
    this.playerSpider.enabled = false;
    this.playerRendererEntity.enabled = true;
    this.face.enabled = true;
    this.username.enabled = true;
    this.mainSkins.enabled = true
    this.entity.script.remotePlayerSoundController.playerChangedLocation(this.entity.location);
};

RemotePlayerController.prototype.trap = function (duration) {
    if (this.app.agar) return;

    this.trapped = true;
    this.playerSpider.anim.setBoolean("isTrapped", true);

    this.trapTimeout = setTimeout(() => {
        this.trapped = false;
        this.playerSpider.anim.setBoolean("isTrapped", false);
    }, duration * 1000);
};

RemotePlayerController.prototype.stun = function (duration) {
    if (this.app.agar) return;

    console.log("STUN PLAYER SPIDER")
    this.stunned = true;
    this.playerSpider.anim.setBoolean("isStunned", true);

    this.stunTimeout = setTimeout(() => {
        this.stunned = false;
        this.playerSpider.anim.setBoolean("isStunned", false);
    }, duration * 1000);
};

RemotePlayerController.prototype.animUpdate = function () {
    if (this.app.agar) {
        if (this.agarLevel !== null || this.agarLevel !== undefined)
            this.agarModels[this.agarLevel].anim.setBoolean("walk", this.walk);
        return;
    }

    this.playerBody.anim.setBoolean("walk", this.walk);
    this.playerBody.anim.setBoolean("idle", this.idle);
    this.playerBody.anim.setBoolean("isInAir", this.isInAir);
    this.playerBody.anim.setBoolean("isClimbing", this.isClimbing);
    this.playerBody.anim.setBoolean("isOnLadder", this.isOnLadder);
    this.playerBody.anim.setBoolean("isAiming", this.isAiming);
    this.playerBody.anim.setBoolean("isDied", this.isDied);
    this.playerBody.anim.setBoolean("caught", this.caught);
    this.playerBody.anim.setBoolean("hit", this.hit);
    this.playerBody.anim.setBoolean("sitting", this.sitting);
    if (this.isPlayerSpider) {
        this.playerSpider.anim.setBoolean("isRunning", this.walk);
    }
};

RemotePlayerController.prototype.setUsername = function (nick) {
    this.entity.username = nick;
    this.username.element.text = nick;
    if (this.app.agar) return;
    this.spiderUsername.element.text = nick;
};

RemotePlayerController.prototype.setLeftHand = function (itemId) {
    if (this.leftId && this.leftId == itemId) return;
    if (this.app.agar) return;

    for (let i = 0; i < this.leftEntities.length; i++) {
        this.leftEntities[i].enabled = false;
    }

    this.leftEntities = [];

    if (this.leftEntity)
        this.leftEntity.destroy();

    this.leftEntity = null;

    if (itemId == -1) return;

    let item = this.app.itemDatabase.items.find(i => i.id == itemId);
    this.leftEntity = item.template.resource.instantiate();
    this.leftHand.addChild(this.leftEntity);

    for (let i = 0; i < item.entities.length; i++) {
        let ent = this.entity.findByName(item.entities[i]);
        ent.enabled = true;
        this.leftEntities.push(ent);
    }
};

RemotePlayerController.prototype.setRightHand = function (itemId) {
    if (this.rightId && this.rightId == itemId) return;
    if (this.app.agar) return;

    if ((this.rightId != -1 || this.rightEntity != null)) {
        if (this.rightEntity)
            this.rightEntity.destroy();

        this.rightEntity = null;
    }

    if (itemId == -1) return;

    let item = this.app.itemDatabase.items.find(i => i.id == itemId);
    this.rightEntity = item.template.resource.instantiate();

    let parent = item.spineItem ? this.spine : this.rightHand;
    parent.addChild(this.rightEntity);
};

RemotePlayerController.prototype.teleport = function (pos) {
    this.isNoneLerp = true;
    this.entity.setPosition(pos.clone());
    this.targetPos = pos.clone();
};

RemotePlayerController.prototype.setProtected = function (protected) {
    if (this.isProtected == protected) return;
    this.isProtected = protected;
    this.entity.isProtected = protected;
    this.protectShield.enabled = protected;
}

RemotePlayerController.prototype.setProp = function (id) {
    if (this.app.agar) return;

    this.username.enabled = true;

    if (this.propObject != null) {
        this.propObject.enabled = false;
        this.propObject = null;
    }

    if (id == null || id == -1) {
        if (!this.isPlayerSpider) {
            this.playerRendererEntity.enabled = true;
            this.face.enabled = true;
            this.mainSkins.enabled = true
        }
        return;
    }

    this.playerRendererEntity.enabled = false;
    this.face.enabled = false;
    this.mainSkins.enabled = false;

    this.propObject = this.potionObjects.children[id];
    this.propObject.enabled = true;
    this.propObject.sound.play("magic");
    this.propObject.children[0].particlesystem.reset();
    this.propObject.children[0].particlesystem.play();

    this.username.enabled = false;
};

RemotePlayerController.prototype.connectionFailed = function () {
    this.entity.destroy();
}

RemotePlayerController.prototype.setAvatar = async function (data) {
    if (this.app.agar) return;

    console.log("new data income", data);
    try {
        let skinData = ShopData.getByName(data.skin.name);
        if (data.skin.activeColor > 0 && skinData.colorVariants != undefined) skinData = skinData.colorVariants[data.skin.activeColor];

        let hatData = ShopData.getByName(data.hat.name);
        if (data.hat.activeColor > 0 && hatData.colorVariants != undefined) hatData = hatData.colorVariants[data.hat.activeColor];

        let faceData = ShopData.getByName(data.face.name);

        //this.skin.render.asset = await skinData.getAsset();
        //this.hat.render.asset = await hatData.getAsset();
        //this.face.render.meshInstances[0].material = await faceData.getAsset();

        let skin = await skinData.getAsset();
        let hat = await (ShopData.hatFor ? ShopData.hatFor(skinData, hatData) : hatData).getAsset();   // saçlı skinde şapka yerine saç
        let face = await faceData.getAsset();

        if (skin && skin.resource) this.skin.render.asset = skin;
        if (hat && hat.resource) this.hat.render.asset = hat;
        if (this.face.render && this.face.render.meshInstances && this.face.render.meshInstances[0] && face) {
            this.face.render.meshInstances[0].material = face;
        } else {
            console.warn("⚠️ Mannequin face asset is missing or not loaded!", face);
        }

    } catch (e) {
        console.error(e)
    }
}

RemotePlayerController.prototype.emote = function (index) {
    let emoteTextureId = EmoteList[index].assetId;
    if (index == 0 || index == 1 || index == 2 || index == 3)
        this.entity.sound.play("emote" + index);
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            this.entity.sound.play("emote");
            let emote = this.app.player.controller.emoteTemplate.resource.instantiate();
            this.emoteParent.addChild(emote);

            let thumb = this.app.assets.get(emoteTextureId);
            if (thumb.loaded) {
                emote.element.texture = thumb.resource;
            }
            else {
                this.app.assets.load(thumb);
                thumb.ready((asset) => {
                    emote.element.texture = asset.resource;
                });
            }

            emote.setLocalScale(pc.Vec3.ZERO);

            let xPos = i == 0 || i == 2 ? -.75 : .75;
            let zPos = i == 0 ? .5 : i == 1 ? 0 : -.5;
            if (this.isPlayerSpider) {
                xPos *= 3;
                zPos *= 3;
                emote.setLocalPosition(xPos, 2, zPos);
            } else {
                emote.setLocalPosition(xPos, 1, zPos);
            }

            emote
                .tween(emote.getLocalPosition())
                .to(new pc.Vec3(xPos, 1.5, zPos), 3, pc.Linear)
                .onComplete(() => {
                    emote
                        .tween(emote.getLocalScale())
                        .to(pc.Vec3.ZERO, .1, pc.SineOut)
                        .onComplete(() => {
                            emote.destroy();
                        })
                        .start();
                })
                .start();

            if (this.isPlayerSpider) {
                emote
                    .tween(emote.getLocalScale())
                    .to(new pc.Vec3(1, 1, 1), .1, pc.SineOut)
                    .start();
            } else {
                emote
                    .tween(emote.getLocalScale())
                    .to(new pc.Vec3(0.5, 0.5, 0.5), .1, pc.SineOut)
                    .start();
            }
        }, i * 500);
    }
}

RemotePlayerController.prototype.spiderAttackAnim = function () {
    this.playerSpider.anim.setBoolean("attack", true);

    this.spiderAttackTimeout = setTimeout(() => {
        this.playerSpider.anim.setBoolean("attack", false);
    }, 500);
}

RemotePlayerController.prototype.setAgarScale = function (value) {
    if (this.app.networkManager.currentSceneName != "Agar") return;
    if (!this.app.agar) return;

    this.agarScale = value;
    this.agarPoints.element.text = Math.round((value - 1) * 100);
    this.entity.setLocalScale(value, value, value);
    this.entity.collision.radius = value / 2;
    //this.entity.collision.height = value * 3;
    this.entity.collision.linearOffset = new pc.Vec3(0, 1.7 - value, 0);
}

RemotePlayerController.prototype.setAgarLevel = function (value) {
    if (this.app.networkManager.currentSceneName != "Agar") return;
    if (!this.app.agar) return;

    value = Math.min(value, this.agarModels.length - 1);

    if (!this.agarModels) this.agarModels = this.agarParent.children;
    this.agarLevel = value;

    for (let i = 0; i < this.agarModels.length; i++) this.agarModels[i].enabled = false;
    this.agarModels[value].enabled = true;
    this.agarModels[value].anim.setBoolean("walk", this.walk);
}