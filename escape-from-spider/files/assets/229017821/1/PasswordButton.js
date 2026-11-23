var PasswordButton = pc.createScript('passwordButton');
PasswordButton.attributes.add("number", { type: "number" })

PasswordButton.prototype.initialize = function () {
    this.startScale = this.entity.getLocalScale().clone();

    this.entity.button.on("click", () => {
        if (this.number == 10) this.app.fire("PasswordDone");
        else this.app.fire("PasswordButtonClick", this.number);

        this.entity.setLocalScale(this.startScale);

        let mul = 1.15;
        let targetScale = new pc.Vec3(this.startScale.x * mul, this.startScale.y * mul, this.startScale.z * mul);

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
        this.entity.sound.play("press");
    })
};