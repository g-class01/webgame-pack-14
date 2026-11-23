var PlayerController = pc.createScript('playerController');
PlayerController.attributes.add("username", { type: "entity" });
PlayerController.attributes.add("camera", { type: "entity" });
PlayerController.attributes.add("body", { type: "entity" });
PlayerController.attributes.add("moveSpeed", { type: "number", default: 6 });
PlayerController.attributes.add("jumpHeight", { type: "number", default: 13 });
PlayerController.attributes.add("rotateSpeed", { type: "number", default: 5 });
PlayerController.attributes.add("mainSkins", { type: "entity" });
PlayerController.attributes.add("spawnPoint", { type: "entity" });
PlayerController.attributes.add("matEntity", { type: "entity" });
PlayerController.attributes.add("defaultMat", { type: "asset", assetType: "material" });
PlayerController.attributes.add("defaultMatSpider", { type: "asset", assetType: "material" });
PlayerController.attributes.add("frozenMat", { type: "asset", assetType: "material" });
PlayerController.attributes.add("cageGhost", { type: "entity" });
PlayerController.attributes.add("protectShield", { type: "entity" });
PlayerController.attributes.add("emoteTemplate", { type: "asset", assetType: "template" });
PlayerController.attributes.add("agarParent", { type: "entity" });
PlayerController.attributes.add("agarPoints", { type: "entity" });

PlayerController.prototype.initialize = function () {
    this.emoteParent = this.entity.findByName("EmoteParent");
    this.spiderUsername = this.entity.findByName("SpiderUsername");
    this.spiderSpawnPoint = this.app.root.findByName("SpiderSpawnPoint");
    this.mouthGrabParentPlayerSpider = this.entity.findByName("MouthGrabParent");
    this.interact = this.entity.script.playerInteract;
    this.isTouchingWall = false;
    this.app.isSpider = false;
    this.isClimbingLadder = false;
    this.playerSpider = this.entity.findByName("PlayerSpider");
    this.playerSpiderRotParent = this.entity.findByName("SpiderRef");
    this.playerSpiderRotEntity = this.playerSpiderRotParent.children[0];
    this.zeroVec3 = new pc.Vec3(0, 0, 0);
    this.isPlayingJetpackSound = false;
    this.tempMoveSpeed = this.moveSpeed;
    this.tempJumpHeight = this.jumpHeight;
    this.spiderMoveSpeed = 8;
    if (this.app.networkManager.currentSceneName == "Catch") this.spiderMoveSpeed = 15;
    this.firstTp = true;
    this.time = 0;
    this.diedTime = 0;
    this.lastAFKCheck = 0;
    this.entity.isLocal = true;
    this.isDied = false;
    this.caught = false;
    this.isGrabbedBySpider = false;
    this.entity.isGrabbedBySpider = false;
    this.playerRendererEntity = this.body.findByName("Body");
    this.faceSprite = this.body.findByName("FaceSprite");
    this.setCamera();
    this._direction = new pc.Vec3();
    this._contactNormal = new pc.Vec3();
    this._quatLerp = new pc.Quat();
    this._spiderQuatLerp = new pc.Quat();
    this._desiredVelocity = new pc.Vec3();
    this._desiredAngle = 0;
    this._requestedJump = false;
    this._requestAttack = false;
    this._timeSinceLastJump = 0;
    this._timeSinceLastGrounded = 0;
    this.isSliding = false;
    this._animComponent = this.body.anim;

    if (this.app.agar && this.app.networkManager.currentSceneName == "Agar") {
        // Agar'da insan modelinin yüzü görünmemeli; iskelette birden fazla yüz kopyası var, hepsini kapat
        this.body.find(e => e.name === "newchar_face" || e.name === "FaceSprite").forEach(e => { e.enabled = false; });
        this.agarModels = this.agarParent.children;
        this.setAgarScale(1);
        this.setAgarLevel(0);
    }

    this.potionObjects = this.entity.findByName("PotionObjects");
    this.propObject = null;
    this.app.isProp = () => this.propObject != null;

    this.isFirstTimeRespawn = true;
    this.respawn(true);

    this.spectateIndex = 0;
    this.spectateRemote = null;
    this.oldMoveState = true;

    this.isProtected = false;

    this.arrowOrigin = this.entity.findByName("ArrowOrigin");
    this.arrowOrigin.arrow = this.arrowOrigin.findByName("Arrow");

    this.app.on('EnterFPS', this.enterFPS, this);
    this.app.on('ExitFPS', this.exitFPS, this);

    this.app.keyboard.on(pc.EVENT_KEYDOWN, this.onKeyDown, this);
    this.app.keyboard.on(pc.EVENT_KEYUP, this.onKeyUp, this);

    const isFPSLocalStorage = Utils.getItem("isFPS");
    if (isFPSLocalStorage == "true") {
        this.app.fire("EnterFPS");
    }
    else if (isFPSLocalStorage == "false") {
        this.app.fire("ExitFPS");
    } else {
        this.app.fire("ExitFPS");
    }

    this.entity.collision.on('collisionstart', function (otherEntity) {
        if (otherEntity.other.tags.has("Ladder")) {
            this.isClimbingLadder = true;
            this.isOnLadder = true;
            this._animComponent.setBoolean("isOnLadder", true);
        } else if (otherEntity.other.tags.has("Climbable")) {
            this.isTouchingWall = true;
        }
    }, this);
    this.entity.collision.on('collisionend', function (otherEntity) {
        if (otherEntity.tags.has("Ladder")) {
            this.isClimbingLadder = false;
            this.isOnLadder = false;
            this._animComponent.setBoolean("isClimbing", false);
            this._animComponent.setBoolean("isOnLadder", false);
        } else if (otherEntity.tags.has("Climbable")) {
            this.isTouchingWall = false;
        }
    }, this);
    this.playerHealth = 100;
    this.app.on("PlayerTakeDamage", this.takeDamage, this);
    this.app.on("PlayerRestart", this.respawn, this);
    this._onSpectateLeft = () => this.setNextPlayer(false);
    this._onSpectateRight = () => this.setNextPlayer(true);
    this.app.on("SpectateControls:Left", this._onSpectateLeft, this);
    this.app.on("SpectateControls:Right", this._onSpectateRight, this);

    this._onWindowBlur = onWindowBlur.bind(this);
    window.addEventListener("blur", this._onWindowBlur);

    this.on('destroy', function () {
        window.removeEventListener("blur", this._onWindowBlur);
        this.app.keyboard.off(pc.EVENT_KEYDOWN, this.onKeyDown, this);
        this.app.keyboard.off(pc.EVENT_KEYUP, this.onKeyUp, this);
        clearTimeout(this.spiderAttackTimeout);
        this.app.off('EnterFPS', this.enterFPS, this);
        this.app.off('ExitFPS', this.exitFPS, this);
        this.app.off("PlayerTakeDamage", this.takeDamage, this);
        this.app.off("PlayerRestart", this.respawn, this);
        this.app.off("SpectateControls:Left", this._onSpectateLeft, this);
        this.app.off("SpectateControls:Right", this._onSpectateRight, this);
        clearTimeout(this.trapTimeout);
        clearTimeout(this.stunTimeout);
    }, this);

    this.app.inSafeArea = true;
};

