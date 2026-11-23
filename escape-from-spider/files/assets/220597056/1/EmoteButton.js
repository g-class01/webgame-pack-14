var EmoteButton = pc.createScript('emoteButton');

EmoteButton.prototype.init = function (index) {
    this.index = index;
    this.entity.button.on("click", () => {
        this.app.player.controller.emote(this.index);
        this.app.fire("CloseMenu", "Emote", false);
    });
};

var EmoteList = {
    0: {
        assetId: 220594227
    },
    1: {
        assetId: 220594196
    },
    2: {
        assetId: 220594218,
    },
    3: {
        assetId: 220594186
    },
    4: {
        assetId: 220594210
    },
    5: {
        assetId: 220594189
    },
    6: {
        assetId: 220594174
    },
    7: {
        assetId: 220594184
    },
    8: {
        assetId: 220594190
    },
    9: {
        assetId: 220594224
    },
    10: {
        assetId: 220594257
    },
    11: {
        assetId: 220594244
    },
    12: {
        assetId: 220594255
    },
    13: {
        assetId: 220594185
    },
    14: {
        assetId: 220594212
    },
    15: {
        assetId: 220594223
    },
    16: {
        assetId: 220594157
    },
    17: {
        assetId: 220594261
    },
    18: {
        assetId: 220594233
    },
    19: {
        assetId: 220594229
    }
}