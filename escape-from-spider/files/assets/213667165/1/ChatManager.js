var ChatManager = pc.createScript('chatManager');
ChatManager.attributes.add("chatParent", { type: "entity" })
ChatManager.attributes.add("chatTemplate", { type: "asset", assetType: "template" })

const Emojis = {
    JoinedGame: 0,
    LeftGame: 1,
    PlayerSteppedTrap: 2,
    SpiderSteppedTrap: 3,
    UnlockedCase: 4,
    UnlockedBasement: 5,
    StoppedLeak: 6,
    SteppedWeb: 7,
    PlayerCaught: 8,
    PoweredRadio: 9,
    FusionPlaced: 10,
    PlayerCaughtPoison: 11,
    ExplodedWall: 12,
}

ChatManager.prototype.initialize = function () {
    this.emojis = {
        [Emojis.JoinedGame]: 214575530,
        [Emojis.LeftGame]: 214575535,
        [Emojis.PlayerSteppedTrap]: 214576905,
        [Emojis.SpiderSteppedTrap]: 214578344,
        [Emojis.UnlockedCase]: 214575667,
        [Emojis.UnlockedBasement]: 214575690,
        [Emojis.StoppedLeak]: 214575699,
        [Emojis.SteppedWeb]: 214575606,
        [Emojis.PlayerCaught]: 214576726,
        [Emojis.PoweredRadio]: 214576605,
        [Emojis.FusionPlaced]: 214576759,
        [Emojis.PlayerCaughtPoison]: 228055879,
        [Emojis.ExplodedWall]: 288361163,
    };

    eventSubscribe(this, "Connected", this.onListen);
};

ChatManager.prototype.onListen = async function () {
    if (!this.app.room) return;

    this.app.room.state.messages.onAdd(async (message) => {
        console.log("onAdd", message)
        let msg = message;
        let msgEntity = this.chatTemplate.resource.instantiate();
        msgEntity.element.text = msg.text;
        msgEntity.element.color = new pc.Color(msg.color.r / 255, msg.color.g / 255, msg.color.b / 255);
        msgEntity.reparent(this.chatParent);
        var tex = await getAsset(this.emojis[msg.emoji]);
        var tx = await tex.resource;
        var emoji = msgEntity.findByName("Emoji");   // mesaj beklerken silinmiş olabilir (sohbet temizlendi / sahne değişti)
        if (emoji && emoji.element) emoji.element.texture = tx;
    }, false);

    this.app.room.state.messages.onRemove(async (message) => {
        if (this.chatParent.children && this.chatParent.children.length > 0)
            this.chatParent.children[0].destroy();
    }, false);
}