function onWindowBlur() {
    console.log("Game lost focus! Possible click outside.");
    this.isPressSpace = false;
    this.isPressRight = false;
    this.isPressLeft = false;
    this.isPressUpKey = false;
    this.isPressDownKey = false;
    this._direction.set(0, 0, 0);
    this.entity.rigidbody.linearVelocity = this.zeroVec3;
    this._animComponent.setBoolean("walk", false);
    this.setIsWalking(false);
}

PlayerController.prototype.onKeyDown = function (input) {
    if (input.key == pc.KEY_SPACE) {
        this.isPressSpace = true;
    }
    if (input.key == pc.KEY_W || input.key == pc.KEY_UP) {
        this.isPressUpKey = true;
    }
    if (input.key == pc.KEY_S || input.key == pc.KEY_DOWN) {
        this.isPressDown = true;
    }
    if (input.key == pc.KEY_A || input.key == pc.KEY_LEFT) {
        this.isPressLeft = true;
    }
    if (input.key == pc.KEY_D || input.key == pc.KEY_RIGHT) {
        this.isPressRight = true;
    }
}
PlayerController.prototype.onKeyUp = function (input) {
    if (input.key == pc.KEY_SPACE) {
        this.isPressSpace = false;
    }
    if (input.key == pc.KEY_W || input.key == pc.KEY_UP) {
        this.isPressUpKey = false;
    }
    if (input.key == pc.KEY_S || input.key == pc.KEY_DOWN) {
        this.isPressDown = false;
    }
    if (input.key == pc.KEY_A || input.key == pc.KEY_LEFT) {
        this.isPressLeft = false;
    }
    if (input.key == pc.KEY_D || input.key == pc.KEY_RIGHT) {
        this.isPressRight = false;
    }
}

PlayerController.prototype.setUsername = function (nick) {
    this.username.element.text = nick;
    this.spiderUsername.element.text = nick;
};

PlayerController.prototype.setFrozen = function (isFrozen) {
    this.app.isFrozen = isFrozen;
    this._animComponent.enabled = !isFrozen;
    this.matEntity.render.meshInstances[0].material = isFrozen ? this.frozenMat.resource : this.defaultMat.resource;

    if (this.app.isSpider) {
        this.playerSpider.anim.enabled = !isFrozen;
        this.playerSpider.children[0].render.meshInstances[0].material = isFrozen ? this.frozenMat.resource : this.defaultMatSpider.resource;
    }

    if (isFrozen && this.app.player.canMove) {
        this.oldMoveState = this.app.player.canMove;
        this.app.player.canMove = false;
    }
    else {
        this.app.player.canMove = this.oldMoveState;
    }

    if (this.app.networkManager.currentSceneName == "Catch") {
        setTimeout(() => {
            // Sahne değiştiyse (lobiye dönüş vb.) bu oyuncu yok olmuştur
            if (!this.matEntity || !this.matEntity.render) return;
            this.setFrozen(false);
        }, 5000);
    }
}

PlayerController.prototype.setCaught = function (caught) {
    console.log("Player getCaught", caught);
    this.caught = caught;
    this._animComponent.setBoolean("caught", this.caught);
}

