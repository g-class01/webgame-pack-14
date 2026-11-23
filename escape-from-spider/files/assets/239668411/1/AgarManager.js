var AgarManager = pc.createScript('agarManager');
AgarManager.attributes.add("exitzone", { type: "entity" });
AgarManager.attributes.add("feedsParent", { type: "entity" });

// Radius of the sphere trigger each feed used to have.
AgarManager.FEED_RADIUS = 2;

AgarManager.prototype.initialize = function () {
    this.app.agar = this;

    for (let i = 0; i < this.exitzone.children.length; i++) {
        let child = this.exitzone.children[i];

        child.collision.on("triggerenter", (other) => {
            if (!other.tags.has("Player")) return;
            if (this.app.exitzone) return;

            this.app.exitzone = true;
            this.app.network.safezoneCollider.enabled = true;
            this.app.fire('WarningTextController:setWarning', "You are out of the safe area!", 5, new pc.Color(1, 1, 0, 1));
        })
    }

    this.initFeeds();

    eventSubscribe(this, "Connected", this.onListen);

    if (this.app.touch)
        this.app.touch.on(pc.EVENT_TOUCHSTART, this.onTouchStart, this);

    this.entity.on("destroy", () => {
        if (this.app.touch)
            this.app.touch.off(pc.EVENT_TOUCHSTART, this.onTouchStart, this);
        for (const group of this.feedGroups) group.vertexBuffer.destroy();
    }, this);
};

// The 400 feeds were 400 draw calls. Their own render components are switched
// off and every material group is drawn as one instanced mesh instead.
AgarManager.prototype.initFeeds = function () {
    this.feeds = this.feedsParent.children.slice();
    this.feedPositions = this.feeds.map(feed => feed.getPosition().clone());
    this.feedInside = this.feeds.map(() => false);
    this.feedGroups = [];

    const device = this.app.graphicsDevice;
    const groupsByMaterial = new Map();
    const aabb = new pc.BoundingBox();

    for (let i = 0; i < this.feeds.length; i++) {
        const feed = this.feeds[i];
        const meshInstance = feed.render.meshInstances[0];

        let group = groupsByMaterial.get(meshInstance.material);
        if (!group) {
            group = { mesh: meshInstance.mesh, material: meshInstance.material, layers: feed.render.layers, feeds: [] };
            groupsByMaterial.set(meshInstance.material, group);
            this.feedGroups.push(group);
        }
        group.feeds.push(feed);
        feed.feedGroup = group;
        feed.render.enabled = false;

        if (i === 0) aabb.copy(meshInstance.aabb);
        else aabb.add(meshInstance.aabb);
    }

    for (const group of this.feedGroups) {
        group.matrices = new Float32Array(group.feeds.length * 16);
        group.vertexBuffer = new pc.VertexBuffer(device, pc.VertexFormat.getDefaultInstancingFormat(device), group.feeds.length, {
            usage: pc.BUFFER_DYNAMIC
        });
        group.meshInstance = new pc.MeshInstance(group.mesh, group.material);
        group.meshInstance.setInstancing(group.vertexBuffer);
        group.meshInstance.setCustomAabb(aabb);

        const entity = new pc.Entity("FeedsInstanced");
        entity.addComponent("render", { meshInstances: [group.meshInstance], layers: group.layers });
        this.feedsParent.parent.addChild(entity);
        group.entity = entity;

        this.refreshFeedGroup(group);
    }
};

AgarManager.prototype.refreshFeedGroup = function (group) {
    group.dirty = false;
    let count = 0;
    for (const feed of group.feeds) {
        if (!feed.enabled) continue;
        group.matrices.set(feed.getWorldTransform().data, count * 16);
        count++;
    }
    group.vertexBuffer.setData(group.matrices);
    group.meshInstance.instancingCount = count;
};

