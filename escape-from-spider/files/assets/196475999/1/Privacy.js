var Privacy = pc.createScript('privacy');

// initialize code called once per entity
Privacy.prototype.initialize = function () {
    this.entity.button.on("click", this.openLink, this);
};

// update code called every frame
Privacy.prototype.openLink = function (dt) {
    window.open("https://emolingo.games/privacy");
};