PlayerController.prototype.grabbedBySpider = function (state) {
    console.log("Player grabbedBySpider", state);
    this.isGrabbedBySpider = state;
    this.entity.isGrabbedBySpider = state;
    if (state) {
        this.entity.rigidbody.type = "kinematic";
        //this.entity.collision.enabled = false;
        this.entity.setLocalPosition(0, 0, 0);
        this.entity.setLocalEulerAngles(180, 0, 180);
        this._animComponent.setBoolean("isInAir", true);
        this.setCaught(false);
        this.app.caughtWeb = null;
        if (this.app.spiderPlayer) {
            this.app.spiderCamera.spider = this.app.spiderPlayer;
        } else {
            this.app.spiderCamera.spider = this.app.spiderController.entity;
        }
        this.setCameraTarget(this.app.spiderCamera.entity);
        this.app.player.inventory.selectSlot(null);
        this.app.player.interact.setRightHand(null);
        this.app.player.stats.caught += 1;
    } else {
        this.app.player.canMove = true;
        this.entity.reparent(pc.app.root);
        this.entity.rigidbody.type = "dynamic";
        //this.entity.collision.enabled = true;
        let pos;
        if (this.app.spiderPlayer) {
            pos = this.app.spiderPlayer.getPosition().clone();
        } else {
            pos = this.app.spiderController.entity.getPosition().clone();
        }
        pos.y += 1;
        this.entity.rigidbody.teleport(pos);
        this.app.player.interact.refresh();
        this.setCameraTarget(null);
    }
}

PlayerController.prototype.enterFPS = function () {
    this.username.enabled = false;

    if (this.app.agar) {
        this.agarPoints.enabled = false;
        this.agarModels[this.agarLevel].enabled = false;
        return;
    }

    this.playerRendererEntity.enabled = false;
    this.faceSprite.enabled = false;
    this.mainSkins.enabled = false
    this.protectShield.enabled = false;
    if (this.app.isSpider == true) { //player is spider
        this.playerSpider.enabled = false;
    }
    if (this.propObject != null)
        this.propObject.enabled = false;
};

PlayerController.prototype.exitFPS = function () {
    if (this.app.agar) {
        this.agarModels[this.agarLevel].enabled = true;
        this.username.enabled = true;
        this.agarPoints.enabled = true;
        return;
    }

    if (this.app.isSpider == false && this.propObject == null) {
        this.playerRendererEntity.enabled = true;
        this.username.enabled = true;
        this.faceSprite.enabled = true;
        this.mainSkins.enabled = true;
        this.protectShield.enabled = this.isProtected;
    }
    else if (this.app.isSpider == true) { //player is spider
        this.playerSpider.enabled = true;
    }
    else if (this.propObject != null) {
        this.propObject.enabled = true;
    }

};

PlayerController.prototype.takeDamage = function (damage) {
    if (this.app.isDied) return;
    this.playerHealth -= damage;
    if (damage > 0)
        this.app.network.lowHPEffectMethod();

    if (this.playerHealth <= 0) {
        this.died();
    }
};

PlayerController.prototype.becomeSpider = function () {
    if (this.app.agar) return;

    this.app.isSpider = true;
    this.app.isWendigo = getCurrentChapter() == Chapters.Three;
    this.app.player.stats.trapped = 0
    this.app.player.stats.caught = 0;
    if (!this.app.isFPS) {
        this.playerSpider.enabled = true;
    }
    if (this.propObject != null) {
        this.propObject.enabled = false;
        this.propObject = null;
    }
    if (this.propTimeout) {
        clearTimeout(this.propTimeout);
        this.propTimeout = null;
    }
    this.playerRendererEntity.enabled = false;
    this.username.enabled = false;
    this.faceSprite.enabled = false;
    this.mainSkins.enabled = false
    //this.app.networkManager.mobileAttackButton.enabled = true;
    this.canSpiderAttack = true;
    this.app.spiderPlayer = this.playerSpider;
    this.app.fire("BecomeSpider");
    if (this.app.networkManager.currentSceneName != "Catch") this.teleport(this.spiderSpawnPoint.getPosition())
    console.log("Player become spider", this.playerSpider)
    if (this.app.tutorialManagerTwo)
        for (let i = 0; i < this.app.tutorialManagerTwo.spiderNoCollider.length; i++) {
            this.app.tutorialManagerTwo.spiderNoCollider[i].enabled = false;
        }
};

PlayerController.prototype.trap = function (duration) {
    this.trapped = true;
    this.playerSpider.anim.setBoolean("isTrapped", true);

    this.trapTimeout = setTimeout(() => {
        this.trapped = false;
        this.playerSpider.anim.setBoolean("isTrapped", false);
    }, duration * 1000);
};

PlayerController.prototype.stun = function (duration) {
    this.stunned = true;
    this.playerSpider.anim.setBoolean("isStunned", true);
    this.app.player.canMove = false;

    this.stunTimeout = setTimeout(() => {
        this.stunned = false;
        this.playerSpider.anim.setBoolean("isStunned", false);
        this.app.player.canMove = true;
    }, duration * 1000);
};

PlayerController.prototype.setProp = function (id, timed = true) {
    if (this.app.agar) return;

    if (this.app.room)
        this.app.room.send("Client:Prop", { id: id })

    if (this.propObject != null) {
        this.propObject.enabled = false;
        this.propObject = null;
    }

    if (id == null || id == -1) {
        if (!this.app.isSpider) {
            this.playerRendererEntity.enabled = true;
            this.username.enabled = true;
            this.faceSprite.enabled = true;
            this.mainSkins.enabled = true;
        }

        if (this.propTimeout != null) {
            clearTimeout(this.propTimeout)
            this.propTimeout = null;
        }
        return;
    }

    this.propObject = this.potionObjects.children[id];

    if (!this.app.isFPS) {
        this.propObject.enabled = true;
    }

    this.playerRendererEntity.enabled = false;
    this.username.enabled = false;
    this.faceSprite.enabled = false;
    this.mainSkins.enabled = false;
    this.propObject.sound.play("magic");
    this.propObject.children[0].particlesystem.reset();
    this.propObject.children[0].particlesystem.play();

    if (this.propTimeout) {
        clearTimeout(this.propTimeout);
        this.propTimeout = null;
    }

    if (timed === true) {
        this.propTimeout = setTimeout(() => {
            this.setProp(-1);
        }, 30000)
    }
}

