var CameraController = pc.createScript('cameraController');

CameraController.attributes.add('mouseSpeed', { type: 'number', default: 1.4, description: 'Mouse Sensitivity' });
CameraController.attributes.add('restAngle', { type: 'number', default: 0 });
CameraController.attributes.add('carAngleX', { type: 'number', default: 0.65 });
CameraController.attributes.add('carAngleZ', { type: 'number', default: -0.25 });
CameraController.attributes.add('carAngleX2', { type: 'number', default: 0 });
CameraController.attributes.add('carAngleZ2', { type: 'number', default: -2 });
// Called once after all resources are loaded and before the first update
CameraController.prototype.initialize = function () {
    //this.networkManager = this.app.root.findByName("NetworkManager").script.networkManager;
    this.eventsAdded = false;
    this.eulers = new pc.Vec3(180, 10, 0);
    this.touchCoords = new pc.Vec2();
    this.app.firstTouch = false;
    this.lastAFKCheck = 0;
    this.rayEnd = this.entity.parent.findByName('RaycastEndPoint');
    this.originEntity = this.entity.parent;
    this.isHoldingRightMouse = false;
    this.app.mouse.disableContextMenu();
    this.getMouseZoomFromStorage();
    this.onOrientationChange();
    this._onOrientationChange = this.onOrientationChange.bind(this);
    window.addEventListener("resize", this._onOrientationChange, false);
    window.addEventListener("orientationchange", this._onOrientationChange, false);
    this.app.mouse.on("mousemove", this.onMouseMoveAFKCheck, this);
    this.app.mouse.on("mousemove", this.onMouseMove, this);
    this.app.mouse.on("mousedown", this.onMouseDown, this);
    this.app.mouse.on("mouseup", this.onMouseUp, this);
    this.app.mouse.on(pc.EVENT_MOUSEWHEEL, this.onMouseWheel, this);

    this.app.on('EnterFPS', this.enterFps, this);

    this.app.on('ExitFPS', this.exitFps, this);

    this.on('destroy', function () {
        this.app.off('EnterFPS', this.enterFps, this);
        this.app.off('ExitFPS', this.exitFps, this);
        this.app.mouse.off("mousemove", this.onMouseMoveAFKCheck, this);
        this.app.mouse.off("mousemove", this.onMouseMove, this);
        this.app.mouse.off("mousedown", this.onMouseDown, this);
        this.app.mouse.off("mouseup", this.onMouseUp, this);
        this.app.mouse.off(pc.EVENT_MOUSEWHEEL, this.onMouseWheel, this);
        window.removeEventListener("orientationchange", this._onOrientationChange);
        window.removeEventListener("resize", this._onOrientationChange);
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('wheel', this._onWheel);
    }, this);

    this._onKeyDown = ev => {
        if (['ArrowDown', 'ArrowUp', ' '].includes(ev.key)) {
            ev.preventDefault();
        }
    };
    this._onWheel = ev => ev.preventDefault();
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('wheel', this._onWheel, { passive: false });
};


CameraController.prototype.enterFps = function () {
    this.app.isFPS = true;
    this.app.mouseScroll = 0;
    Utils.setItem("mouseScroll", this.app.mouseScroll);
    Utils.setItem("isFPS", true);
}

CameraController.prototype.exitFps = function () {
    this.app.isFPS = false;
    Utils.setItem("isFPS", false);
}


CameraController.prototype.resetCamera = function () {
    this.rayEnd = this.entity.parent.findByName('RaycastEndPoint');
    this.originEntity = this.entity.parent;
    console.log("origin", this.originEntity.parent.name)
    this.reset();
}

