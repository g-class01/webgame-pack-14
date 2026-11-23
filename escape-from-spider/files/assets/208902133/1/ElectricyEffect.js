var ElectricyEffect = pc.createScript('electricyEffect');
ElectricyEffect.attributes.add("duration", { type: "number", default: 1 })
ElectricyEffect.attributes.add("startDelay", { type: "number", default: 0 })

ElectricyEffect.prototype.initialize = function () {
    for (let i = 0; i < this.entity.children.length; i++) {
        this.entity.children[i].enabled = false;
    }

    this.entity.setLocalScale(pc.Vec3.ZERO);

    this.startPos = this.entity.getLocalPosition().clone();

    setTimeout(() => {
        this.effectLoop();
    }, this.startDelay * 1000);
};

ElectricyEffect.prototype.effectLoop = function () {
    this.randomMesh();

    this.entity
        .tween(this.entity.getLocalScale())
        .to(pc.Vec3.ONE, this.duration, pc.SineOut)
        .onUpdate((dt) => {
            if (!this.rate) this.rate = 0;
            this.rate += dt;
            if (this.rate > .2) {
                this.rate = 0;
                this.randomMesh();
                this.entity.setLocalPosition(new pc.Vec3(
                    this.startPos.x + Math.random() * -100,
                    this.startPos.y + Math.random() * -100,
                    this.startPos.z + Math.random() * 1,
                ))
            }
        })
        .onComplete(() => {
            this.rate = 0;
            //this.entity.setLocalScale(pc.Vec3.ZERO);
            //this.effectLoop();
        })
        .yoyo(true)
        .loop(true)
        .start();
};

ElectricyEffect.prototype.randomMesh = function () {
    if (this.mesh) this.mesh.enabled = false;
    this.mesh = this.entity.children[Math.floor(Math.random() * this.entity.children.length)];
    this.mesh.enabled = true;
};