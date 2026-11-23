var CutsceneController = pc.createScript('cutsceneController');
CutsceneController.attributes.add('gameUI', {
    type: 'entity',
});
CutsceneController.attributes.add('skipButton', {
    type: 'entity',
});
// initialize code called once per entity
CutsceneController.prototype.initialize = function () {
    this.pcControlsOnboarding = this.gameUI.findByName("PCControlsOnboarding");
    let cutsceneSave = Utils.getItem("ChapterOneCutscene");
    if (cutsceneSave == null) {
        this.app.isPlayingCutscene = true;
        Utils.setItem("ChapterOneCutscene", 1);
        this.gameUI.enabled = false;
        this.entity.children[0].enabled = true;
        this.timeout = setTimeout(() => {
            this.entity.children[0].enabled = false;
            this.gameUI.enabled = true;
            this.app.isPlayingCutscene = false;
            if (this.app.touch == null) {
                this.pcControlsOnboarding.enabled = true;
                this.pcControlsOnboarding.children[0].enabled = true;
                setTimeout(() => {
                    this.pcControlsOnboarding.children[0].enabled = false;
                    this.pcControlsOnboarding.children[1].enabled = true;
                    setTimeout(() => {
                        this.pcControlsOnboarding.children[1].enabled = false;
                    }, 7000);
                }, 7000);
            }
        }, 10000);
    } else {
        this.app.isPlayingCutscene = false;
        this.gameUI.enabled = true;
    }

    this.skipButton.button.on('click', function (event) {
        this.skip();
    }, this);

    this.entity.on("destroy", () => {
        clearTimeout(this.timeout);
    });
};

CutsceneController.prototype.update = function (dt) {
    if (this.app.isPlayingCutscene && this.app.keyboard.wasPressed(pc.KEY_SPACE)) {
        this.skip();
    }
};

CutsceneController.prototype.skip = function () {
    clearTimeout(this.timeout);
    this.entity.children[0].sound.stop();
    this.entity.children[0].enabled = false;
    this.gameUI.enabled = true;
    this.app.isPlayingCutscene = false;
    if (this.app.touch == null) {
        this.pcControlsOnboarding.enabled = true;
        this.pcControlsOnboarding.children[0].enabled = true;
        setTimeout(() => {
            this.pcControlsOnboarding.children[0].enabled = false;
            this.pcControlsOnboarding.children[1].enabled = true;
            setTimeout(() => {
                this.pcControlsOnboarding.children[1].enabled = false;

            }, 7000);
        }, 7000);
    }
};