PlayerController.prototype.becomeHuman = function () {
    if (this.app.agar) return;

    this.app.isSpider = false;
    this.playerSpider.enabled = false;
    if (!this.app.isFPS) {
        this.playerRendererEntity.enabled = true;
        this.username.enabled = true;
        this.faceSprite.enabled = true;
        this.mainSkins.enabled = true
    }
    //this.app.networkManager.mobileAttackButton.enabled = false;
    this.canSpiderAttack = false;

    this.app.fire("BecomeHuman");
    this.app.fire("AmbienceManager:PlayerChangedLocation");
    console.log("Player become human")
    if (this.app.tutorialManagerTwo)
        for (let i = 0; i < this.app.tutorialManagerTwo.spiderNoCollider.length; i++) {
            this.app.tutorialManagerTwo.spiderNoCollider[i].enabled = true;
        }
};

PlayerController.prototype.update = function (dt) {
    this.time += dt;
    if (this.isVelocityLerp) {
        let velocity = this.entity.rigidbody.linearVelocity.clone();
        velocity.y = 0;
        if (velocity.distance(this.zeroVec3) < 0.2) {
            this.isNoneVelocity = false;
            this.isVelocityLerp = false;
        }
        let veloLerp = velocity.lerp(velocity, this.zeroVec3, dt * 8);
        //veloLerp = this.zeroVec3;
        veloLerp.y = this.entity.rigidbody.linearVelocity.y;
        this.entity.rigidbody.linearVelocity = (veloLerp)
    }
    /*
    if (this.app.keyboard.wasPressed(pc.KEY_R))
        this.takeDamage(100);
    */
    if (this.diedTime < this.time && this.entity.getPosition().y < -65 && this.isDied == false) {
        this.takeDamage(100);
    }

    //input
    if (this.app.isMobile && (this.app.keyboard.isPressed(pc.KEY_A) || this.app.keyboard.isPressed(pc.KEY_LEFT)
        || this.app.keyboard.isPressed(pc.KEY_D) || this.app.keyboard.isPressed(pc.KEY_RIGHT)
        || this.app.keyboard.isPressed(pc.KEY_W) || this.app.keyboard.isPressed(pc.KEY_UP)
        || this.app.keyboard.isPressed(pc.KEY_S) || this.app.keyboard.isPressed(pc.KEY_DOWN))) {
        this.app.isMobile = false;
        this.app.network.mobileControls.enabled = this.app.isMobile;
        this.app.fire("DisabledMobileControl");
        this.setCamera();
        this.camera.script.mobileCameraController.enabled = false;
    }
    /*
        if (this.app.keyboard.wasPressed(pc.KEY_R)) {
            this.died();
            return;
        }*/

    if (this.isSliding == false)
        this._direction.set(0, 0, 0);
    this._requestedJump = false;
    //this._requestAttack = false;

    this._timeSinceLastJump += dt;
    this._timeSinceLastGrounded += dt;

    if (this.isGrabbedBySpider == true) {
        const targetQuat = new pc.Quat().setFromEulerAngles(180, 0, 180);
        this._quatLerp = new pc.Quat().slerp(this._quatLerp, targetQuat, this.rotateSpeed * dt);
        this.body.setLocalRotation(this._quatLerp);
        return;
    }

    if (!this.app.isWatchingAd && this.isDied == false && this.app.player.canMove && !this.app.isPlayingCutscene && !this.app.marketEnabled) {
        if (this.isSliding == false) {
            joystick = window.touchJoypad.sticks['joystick0'];


            if (this.app.isMobile) {
                if (joystick.y > 0) {
                    //this._direction.add(this.camera.forward.mulScalar(joystick.y));
                    this.sdkGamePlayStart();
                } else if (joystick.y < 0) {
                    //this._direction.add(this.camera.forward.mulScalar(-joystick.y));
                    this.sdkGamePlayStart();
                }
                if (joystick.x > 0) {
                    this.sdkGamePlayStart();
                    //this._direction.add(this.camera.right.mulScalar(joystick.x));
                } else if (joystick.x < 0) {
                    this.sdkGamePlayStart();
                    //this._direction.add(this.camera.right.mulScalar(-joystick.x));
                }
                this._direction.add(this.camera.right.mulScalar(joystick.x));
                this._direction.add(this.camera.forward.mulScalar(joystick.y));
                this.isPressSpace = window.touchJoypad.buttons.isPressed('jumpButton');
                if (window.touchJoypad.buttons.wasPressed('jumpButton')) {
                    this.sdkGamePlayStart();
                    if (!this.app.isSpider)
                        this._requestedJump = true;
                }
                if (window.touchJoypad.buttons.wasPressed('useButton')) {
                    this.sdkGamePlayStart();
                }
                if (window.touchJoypad.buttons.wasPressed('attackButton')) {
                    this.sdkGamePlayStart();
                    //this._requestAttack = true;
                }
            } else {
                if (this.app.mousePressing) {
                    //this._requestAttack = true;
                }
                if (this.isPressSpace) {
                    this.sdkGamePlayStart();
                    if (!this.app.isSpider)
                        this._requestedJump = true;
                }
                if (this.isPressUpKey) {
                    if (this.app.isSpider && this.isTouchingWall && !this.app.isWendigo)
                        this._direction.add(this.playerSpiderRotEntity.forward);
                    else
                        this._direction.add(this.camera.forward);
                    this.sdkGamePlayStart();
                }
                else if (this.isPressDown) {
                    if (this.app.isSpider && this.isTouchingWall && !this.app.isWendigo)
                        this._direction.sub(this.playerSpiderRotEntity.forward);
                    else
                        this._direction.sub(this.camera.forward);
                    this.sdkGamePlayStart();
                }
                if (this.isPressLeft) { //(this.app.keyboard.isPressed(pc.KEY_A) || this.app.keyboard.isPressed(pc.KEY_LEFT)) 
                    if (this.app.isSpider && this.isTouchingWall && !this.app.isWendigo) {
                        this._direction.add(this.playerSpiderRotEntity.forward);
                    } else
                        this._direction.sub(this.camera.right);
                    this.sdkGamePlayStart();

                } if (this.isPressRight) {
                    if (this.app.isSpider && this.isTouchingWall && !this.app.isWendigo)
                        this._direction.add(this.playerSpiderRotEntity.forward);
                    else
                        this._direction.add(this.camera.right);
                    this.sdkGamePlayStart();
                }
            }
        }

        this._direction.y = 0;

        const rayStart = this.entity.getPosition().clone();
        const rayEnd = rayStart.clone().sub(new pc.Vec3(0, this.app.agar ? this.agarScale * 1.5 : 1.25, 0));

        let groundCheckVal = .5;
        if (this.app.agar) groundCheckVal = this.agarScale / 2;

        const _rayResults = [
            this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd, "Ground"),
            this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd.clone().add(new pc.Vec3(groundCheckVal, 0, groundCheckVal)), "Ground"),
            this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd.clone().add(new pc.Vec3(groundCheckVal, 0, -groundCheckVal)), "Ground"),
            this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd.clone().add(new pc.Vec3(-groundCheckVal, 0, groundCheckVal)), "Ground"),
            this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd.clone().add(new pc.Vec3(-groundCheckVal, 0, -groundCheckVal)), "Ground")
        ];

        this.grounded = false;

        for (const result of _rayResults) {
            if (result) {
                this._contactNormal = result.normal.clone();
                this._timeSinceLastGrounded = 0;
                this.grounded = true;
                if (this._timeSinceLastJump >= 0.3) {
                    this._jumped = false;
                    this._animComponent.setBoolean("isInAir", false);
                }
                break; // Exit the loop if grounded

            }
        }
        if (!this.grounded || this.isSliding || this.isNoneVelocity) {
            this._contactNormal = new pc.Vec3(0, 1, 0);
            this._animComponent.setBoolean("isInAir", true);
        }
    }
    if (this.app.isSpider) {
        if (this.mouthGrabParentPlayerSpider.children.length > 0)
            this._desiredVelocity = this._direction.normalize().clone().mulScalar(this.spiderMoveSpeed * 2);
        else
            this._desiredVelocity = this._direction.normalize().clone().mulScalar(this.spiderMoveSpeed);
    }
    else
        this._desiredVelocity = this._direction.normalize().clone().mulScalar(this.moveSpeed * this.app.player.properties.speedMul);
    //etrafa donmesi
    if (this._desiredVelocity.length() > 0) {
        if (this.app.isSpider) {
            if (this.mouthGrabParentPlayerSpider.children.length > 0)
                this._desiredVelocity = this._direction.normalize().clone().mulScalar(this.spiderMoveSpeed * 2);
            else
                this._desiredVelocity = this._direction.normalize().clone().mulScalar(this.spiderMoveSpeed);
        }
        else
            this._desiredVelocity = this._direction.normalize().clone().mulScalar(this.moveSpeed * this.app.player.properties.speedMul);
        this._desiredAngle = Math.atan2(this._direction.x, this._direction.z) * pc.math.RAD_TO_DEG;
        const targetQuat = new pc.Quat().setFromEulerAngles(0, this._desiredAngle, 0);
        this._quatLerp = new pc.Quat().slerp(this._quatLerp, targetQuat, this.rotateSpeed * dt);
        this.body.setRotation(this._quatLerp);
        //not afk check
        if (Date.now() > this.lastAFKCheck) {
            this.lastAFKCheck = Date.now() + 200;
            if (this.app.room) {
                this.app.room.send("Client:NotAFK");
            }
        }
    } else { //fps teyken ve hareket etmiyorken kamerayı etrafa döndür
        if (this.app.isFPS) {
            this._desiredAngle = this.cameraScript.eulers.x;
            const targetQuat = new pc.Quat().setFromEulerAngles(0, this._desiredAngle, 0);
            this._quatLerp = new pc.Quat().slerp(this._quatLerp, targetQuat, this.rotateSpeed * dt);
            this.body.setRotation(this._quatLerp);
        }
    }

    this._desiredVelocity.y += this.entity.rigidbody.linearVelocity.y;
    const velocityDotNormal = this._desiredVelocity.clone().normalize().dot(this._contactNormal);
    if (velocityDotNormal > 0 && !this._jumped) {
        this._desiredVelocity.sub(this._contactNormal.clone().mulScalar(velocityDotNormal * this._desiredVelocity.length()));
    }

    if (!this.app.isSpider && this.isClimbingLadder == true) {
        if (this.app.keyboard.isPressed(pc.KEY_W) || this.app.keyboard.isPressed(pc.KEY_UP) || (this.app.isMobile && joystick.y > 0)) {
            const temp = this.body.up.mulScalar(15);
            this._desiredVelocity.set(this._desiredVelocity.x, 0, this._desiredVelocity.z);
            this._desiredVelocity.add(temp);
            this._desiredVelocity = this._desiredVelocity.normalize().mulScalar(6);
            this._animComponent.setBoolean("isClimbing", true);
        } else {
            this._desiredVelocity.set(this._desiredVelocity.x, 0, this._desiredVelocity.z);
            this._animComponent.setBoolean("isClimbing", false);
        }

        if (this._requestedJump) {
            const temp = this.body.up.clone().add(this.body.forward.mulScalar(4));
            this._desiredVelocity.add(temp.normalize().mulScalar(this.jumpHeight));
        }
    } else if (this.isTouchingWall == true && this.app.isSpider && !this.app.isWendigo) { //spider climbing
        if (this.app.keyboard.isPressed(pc.KEY_W) || this.app.keyboard.isPressed(pc.KEY_UP) || (this.app.isMobile && joystick.y > 0)) {
            this._desiredVelocity.set(0, 6, 0);
        } else if (this.app.keyboard.isPressed(pc.KEY_S) || this.app.keyboard.isPressed(pc.KEY_DOWN) || (this.app.isMobile && joystick.y < 0)) {
            this._desiredVelocity.set(0, -6, 0);
        } else {
            this._desiredVelocity.set(this._desiredVelocity.x, 0, this._desiredVelocity.z);
        }
    } else {
        this._armatureTargetAngle = 0;
        //jump
        if (this.entity.jumpPlatform || (this._requestedJump && this._timeSinceLastGrounded <= 0.3 && !this._jumped)) {
            this._jumped = true;
            this.entity.jumpPlatform = false;
            this._timeSinceLastJump = 0;
            this._desiredVelocity.add(this._contactNormal.clone().mulScalar(this.jumpHeight));
            if (this._requestedJump) {
                this.entity.fire('jump');
                if (this.app.room)
                    this.app.room.send("Client:PlayerController:Jump");
            }
        }

        //extra gravity
        if (!this.entity.isBallon)
            this._desiredVelocity.set(this._desiredVelocity.x, this._desiredVelocity.y - 30 * dt, this._desiredVelocity.z);
    }
    if (!this.isNoneVelocity) {
        if (this.app.moveBlockMenu() || this.app.isWatchingAd) {
            this._desiredVelocity.x = 0;
            this._desiredVelocity.z = 0;
        }
        if (this.entity.extraForce) {
            this._desiredVelocity.set(this.entity.extraForce.x, this.entity.extraForce.y, this.entity.extraForce.z);
            this.entity.extraForce = null;
        }
        this.entity.rigidbody.linearVelocity = this._desiredVelocity;
    }

    if (this._direction.x != 0 || this._direction.y != 0 || this._direction.z != 0) {
        this._animComponent.setBoolean("walk", true);
        this.setIsWalking(true);
        if (this.app.isSpider) {
            this.playerSpider.anim.setBoolean("isRunning", true);
        }
        //rotate spider according to the wall
        if (this.app.isSpider) {
            if (this.isTouchingWall && !this.app.isWendigo) {
                const rayStart = this.playerSpider.getPosition().clone();
                const rayEnd = rayStart.clone().sub(this.playerSpiderRotEntity.up.clone().mulScalar(2));
                const wallHit = this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd, "Ground");
                const rayEnd2 = rayStart.clone().add(this.playerSpiderRotEntity.forward.clone().mulScalar(2));
                const wallHitForward = this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd2, "Ground");
                const rayEndLeft = rayStart.clone().sub(this.playerSpiderRotEntity.right.clone().mulScalar(2));
                const wallHitLeft = this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEndLeft, "Ground");
                const rayEndRight = rayStart.clone().add(this.playerSpiderRotEntity.right.clone().mulScalar(2));
                const wallHitRight = this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEndRight, "Ground");
                if (wallHit || wallHitForward) {
                    if (this._desiredVelocity.y > 0) {
                        if (this.playerSpider.isReversed == true)
                            this.playerSpiderRotEntity.setLocalEulerAngles(-90, 0, 0);
                        else
                            this.playerSpiderRotEntity.setLocalEulerAngles(-90, 0, 180);
                    } else if (this._desiredVelocity.y < 0) {
                        if (this.playerSpider.isReversed == true)
                            this.playerSpiderRotEntity.setLocalEulerAngles(-90, 0, 180);
                        else
                            this.playerSpiderRotEntity.setLocalEulerAngles(-90, 0, 0);
                    } else if (this.isPressLeft || (this.app.isMobile && joystick.x > 0)) {
                        this.playerSpiderRotEntity.setLocalEulerAngles(-90, 0, 90);
                    } else if (this.isPressRight || (this.app.isMobile && joystick.x < 0)) {
                        this.playerSpiderRotEntity.setLocalEulerAngles(-90, 0, -90);
                    }
                } else if (wallHitLeft) {
                    this.playerSpiderRotParent.rotateLocal(0, -90, 0);
                } else if (wallHitRight) {
                    this.playerSpiderRotParent.rotateLocal(0, 90, 0);
                } else {
                    this.playerSpiderRotParent.rotateLocal(0, 180, 0);

                    //this.playerSpider.isReversed = true;
                    //this.playerSpider.setLocalScale(this.playerSpider.getLocalScale().clone().mulScalar(-1));
                }

            } else {
                this.playerSpider.isReversed = false;
                //this.playerSpider.setLocalScale(1, 1, 1)
                this.playerSpiderRotEntity.setRotation(this.body.getRotation());
                this.playerSpiderRotEntity.rotateLocal(180, 0, 180);
            }
            const targetQuat = this.playerSpiderRotEntity.getRotation().clone();
            this._spiderQuatLerp = new pc.Quat().slerp(this.playerSpider.getRotation().clone(), targetQuat, this.rotateSpeed * dt);
            this.playerSpider.setRotation(this._spiderQuatLerp);
        }
    } else {
        this._animComponent.setBoolean("walk", false);
        this.setIsWalking(false);
        if (this.app.isSpider) {
            this.playerSpider.anim.setBoolean("isRunning", false);
        }
    }
};

