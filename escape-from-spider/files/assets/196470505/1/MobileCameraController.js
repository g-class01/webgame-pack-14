var MobileCameraController = pc.createScript('mobileCameraController');

// Script attributes to control the sensitivity of the camera look with touch
MobileCameraController.attributes.add("touchLookSensitivity", { type: "number", default: 10, title: "Touch Look Sensitivity" });

// 'Snappiness' factor (how fast does the camera reach the target rotation and distance)
MobileCameraController.attributes.add("snappinessFactor", { type: "number", default: 0.1, title: "Snappiness Factor", description: "Lower is faster" });
MobileCameraController.attributes.add('restAngle', { type: 'number', default: 0 });

MobileCameraController.attributes.add('carAngleX', { type: 'number', default: 0.65 });
MobileCameraController.attributes.add('carAngleZ', { type: 'number', default: -0.25 });
MobileCameraController.attributes.add('carAngleX2', { type: 'number', default: 0 });
MobileCameraController.attributes.add('carAngleZ2', { type: 'number', default: -2 });

MobileCameraController.prototype.initialize = function () {
    //this.networkManager = this.app.root.findByName("NetworkManager").script.networkManager;
    this.eulers = new pc.Vec3(180, 10, 0);
    this.joystickBaseEntity = this.app.root.findByName('Left Half Touch Joystick').children[0];
    // Cache some temp variables for use later
    this._tempQuat1 = new pc.Quat();
    this._tempQuat2 = new pc.Quat();
    this._tempVec3_1 = new pc.Vec3();
    this.carZoom = 0;
    this.lastAFKCheck = 0;
    // Calculate the camera euler angle rotation around x and y axes
    // This allows us to place the camera at a particular rotation to begin with in the scene
    var quat = this.entity.getLocalRotation();
    this.ey = this.getYaw(quat) * pc.math.RAD_TO_DEG;
    this.ex = this.getPitch(quat, this.ey) * pc.math.RAD_TO_DEG;

    // The target rotation for the camera to rotate to
    this.targetEx = this.ex;
    this.targetEy = this.ey;

    this.rayEnd = this.app.root.findByName('RaycastEndPoint');
    this.originEntity = this.entity.parent;

    // Store the position of the touch so we can calculate the distance moved
    this.lastTouchPosition = new pc.Vec2();

    this.addEventCallbacks();
    this.getMouseZoomFromStorage();
    this.onOrientationChange();
    this._onOrientationChange = this.onOrientationChange.bind(this);
    window.addEventListener("resize", this._onOrientationChange, false);
    window.addEventListener("orientationchange", this._onOrientationChange, false);
    this.app.touch.on(pc.EVENT_TOUCHMOVE, this.onTouchMoveAFKCheck, this);


    this.app.on('EnterFPS', this.enterFPS, this);

    this.app.on('ExitFPS', this.exitFPS, this);

    this.on('destroy', function () {
        this.app.off('EnterFPS', this.enterFPS, this);
        this.app.off('ExitFPS', this.exitFPS, this);
        this.removeEventCallbacks();
        window.removeEventListener("orientationchange", this._onOrientationChange);
        window.removeEventListener("resize", this._onOrientationChange);
        this.app.touch.off(pc.EVENT_TOUCHMOVE, this.onTouchMoveAFKCheck, this);
    }, this);

};
MobileCameraController.prototype.enterFPS = function () {
    this.app.isFPS = true;
    this.app.mouseScroll = 0;
    Utils.setItem("mouseScroll", this.app.mouseScroll);
    Utils.setItem("isFPS", true);
};
MobileCameraController.prototype.exitFPS = function () {
    this.app.isFPS = false;
    this.app.mouseScroll = 4;
    Utils.setItem("isFPS", false);
};

MobileCameraController.prototype.onTouchMoveAFKCheck = function (e) {
    if (Date.now() > this.lastAFKCheck) {
        this.lastAFKCheck = Date.now() + 2000;
        if (this.app.room) {
            this.app.room.send("Client:NotAFK");
        }
    }
};

