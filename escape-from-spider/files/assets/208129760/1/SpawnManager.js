var SpawnManager = pc.createScript('spawnManager');

const Chapters = {
    One: "Chapter1",
    Two: "Chapter2",
    Three: "Chapter3",
};

const chapterConfigs = {
    Chapter1: ["Cutter", "LockedCase", "Paper", "BlueKey", "RedKey", "Snake", "Wrench", "Coin"],
    Chapter2: ["LockedCase", "Paper", "CableRed", "CableGreen"],
    Chapter3: ["GliderSeat", "GliderWing", "GliderPropeller", "GliderEngine", "Grenade"],
};

function getCurrentChapter() {
    return pc.app.networkManager.currentSceneName;
}

function getCurrentChapterTags() {
    let chapterName = getCurrentChapter();
    if (chapterName == "game") {
        chapterName = "Chapter1";
    }
    return chapterConfigs[chapterName] || [];
}

SpawnManager.prototype.initialize = function () {
    SpawnManager.Instance = this;
    this.entitiesByTag = {};
    this.activeEntities = {};
    this.currentList = null;

    const tags = getCurrentChapterTags(this.app);
    for (let tag of tags) {
        this.entitiesByTag[tag] = this.app.root.findByTag(["Spawn", tag]);
    }

    eventSubscribe(this, "GenerateSpawns", this.generateSpawnPoints);
    eventSubscribe(this, "SetSpawns", this.spawn);

    this.entity.on("destroy", () => {
        clearTimeout(this.spawnManagerTimeout);
    }, this);
};

SpawnManager.prototype.generateSpawnPoints = function () {
    let usedParents = [];
    let getUniqueEntity = (list) => {
        let available = list.filter(entity => !usedParents.includes(entity.parent));
        if (!available.length) return null;
        let selected = available[Math.floor(Math.random() * available.length)];
        usedParents.push(selected.parent);
        return selected;
    };

    let list = {};
    const tags = getCurrentChapterTags(this.app);
    for (let tag of tags) {
        let entity = getUniqueEntity(this.entitiesByTag[tag]);
        if (entity) list[tag] = this.entitiesByTag[tag].indexOf(entity);
    }

    if (this.app.room) {
        this.app.room.send("Set:ItemSpawns", { list });
    } else {
        this.spawn(list);
    }
};

SpawnManager.prototype.spawn = function (list) {
    //console.log("spawns:", list);

    if (this.currentList && JSON.stringify(this.currentList) === JSON.stringify(list)) return;
    this.currentList = list;

    // Disable all previous active entities
    for (let tag in this.activeEntities) {
        if (this.activeEntities[tag]) {
            this.activeEntities[tag].enabled = false;
            this.activeEntities[tag].parent.enabled = false;
        }
    }

    this.activeEntities = {};

    const tags = getCurrentChapterTags(this.app);

    // Map lowercase list keys to actual tag names
    const tagMap = {};
    for (let tag of tags) {
        tagMap[tag.toLowerCase()] = tag;
    }

    for (let key in list) {
        const tag = tagMap[key.toLowerCase()];
        const index = list[key];
        const entityList = this.entitiesByTag[tag];

        if (entityList && index !== undefined) {
            const entity = entityList[index];
            if (entity) {
                entity.enabled = true;
                entity.parent.enabled = true;
                this.activeEntities[tag] = entity;

                // Özel işlemler
                if (tag === "Snake") entity.children[0].script.snake.init();
                if (tag === "LockedCase") this.app.lockedCase = entity.children[0].script.lockedCase;
            }
        }
    }

    this.inited = true;
    this.app.fire("RefreshTutorial");

    this.spawnManagerTimeout = setTimeout(() => {
        for (let tag in this.activeEntities) {
            if (["LockedCase", "CableRed", "CableGreen", "GliderSeat", "GliderWing", "GliderPropeller", "GliderEngine", "Grenade"].includes(tag)) continue;
            if (getCurrentChapter() == Chapters.Two && tag == "Paper") continue;

            if (this.activeEntities[tag]) {
                this.activeEntities[tag].parent.enabled = false;
            }
        }
    }, 1000);
};