PlayerController.prototype.sdkGamePlayStart = function () {
    const result = !this.app.player.canMove || this.app.gamePlayStarted || this.app.isPopupEnabled || this.app.isWatchingAd
        || this.app.moveBlockMenu() || this.app.rewardedPanelEnabled || this.isDied || this.app.gameEnded;

    if (result) return;
    this.app.gamePlayStarted = true;
    PokiSDK.gameplayStart();
};
//Only gets y euler angle between -180, 180
PlayerController.prototype.getYaw = function (quat) {
    let transformedForward = new pc.Vec3();
    quat.transformVector(pc.Vec3.FORWARD, transformedForward);
    return Math.atan2(-transformedForward.x, -transformedForward.z) * pc.math.RAD_TO_DEG;
};

PlayerController.prototype.setCamera = function () {
    this.camera = this.app.root.findByName('Camera');
    this.cameraPosEntity = this.entity.findByName('CameraPosition');
    this.cameraParent = this.entity.findByName('Camera Axis');
    this.cameraParent.addChild(this.camera);
    this.camera.setLocalPosition(this.cameraPosEntity.getLocalPosition());
    if (this.app.isMobile) {
        this.cameraScript = this.camera.script.mobileCameraController;
    } else {
        this.cameraScript = this.camera.script.cameraController;
    }

    this.cameraScript.enabled = true;
    this.cameraScript.resetCamera();
    this._frameMovementRight = new pc.Vec3();
    this._frameMovementForward = new pc.Vec3();
    this._frameMovementTotal = new pc.Vec3();
};

