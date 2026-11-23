var SpiderEffect = pc.createScript('spiderEffect');
SpiderEffect.attributes.add('playerLights', { type: 'entity', array: true });

SpiderEffect.prototype.initialize = function () {
    this.app.on("SpiderPulseEffect", this.effect, this);
    //this.app.on("SpiderPlayerLightEffect", this.setTargetLightColor, this);

    this.opacity = 0;
    this.need = true;
    this.double = false;
    this.effectActive = false;

    // Initialize light color states
    this.currentLightColor = new pc.Color(1, 1, 1); // Default light color (white)
    this.targetLightColor = new pc.Color(1, 1, 1); // Initial target color
    this.isLerpingColor = false; // Track if lerping is active

    this.entity.on("destroy", () => {
        this.app.off("SpiderPulseEffect", this.effect, this);
        //this.app.off("SpiderPlayerLightEffect", this.setTargetLightColor, this);
    }, this);
};

SpiderEffect.prototype.update = function (dt) {
    // Opacity logic
    this.opacity = pc.math.lerp(this.opacity, 0, 2 * dt);
    this.entity.element.opacity = this.opacity;
    // A full-screen blended quad at opacity 0 still costs a draw and fill rate.
    this.entity.element.enabled = this.opacity > 0.01;

    if (this.need && ((!this.app.spiderPlayer && this.effectActive && this.app.playerSpiderDistance < 30) || (this.app.spiderPlayer && !this.app.isSpider && this.app.playerSpiderDistance < 20 && !this.app.player.controller.isGrabbedBySpider))) {
        this.need = false;
        this.opacity = 0.75;

        if (!this.double) {
            this.entity.sound.play("hearthbeat");
            this.double = true;

            setTimeout(() => {
                this.need = true;
            }, 250);
        } else {
            this.double = false;

            setTimeout(() => {
                this.need = true;
                this.entity.sound.play("hearthbeat");
            }, 1500);
        }
    }



    // Light color lerp logic
    if (this.isLerpingColor) {
        this.currentLightColor.r = pc.math.lerp(this.currentLightColor.r, this.targetLightColor.r, 3 * dt);
        this.currentLightColor.g = pc.math.lerp(this.currentLightColor.g, this.targetLightColor.g, 3 * dt);
        this.currentLightColor.b = pc.math.lerp(this.currentLightColor.b, this.targetLightColor.b, 3 * dt);

        // Check if the current color is close enough to the target color
        if (Math.abs(this.currentLightColor.r - this.targetLightColor.r) < 0.01 &&
            Math.abs(this.currentLightColor.g - this.targetLightColor.g) < 0.01 &&
            Math.abs(this.currentLightColor.b - this.targetLightColor.b) < 0.01) {
            this.isLerpingColor = false; // Stop lerping
            this.currentLightColor.copy(this.targetLightColor); // Ensure exact match
        }
        // Apply the interpolated color to all lights
        for (let i = 0; i < this.playerLights.length; i++) {
            this.playerLights[i].light.color = this.currentLightColor;
        }
    }
};

SpiderEffect.prototype.effect = function (toggle) {
    this.effectActive = toggle;
};

// Set the target color for the lights
SpiderEffect.prototype.setTargetLightColor = function (color) {
    this.targetLightColor.copy(color); // Copy the new target color
    this.isLerpingColor = true; // Enable lerping
};
