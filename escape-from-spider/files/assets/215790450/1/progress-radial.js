var ProgressRadial = pc.createScript('progressRadial');

ProgressRadial.prototype.initialize = function () {

    //create a clone of the material so alphTest value is unique
    this._element = this.entity.element;
    this._element.material = this._element.material.clone();
    this.isUse = false;
    // initialize progress to 0
    this.setProgress(0);
};


// Set progress - value is between 0 and 1
ProgressRadial.prototype.setProgress = function (value) {
    // clamp value between 0 and 1
    value = pc.math.clamp(value, 0.0, 1);

    this._progress = value;

    // 0.001 to workaround > 0 optimisation check in engine code
    this._element.material.alphaTest = value;
    this._element.material.update();
};


// Increase or decrease the progress automatically
ProgressRadial.prototype.update = function (dt) {
    if (this.isUse) {
        this.setProgress(this._progress + (dt * 0.7));

        if (this._progress >= 1) {
            this.powerup.watchAds();
        }
    } else {
        this.setProgress(0);
        this._progress = 0;

    }
};


// swap method called for script hot-reloading
// inherit your script state here
// ProgressRadial.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/