PlayerController.prototype.died = function () {
    if (this.isDied) return;
    if (this.app.isSDKReady) {
        if (this.app.gamePlayStarted === true && this.app.isWatchingAd === false) {
            PokiSDK.gameplayStop();
            this.app.gamePlayStarted = false;
        }
    }

    //this.app.fire("lockCamera", true);

    if (this.app.player.inventory.currentSlot != null)
        this.app.player.inventory.selectSlot(this.app.player.inventory.currentSlot);

    this.app.player.interact.setRightHand(null);

    this.isDied = true;
    this.app.isDied = true;
    this.diedTime = this.time + 3;
    if (!this.app.agar)
        this._animComponent.setBoolean("isDied", true);
    // this.app.network.diedEffect();
    this.entity.collision.enabled = false;
    this.entity.rigidbody.type = "kinematic";
    this.setProp(-1);

    this.app.player.stats.die += 1;

    setTimeout(() => {
        this.respawn();
    }, 2900);

    if (this.app.room)
        this.app.room.send("Client:Died");
};

PlayerController.prototype.setNextPlayer = function (forward = true) {
    let remotes = this.app.root.findByTag("Remote").filter((r) => r.enabled === true);
    if (this.spectateRemote != null) {
        this.spectateIndex = this.spectateIndex + (forward ? 1 : -1);
        if (this.spectateIndex >= remotes.length)
            this.spectateIndex = 0;
        if (this.spectateIndex < 0)
            this.spectateIndex = remotes.length - 1;
    }

    let remote = remotes[this.spectateIndex];
    this.spectateRemote = remote;
    this.setCameraTarget(remote);
};

