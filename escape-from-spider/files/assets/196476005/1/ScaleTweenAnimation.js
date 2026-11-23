var ScaleTweenAnimation = pc.createScript('scaleTweenAnimation');
ScaleTweenAnimation.attributes.add("toScale", { type: "vec3" });
ScaleTweenAnimation.attributes.add("time", { type: "number", default: 1 })
ScaleTweenAnimation.attributes.add("isYoyo", { type: "boolean" })
ScaleTweenAnimation.attributes.add("repeat", { type: "number" })
ScaleTweenAnimation.attributes.add("scaleParent", { type: "boolean" })

ScaleTweenAnimation.prototype.initialize = function () {
    this.isActive = false;
    this.entity.on("eventFire", this.onListen, this);
};

ScaleTweenAnimation.prototype.onListen = function (dt) {
    if (this.isActive == false) {
        this.isActive = true;
        if (this.scaleParent) {
            this.entity.parent
                .tween(this.entity.parent.getLocalScale())
                .to(this.toScale, this.time, pc.SineOut)
                .yoyo(this.isYoyo)
                .repeat(this.repeat)
                .onComplete(() => {
                    this.isActive = false;
                })
                .start();
        } else {
            this.entity
                .tween(this.entity.getLocalScale())
                .to(this.toScale, this.time, pc.SineOut)
                .yoyo(this.isYoyo)
                .repeat(this.repeat)
                .onComplete(() => {
                    this.isActive = false;
                })
                .start();
        }
    }
};