MobileCameraController.prototype.getMouseZoomFromStorage = function () {
    let zoom = Number.parseFloat(Utils.getItem("mouseScroll"));
    if (zoom != null && isNaN(zoom) == false) {
        this.app.mouseScroll = zoom;
    } else {
        this.app.mouseScroll = 40;
    }
};

MobileCameraController.prototype.resetCamera = function () {
    this.rayEnd = this.entity.parent.findByName('RaycastEndPoint');
    this.originEntity = this.entity.parent;
};

MobileCameraController.prototype.reset = function () {
    try {
        this.eulers.x = this.restAngle;
    } catch (e) {
    }

};

MobileCameraController.prototype.onOrientationChange = function () {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w > h) {
        this.horizontal = true;
        this.vertical = false;
    }
    else {
        this.horizontal = false;
        this.vertical = true;
    }
}

MobileCameraController.prototype.setMouseZoom = function (dt) {
    let extraZoom = this.app.isWendigo ? 8 : 0;

    if (this.app.isFPS) {
        const tempPos = this.rayEnd.getLocalPosition();
        this.oldTempPos = pc.math.lerp(tempPos.z, 0.1, 20 * dt);
        this.rayEnd.parent.getLocalPosition().y = 1.5;
        this.rayEnd.parent.getLocalPosition().z = 0;
        this.rayEnd.parent.getLocalPosition().x = 0;
        this.app.mouseScroll = 4;
        tempPos.z = this.oldTempPos;
        this.rayEnd.setLocalPosition(tempPos);
    } else {
        if (this.horizontal) {
            // Landscape
            const tempPos = this.rayEnd.getLocalPosition();
            this.oldTempPos = pc.math.lerp(tempPos.z, this.app.mouseScroll + 4 + extraZoom, 20 * dt);
            tempPos.z = this.oldTempPos;
            this.rayEnd.parent.getLocalPosition().y = 0.75;
            this.rayEnd.parent.getLocalPosition().z = 0;
            this.rayEnd.parent.getLocalPosition().x = 0;
            this.app.mouseScroll = 4;
            this.rayEnd.setLocalPosition(tempPos);
        }
        else {
            // Portrait
            const tempPos = this.rayEnd.getLocalPosition();
            this.rayEnd.parent.getLocalPosition().y = 0.75;
            this.rayEnd.parent.getLocalPosition().z = 0;
            this.rayEnd.parent.getLocalPosition().x = 0;
            tempPos.z = this.app.mouseScroll + 8 + extraZoom;
            this.rayEnd.setLocalPosition(tempPos);
        }
    }
};

MobileCameraController.prototype.addEventCallbacks = function () {
    if (this.app.touch) {
        this.app.touch.on(pc.EVENT_TOUCHSTART, this.onTouchStart, this);
        this.app.touch.on(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);
    }
};


MobileCameraController.prototype.removeEventCallbacks = function () {
    if (this.app.touch) {
        this.app.touch.off(pc.EVENT_TOUCHSTART, this.onTouchStart, this);
        this.app.touch.off(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);
    }
};


MobileCameraController.prototype.moveCamera = function (edx, edy, sensitivity) {
    if (this.app.isPlayingCutscene)
        return;

    const gameplayStartCheck = this.app.gamePlayStarted || this.app.isPopupEnabled || this.app.isWatchingAd
        || this.app.anyMenuEnabled() || this.app.rewardedPanelEnabled || this.app.player.controller.isDied || this.app.gameEnded;

    if (!gameplayStartCheck) {
        this.app.gamePlayStarted = true;
        PokiSDK.gameplayStart();
    }

    var dx = Math.min(Math.max(edx, -50), 50);
    var dy = Math.min(Math.max(edy, -50), 50);

    this.eulers.x -= (((this.touchLookSensitivity + this.app.sensitivity * 4) * dx) / 60) % 360;
    this.eulers.y += (((this.touchLookSensitivity + this.app.sensitivity * 4) * dy) / 60) % 360;

    if (this.eulers.x < 0) this.eulers.x += 360;
    if (this.eulers.y < 0) this.eulers.y += 360;

    this.eulers.y %= 360;
    if (this.app.isFPS) {
        if (this.eulers.y > 85 && this.eulers.y < 180)
            this.eulers.y = 85;
        else if (this.eulers.y < 280 && this.eulers.y > 250)
            this.eulers.y = 280;
    } else {
        if (this.eulers.y > 85 && this.eulers.y < 180)
            this.eulers.y = 85;
        else if (this.eulers.y < 300 && this.eulers.y > 250)
            this.eulers.y = 300;
    }
};

