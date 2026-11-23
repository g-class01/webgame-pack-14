var EmoteManager = pc.createScript('emoteManager');
EmoteManager.attributes.add("emotePanel", { type: "entity" });

EmoteManager.prototype.initialize = function () {
    this.emotePanelSlots = this.emotePanel.findByName("Slots");
    for (let i = 0; i < this.emotePanelSlots.children.length; i++) {
        this.emotePanelSlots.children[i].script.emoteButton.init(i);
    }
    this.extraEmoteLock = this.emotePanel.findByName("ExtraEmoteLock");
    if (Utils.getItem("isExtraEmote")) {
        this.extraEmoteLock.enabled = false;
    }
    this.extraEmoteLock.button.on("click", () => {
        watchRewarded(() => {
            this.extraEmoteLock.enabled = false;
            Utils.setItem("isExtraEmote", true);
            this.playSound("bought");
        }, "large", false)
    });
    eventSubscribe(this, "EmotePanelOpen", this.onOpen);
    eventSubscribe(this, "EmotePanelClose", this.onClose);
};

EmoteManager.prototype.playSound = function (soundName, randomPitch = false) {
    if (this.entity.sound == null) return;
    this.slot = this.entity.sound.slot(soundName);
    if (this.slot == null) return;
    if (randomPitch) {
        this.slot.pitch = pc.math.random(0.8, 1.2);
    }
    this.slot.play();
};

EmoteManager.prototype.onOpen = function () {
    this.playSound("popup");
}

EmoteManager.prototype.onClose = function () {
    //this.playSound("closepopup");
}