var LookAtCameraExtended = pc.createScript('lookAtCameraExtended');
LookAtCameraExtended.attributes.add('angle', {
    type: 'vec3',
    default: [180, 0, 180]
});
LookAtCameraExtended.attributes.add('isYLocked', {
    type: 'boolean',
    default: false
});
LookAtCameraExtended.attributes.add('isXLocked', {
    type: 'boolean',
    default: false
});

// initialize code called once per entity
LookAtCameraExtended.prototype.initialize = function () {
    this.camera = this.app.root.findByName("Camera");
};

// update code called every frame
LookAtCameraExtended.prototype.update = function (dt) {
    if (this.isXLocked) {
        this.entity.lookAt(this.camera.getPosition().x, this.camera.getPosition().y, this.camera.getPosition().z);
        this.entity.setLocalEulerAngles(this.getYaw2(this.entity.getLocalRotation()), 0, 0);
    } else {
        this.entity.lookAt(this.camera.getPosition());
        this.entity.rotateLocal(this.angle.x, this.angle.y, this.angle.z);
        if (this.isYLocked) {
            this.entity.setLocalEulerAngles(0, this.getYaw(this.entity.getLocalRotation()), 0);
        }
    }

};

LookAtCameraExtended.prototype.getYaw = function (quat) {
    const transformedForward = new pc.Vec3();
    quat.transformVector(pc.Vec3.FORWARD, transformedForward);
    return Math.atan2(-transformedForward.x, -transformedForward.z) * pc.math.RAD_TO_DEG;
};


LookAtCameraExtended.prototype.getYaw2 = function (quat) {
    const transformedForward = new pc.Vec3();
    quat.transformVector(pc.Vec3.FORWARD, transformedForward);
    return Math.atan2(transformedForward.y, -transformedForward.z) * pc.math.RAD_TO_DEG;
};