MobileCameraController.prototype.postUpdate = function (dt) {
    if (this.app.isPlayingCutscene)
        return;
    this.setMouseZoom(dt);
    const targetY = this.eulers.x + 180;
    const targetX = this.eulers.y;
    const targetAng = new pc.Vec3(-targetX, targetY, 0);

    this.originEntity.setEulerAngles(targetAng);
    const pos = this.getWorldPoint();

    this.entity.setPosition(pos);

    this.entity.lookAt(this.originEntity.getPosition());
};


MobileCameraController.prototype.onTouchStart = function (event) {
    // We only care about the first touch. As the user touches the screen, 
    // we stored the current touch position

    var touch;
    if (event.touches.length === 1 || event.touches[0].x > event.touches[1].x) {
        touch = event.touches[0];
    } else {
        touch = event.touches[1];
    }
    this.lastTouchPosition.set(touch.x, touch.y);
    this.app.firstTouch = true;
};


MobileCameraController.prototype.onTouchMove = function (event) {
    // Touch coordinates are canvas-relative; on iOS screen.width stays the portrait width in landscape.
    let width = this.app.graphicsDevice.canvas.clientWidth;
    if (this.horizontal == false) {
        //width = window.screen.height;
    }
    var touch;
    if (event.touches.length === 1 && event.touches[0].x > width / 2) {
        touch = event.touches[0];
    } else if (event.touches.length === 2) {
        if (event.touches[0].x > event.touches[1].x && event.touches[0].x > width / 2) {
            touch = event.touches[0];
        } else if (event.touches[1].x > width / 2) {
            touch = event.touches[1];
        } else {
            return;
        }
    } else {
        return;
    }

    this.moveCamera((touch.x - this.lastTouchPosition.x), (touch.y - this.lastTouchPosition.y), this.touchLookSensitivity);
    this.lastTouchPosition.set(touch.x, touch.y);
};


MobileCameraController.prototype.getYaw = function () {
    var forward = this.entity.forward.clone();
    return Math.atan2(-forward.x, -forward.z);
};

MobileCameraController.prototype.getYaw2 = function (quat) {
    let transformedForward = new pc.Vec3();
    quat.transformVector(pc.Vec3.FORWARD, transformedForward);
    return Math.atan2(-transformedForward.x, -transformedForward.z) * pc.math.RAD_TO_DEG;
};

MobileCameraController.prototype.getPitch = function (quaternion, yaw) {
    var quatWithoutYaw = this._tempQuat1;
    var yawOffset = this._tempQuat2;

    yawOffset.setFromEulerAngles(0, -yaw, 0);
    quatWithoutYaw.mul2(yawOffset, quaternion);

    var transformedForward = this._tempVec3_1;

    quatWithoutYaw.transformVector(pc.Vec3.FORWARD, transformedForward);

    return Math.atan2(transformedForward.y, -transformedForward.z);
};

MobileCameraController.prototype.getWorldPoint = function () {
    var from = this.entity.parent.getPosition();
    var to = this.rayEnd.getPosition();

    var hit = this.app.systems.rigidbody.raycastFirstByTag(from, to, "Ground");
    if (hit)
        return hit.point.clone().add(this.entity.forward.scale(0.2));
    return to
    /*
        var hit = this.app.systems.rigidbody.raycastFirst(from, to);
    
        if (hit && (hit.entity.tags.has('Ground') || hit.entity.tags.has('Dead'))) {
            return hit.point;
        }
    
        return to;*/
};