PlayerController.prototype.resetSpectatingPlayer = function () {
    if (!this.isDied) return;

    this.cameraScript.enabled = false;

    setTimeout(() => {
        let remotes = this.app.root.findByTag("Remote").filter((r) => r.enabled === true);
        if (remotes.length <= 0) {
            this.setCameraTarget(null);
        }
        else {
            if (this.spectateIndex >= remotes.length)
                this.spectateIndex = 0;

            let remote = remotes[this.spectateIndex];
            this.spectateRemote = remote;
            this.setCameraTarget(remote);
        }

        this.cameraScript.enabled = true;
    }, 10);
};

PlayerController.prototype.setCameraTarget = function (target) {
    if (target == null || target == undefined) {
        this.spectateRemote = null;
        this.spectateIndex = 0;
        target = this.app.player.entity;
    }

    let camera = this.app.networkManager.localCamera;
    let cameraPosEntity = target.findByName('CameraPosition');
    let cameraParent = target.findByName('Camera Axis');
    cameraParent.addChild(camera);
    camera.setLocalPosition(cameraPosEntity.getLocalPosition());

    let cameraScript;
    if (this.app.isMobile) {
        cameraScript = camera.script.mobileCameraController;
    } else {
        cameraScript = camera.script.cameraController;
    }

    cameraScript.resetCamera();
}

