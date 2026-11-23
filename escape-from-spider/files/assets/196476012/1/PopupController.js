var PopupController = pc.createScript('popupController');

// initialize code called once per entity
PopupController.prototype.initialize = function () {
    this.popup = this.entity.children[0];
    this.closeButton = this.popup.children[0];
    this.title = this.popup.children[1].element;
    this.desc = this.popup.children[2].element;
    this.yesButton = this.popup.children[3].children[1];
    this.noButton = this.popup.children[3].children[0];

    this.app.on("popupController:showPopup", this.showPopup, this);

    this.on('destroy', function () {
        this.app.off("popupController:showPopup", this.showPopup, this);
    }, this);
};

//noEvent == closePopup gelirse popup'i kapat
PopupController.prototype.showPopup = function (title, desc, isYesNoQuestion, callerEntity, yesEvent, noEvent, data, isAd) {
    if (isYesNoQuestion) {
        this.yesButton.enabled = true;
        this.noButton.enabled = true;
    } else {
        this.noButton.enabled = false;
    }

    if (isAd === true) {
        this.yesButton.children[0].children[1].enabled = true;
    } else {
        this.yesButton.children[0].children[1].enabled = false;
    }

    this.title.text = title;
    this.desc.text = desc;

    this.removeListeners();

    this.closeButton.button.on('click', function (event) {
        if (noEvent !== "closePopup") {
            callerEntity.fire(noEvent, data);
        }
        this.setTween(false);
    }, this);

    this.yesButton.button.on('click', function (event) {
        callerEntity.fire(yesEvent, data);
        this.setTween(false);
    }, this);

    this.noButton.button.on('click', function (event) {
        this.closeButton.button.fire('click', event);
    }, this);

    this.setTween(true);
};

PopupController.prototype.setTween = function (state) {
    if (state) {
        if (this.app.gamePlayStarted === true && this.app.isWatchingAd === false) {
            PokiSDK.gameplayStop();
            this.app.gamePlayStarted = false;
        }
    }
    this.popup.enabled = true;
    if (state) {
        this.app.fire("PlaySound", "uiOpen");
        this.app.fire("lockCamera", true);
        this.popup.enabled = true;
        this.app.isPopupEnabled = true;
        this.app.network.blackBackground.enabled = true;
        this.data = { value: 0 };
        this.app.network.blackBackground
            .tween(this.data).to({ value: 0.5 }, 0.2, pc.SineOut)
            .onUpdate((dt) => {
                this.app.network.blackBackground.element.opacity = this.data.value;
            })
            .start();

        this.popup.setLocalScale(new pc.Vec3(0.9, 0.9, 0.9));
        this.popup.tween(this.popup.getLocalScale()).to(new pc.Vec3(1, 1, 1), 0.2, pc.SineOut).start();
    } else {
        this.app.fire("PlaySound", "uiClose");
        this.app.fire("lockCamera", this.app.petUiEnabled);
        this.app.isPopupEnabled = false;
        this.removeListeners();
        this.popup.setLocalScale(new pc.Vec3(1, 1, 1));
        this.popup.tween(this.popup.getLocalScale()).to(new pc.Vec3(0.5, 0.5, 0.5), 0.1, pc.SineOut).start();

        this.data = { value: 0.5 };
        this.app.network.blackBackground
            .tween(this.data).to({ value: 0 }, 0.1, pc.SineOut)
            .onUpdate((dt) => {
                this.app.network.blackBackground.element.opacity = this.data.value;
            })
            .onComplete(() => {
                this.app.network.blackBackground.enabled = false;
                this.popup.enabled = false;
                this.app.isPopupEnabled = false;
            })
            .start();
    }
};

PopupController.prototype.removeListeners = function () {
    this.closeButton.button.off('click');
    this.yesButton.button.off('click');
    this.noButton.button.off('click');
}