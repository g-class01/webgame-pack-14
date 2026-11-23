var EventButton = pc.createScript('eventButton');
EventButton.attributes.add("event", { type: "string" })
EventButton.attributes.add("tweenAnim", { type: "boolean" })

EventButton.prototype.initialize = function () {
    if (this.tweenAnim) {
        this.startScale = this.entity.getLocalScale().clone();
    }

    this.entity.button.on("click", () => {
        if (this.event)
            this.app.fire(this.event);

        if (this.tweenAnim) {
            let mul = 1.15;
            let targetScale = new pc.Vec3(this.startScale.x * mul, this.startScale.y * mul, this.startScale.z * mul);

            this.entity.setLocalScale(this.startScale);

            this.entity
                .tween(this.entity.getLocalScale())
                .to(targetScale, .1, pc.SineOut)
                .onComplete(() => {
                    this.entity
                        .tween(this.entity.getLocalScale())
                        .to(this.startScale, .1, pc.SineOut)
                        .start();
                })
                .start();
        }
    });
};