AgarManager.prototype.setFeedEnabled = function (index, enabled) {
    const feed = this.feeds[index];
    if (!feed || feed.enabled === enabled) return;
    feed.enabled = enabled;
    feed.feedGroup.dirty = true;
};

AgarManager.prototype.onTouchStart = function () {
    if (this.app.gameEnded)
        this.restart();
}

AgarManager.prototype.onListen = function () {
    if (!this.app.room) return;

    let stateArray = Array.from(this.app.room.state.agarFeeds);
    for (let i = 0; i < this.feeds.length; i++) {
        this.setFeedEnabled(i, stateArray[i]);
    }

    this.app.room.state.agarFeeds.onChange((value, index) => {
        this.setFeedEnabled(index, value);
    })

    this.app.room.onMessage("Agar:PlayerEaten", (message) => {
        if (message.eatenPlayer == this.app.room.sessionId) {
            this.app.player.controller.takeDamage(100);
        }

        if (message.player == this.app.room.sessionId) {
            this.app.player.controller.agarModels[this.app.player.controller.agarLevel].sound.pitch = 0.8 + Math.random() * 0.4;
            this.app.player.controller.agarModels[this.app.player.controller.agarLevel].sound.play("Eat");
        }
        else {
            let remote = this.app.network.remotePlayers[message.player].remotePlayerController;
            remote.agarModels[remote.agarLevel].sound.pitch = 0.8 + Math.random() * 0.4;
            remote.agarModels[remote.agarLevel].sound.play("Eat");
        }
    });

    this.app.room.onMessage("type", (message) => {

    });
}

AgarManager.prototype.restart = async function () {
    if (!this.app.gameEnded) return;
    if (this.isRestarting) return;
    this.isRestarting = true;
    this.app.ambienceManager.stop();
    this.app.musicPlayer.stop();
    if (this.app.room) await this.app.room.leave();
    this.app.scenes.changeScene('Chapter1');
    this.app.gameEnded = false;
}

AgarManager.prototype.update = function (dt) {
    if (this.app.gameEnded && pc.app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) {
        this.restart();
    }

    this.checkFeeds();

    for (const group of this.feedGroups) {
        if (group.dirty) this.refreshFeedGroup(group);
    }
}

// Same overlap the feed triggers reported: the player's upright cylinder
// against a sphere of FEED_RADIUS around each feed, sent once per entry like
// triggerenter. Death and round end disable the player's collision, which
// also stopped the old triggers.
AgarManager.prototype.checkFeeds = function () {
    const player = this.app.player && this.app.player.entity;
    if (!this.app.room || this.app.gameEnded || !player || !player.enabled || !player.collision || !player.collision.enabled) {
        this.feedInside.fill(false);
        return;
    }

    const collision = player.collision;
    const position = player.getPosition();
    const centerX = position.x + collision.linearOffset.x;
    const centerY = position.y + collision.linearOffset.y;
    const centerZ = position.z + collision.linearOffset.z;
    const halfHeight = collision.height / 2;
    const radius = collision.radius;
    const maxDistanceSq = AgarManager.FEED_RADIUS * AgarManager.FEED_RADIUS;

    for (let i = 0; i < this.feeds.length; i++) {
        if (!this.feeds[i].enabled) {
            this.feedInside[i] = false;
            continue;
        }

        const feedPosition = this.feedPositions[i];
        const dx = feedPosition.x - centerX;
        const dz = feedPosition.z - centerZ;
        const outsideXZ = Math.max(0, Math.sqrt(dx * dx + dz * dz) - radius);
        const outsideY = Math.max(0, Math.abs(feedPosition.y - centerY) - halfHeight);
        const inside = outsideXZ * outsideXZ + outsideY * outsideY <= maxDistanceSq;
        const entered = inside && !this.feedInside[i];
        this.feedInside[i] = inside;
        if (!entered) continue;

        this.app.room.send("AgarFeed", {
            id: i,
            scalePoint: this.feeds[i].script.agarFeed.scalePoint
        });
    }
}