CameraController.prototype.onOrientationChange = function () {
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

CameraController.prototype.reset = function () {
    this.eulers.x = this.restAngle;
};

CameraController.prototype.getYaw = function (quat) {
    let transformedForward = new pc.Vec3();
    quat.transformVector(pc.Vec3.FORWARD, transformedForward);
    return Math.atan2(-transformedForward.x, -transformedForward.z) * pc.math.RAD_TO_DEG;
};

CameraController.prototype.getMouseZoomFromStorage = function () {
    let zoom = Number.parseFloat(Utils.getItem("mouseScroll"));
    if (zoom != null && isNaN(zoom) == false) {
        this.app.mouseScroll = zoom;
    } else {
        this.app.mouseScroll = 4;
    }
};

CameraController.prototype.setMouseZoom = function (dt) {
    let extraZoom = this.app.isWendigo ? 8 : 0;

    if (this.app.player.controller.isGrabbedBySpider) {
        const tempPos = this.rayEnd.getLocalPosition();
        this.oldTempPos = pc.math.lerp(tempPos.z, this.app.mouseScroll + 4 + extraZoom, 20 * dt);
        tempPos.z = this.oldTempPos;
        this.rayEnd.parent.getLocalPosition().y = 1.5;
        this.rayEnd.parent.getLocalPosition().z = 0;
        this.rayEnd.parent.getLocalPosition().x = 0;
        this.rayEnd.setLocalPosition(tempPos);
    }
    else if (this.app.isFPS) {
        const tempPos = this.rayEnd.getLocalPosition();
        this.oldTempPos = pc.math.lerp(tempPos.z, 0.1, 20 * dt);
        this.rayEnd.parent.getLocalPosition().y = 1.5;
        this.rayEnd.parent.getLocalPosition().z = 0;
        this.rayEnd.parent.getLocalPosition().x = 0;

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

CameraController.prototype.onMouseWheel = function (event) {
    if (this.app.lockedFPS) return;
    if (this.app.marketEnabled) return;
    if (this.app.caseScreen) return;

    if (event.wheelDelta > 0)
        this.app.mouseScroll += 1;
    else
        this.app.mouseScroll -= 1;

    if (this.app.mouseScroll < 0)
        this.app.mouseScroll = 0;
    if (this.app.mouseScroll > 16)
        this.app.mouseScroll = 16;

    if (this.app.mouseScroll <= 0) {
        if (!this.app.isSpider)
            this.app.fire("EnterFPS");
    } else {
        this.app.fire("ExitFPS");
    }
    Utils.setItem("mouseScroll", this.app.mouseScroll);
};

CameraController.prototype.setSensitivity = function () {
    /*
    const data = parseInt(BikeObby_Utils.getItem("mouseSensitivity"));
    if (data != null && isNaN(data) == false) {
        this.mouseSpeed = data / 3;
    } else {
        this.mouseSpeed = 10;
    }
    */
};

CameraController.prototype.removeEventCallbacks = function () {
    if (this.eventsAdded == true) {
        this.eventsAdded = false;
        this.app.mouse.off("mousemove", this.onMouseMove, this);
        this.app.mouse.off("mousedown", this.onMouseDown, this);
        this.app.mouse.off("mouseup", this.onMouseUp, this);
    }
};

CameraController.prototype.addEventCallbacks = function () {
    if (this.eventsAdded == false) {
        this.eventsAdded = true;
        this.app.mouse.on("mousemove", this.onMouseMove, this);
        this.app.mouse.on("mousedown", this.onMouseDown, this);
        this.app.mouse.on("mouseup", this.onMouseUp, this);
    }
};


CameraController.prototype.postUpdate = function (dt) {
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

CameraController.prototype.onMouseMoveAFKCheck = function (e) {
    if (Date.now() > this.lastAFKCheck) {
        this.lastAFKCheck = Date.now() + 2000;
        if (this.app.room) {
            this.app.room.send("Client:NotAFK");
        }
    }
};

CameraController.prototype.onMouseMove = function (e) {
    if (this.app.isPlayingCutscene)
        return;

    if (this.app.isSDKReady) {
        const gameplayStartCheck = this.app.gamePlayStarted || this.app.isPopupEnabled || this.app.isWatchingAd
            || this.app.anyMenuEnabled() || this.app.rewardedPanelEnabled || this.app.player.controller.isDied || this.app.gameEnded;

        if (!gameplayStartCheck) {
            this.app.gamePlayStarted = true;
            PokiSDK.gameplayStart();
        }
    }

    var dx = Math.min(Math.max(e.dx, -50), 50);
    var dy = Math.min(Math.max(e.dy, -50), 50);

    this.eulers.x -= (((this.mouseSpeed + this.app.sensitivity) * dx) / 60) % 360;
    this.eulers.y += (((this.mouseSpeed + this.app.sensitivity) * dy) / 60) % 360;

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

CameraController.prototype.onMouseUp = function (e) {
    this.app.mousePressing = false;

    if (e.button === pc.MOUSEBUTTON_LEFT)
        this.app.mouseLeft = false;
};

CameraController.prototype.onMouseDown = function (e) {
    this.app.firstTouch = true;
    this.app.mousePressing = true;

    if (e.button === pc.MOUSEBUTTON_LEFT)
        this.app.mouseLeft = true;
};

CameraController.prototype.getWorldPoint = function () {
    var from = this.entity.parent.getPosition();
    var to = this.rayEnd.getPosition();
    //var hit = this.app.systems.rigidbody.raycastFirst(from, to);
    var hit = this.app.systems.rigidbody.raycastFirstByTag(from, to, "Ground");
    if (hit)
        return hit.point.clone().add(this.entity.forward.scale(0.2));
    return to
    /*
        if (hit && (hit.entity.tags.has('Ground') || hit.entity.tags.has('Dead'))) {
            return hit.point;
        }
    
        return to;*/
};