PlayerController.prototype.respawn = async function (first = false) {
    if (this.isFirstTimeRespawn) {
        this.isFirstTimeRespawn = false;
    } else {
        this.sdkGamePlayStart();
    }

    //this.app.fire("lockCamera", false);
    this.cameraScript.reset();
    this.playerHealth = 100;
    this.app.fire("SetMusic", false);
    this.app.fire("redpanel", false);
    this.takeDamage(0);
    this.isDied = false;
    this.app.isDied = false;
    if (!this.app.agar)
        this._animComponent.setBoolean("isDied", false);

    if (this.app.isFPS == false && !this.app.isSpider && !this.app.agar) {
        this.playerRendererEntity.enabled = true;
    }

    this.entity.collision.enabled = true;
    this.entity.rigidbody.type = "dynamic";

    this.setCameraTarget(null);

    if (this.app.inGame === true)
        this.app.inGame = false;

    if (this.app.agar && !first) {
        this.app.network.safezoneCollider.enabled = false;
        this.app.exitzone = false;
    }

    setTimeout(() => {
        if (this.app.isSpider) {
            this.teleport(this.spiderSpawnPoint.getPosition())
        } else {
            this.teleport(this.spawnPoint.getPosition())
        }
    }, 1);

    if (!first)
        if (this.app.isSDKReady) {
            if (!this.app.isWatchingAd)
                PokiSDK.commercialBreak(() => {
                    // you can pause any background music or other audio here
                    this.app.systems.sound.volume = 0;
                    this.app.isWatchingAd = true;
                    this.app.network.lockCamera(true);
                }).then(async () => {
                    this.app.systems.sound.volume = 1;
                    this.app.isWatchingAd = false;
                    this.app.network.lockCamera(false);
                });
        }

    if (this.app.room) {
        this.app.room.send("Client:Respawn");
    }
    //this.app.network.lockCamera(false);

    this.app.fire("RefreshTutorial");
};

PlayerController.prototype.teleport = function (pos, randomize = true) {
    this.app.fire("redpanel", false);
    let teleportedPos = pos.clone();
    if (randomize === true) {
        teleportedPos.x += pc.math.random(-3, 3);
        teleportedPos.z += pc.math.random(-3, 3);
    }
    this.entity.rigidbody.teleport(teleportedPos);

    if (this.firstTp === true) this.firstTp = false;
    else this.app.fire("PlaySound", "teleport");

    if (this.app.room)
        this.app.room.send("PlayerTeleport", {
            x: teleportedPos.x,
            y: teleportedPos.y,
            z: teleportedPos.z
        })
};

PlayerController.prototype.setArrowTarget = function (target) {
    this.arrowTarget = target;
    this.arrowOrigin.enabled = target != null;
}

PlayerController.prototype.handleArrow = function (dt) {
    if (this.arrowTarget) {
        this.arrowOrigin.lookAt(this.arrowTarget.getPosition());
    }
};

PlayerController.prototype.setProtected = function (protected) {
    if (this.isProtected == protected) return;
    this.isProtected = protected;
    this.entity.isProtected = protected;
    this.protectShield.enabled = protected;
    if (this.app.isFPS) {
        this.protectShield.enabled = false;
    }

    //if (protected) this.app.fire('WarningTextController:setWarning', "You have a protection, the spider can't catch you!", 3, new pc.Color(0, 1, 0, 1));
    if (!protected && !this.app.isSpider) this.app.fire('WarningTextController:setWarning', "Your protection is gone, don't get caught!", 3, new pc.Color(1, 0, 0, 1));
}

PlayerController.prototype.emote = function (index) {
    let emoteTextureId = EmoteList[index].assetId
    if (index == 0 || index == 1 || index == 2 || index == 3)
        this.entity.sound.play("emote" + index);
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            this.entity.sound.play("emote");
            let emote = this.emoteTemplate.resource.instantiate();
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
            if (this.app.isSpider) {
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
            if (this.app.isSpider) {
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
    if (this.app.room) {
        this.app.room.send("Client:PlayerEmotePacket", { index: index })
    }
}

PlayerController.prototype.setAgarScale = function (value) {
    if (this.app.networkManager.currentSceneName != "Agar") return;
    let dif = value - this.agarScale;

    this.agarScale = value;
    this.agarPoints.element.text = Math.round((value - 1) * 100);

    let scl = value;
    this.entity.setLocalScale(scl, scl, scl);

    this.entity.collision.radius = scl / 2;
    //this.entity.collision.height = scl * 2.9;
    this.entity.collision.linearOffset = new pc.Vec3(0, 1.7 - scl, 0);

    if (dif > .5) {
        let pos = this.entity.getPosition().clone().add(new pc.Vec3(0, dif * 5, 0));
        this.teleport(pos, false);
    }
}

PlayerController.prototype.setAgarLevel = function (value) {
    if (this.app.networkManager.currentSceneName != "Agar") return;
    value = Math.min(value, this.agarModels.length - 1);

    this.agarLevel = value;
    for (let i = 0; i < this.agarModels.length; i++) this.agarModels[i].enabled = false;
    this.agarModels[value].enabled = !this.app.isFPS;
    this.setIsWalking(this.isWalking);

    let spd = 28 - 2 * Math.max(0, Math.min(value, 7));
    this.moveSpeed = spd;
}

PlayerController.prototype.setIsWalking = function (isWalking) {
    if (!this.app.agar) return;

    this.isWalking = isWalking;
    this.agarModels[this.agarLevel].anim.setBoolean("walk", isWalking);
}