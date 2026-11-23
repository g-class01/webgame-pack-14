var LookAtCamera = pc.createScript('lookAtCamera');
LookAtCamera.attributes.add('angle', { type: 'vec3', default: [180, 0, 180] });

LookAtCamera.prototype.initialize = function () {
    this.camera = this.app.root.findByName("Camera");
};

LookAtCamera.prototype.postUpdate = function (dt) {
    if (this.camera == null || this.camera == undefined) {
        this.camera = this.app.root.findByName("Camera");
    }

    this.entity.lookAt(this.camera.getPosition().clone());
    this.entity.rotateLocal(this.angle.x, this.angle.y, this.angle.z);
};