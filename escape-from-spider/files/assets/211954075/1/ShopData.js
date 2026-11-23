var ShopData = {
    Type: {
        Skin: 0,
        Hat: 1,
        Face: 2,
        Powerup: 3,
    },

    Skins: [],
    Hats: [],
    Faces: [],
    Powerups: [],
};

class Data {
    constructor(name, price, assetId, textureId, type, isAd = false) {
        this.name = name;
        this.price = price;
        this.assetId = assetId;
        this.textureId = textureId;
        this.type = type;
        this.isAd = isAd;
        this._activeColor = -1;

        this._isBought = false;
        this._isEquipped = false;
        this._isSelected = false;

        return new Proxy(this, {
            set(target, prop, value) {
                target[prop] = value;
                Data.updateGlobal(target);
                return true;
            }
        });
    }

    get List() {
        return ShopData.Lists[this.type];
    }

    get ID() {
        return this.List.indexOf(this);
    }

    get NetworkData() { return { name: this.name, color: this.activeColor, } }
    get SaveData() { return { name: this.name, color: this.activeColor, isBought: this.isBought, isEquipped: this.isEquipped } }

    static updateGlobal(instance) {
        if (!instance || !ShopData.Lists) {
            return;
        }

        let list = ShopData.Lists[instance.type];
        let index = list.indexOf(instance);
        if (index !== -1) list[index] = instance;
    }

    get isBought() {
        return this._isBought;
    }

    set isBought(newVal) {
        this._isBought = newVal;

        if (this.slot) this.slot.priceArea.enabled = !newVal;
    }

    get isEquipped() {
        return this._isEquipped;
    }

    set isEquipped(newVal) {
        ShopData.resetEquipped(this.type);

        this._isEquipped = newVal;
        if (this.slot) this.slot.activeItem.enabled = newVal;
    }

    get isSelected() {
        return this._isSelected;
    }

    set isSelected(newVal) {
        ShopData.resetSelected();

        this._isSelected = newVal;
        if (this.slot) this.slot.selectedItem.enabled = newVal;

        if (this.type != ShopData.Type.Powerup && newVal) {
            pc.app.shop.mannequin.avatar[this.type] = this;
            pc.app.shop.mannequin.reload();
        }
    }

    get activeColor() {
        return this._activeColor;
    }

    set activeColor(newVal) {
        this._activeColor = newVal;
    }

    async getAsset() {
        return await getAsset(this.assetId);
    }

    async getTexture() {
        let txt = await getAsset(this.textureId);
        return txt.resource;
    }
}

class ColorData {
    constructor(type, assetId, textureId) {
        this.type = type;
        this.assetId = assetId;
        this.textureId = textureId;
    }

    get NetworkData() { return this.root.NetworkData }
    get SaveData() { return this.root.SaveData }

    get Index() { return this.root.colorVariants.indexOf(this); }

    async getAsset() {
        return await getAsset(this.assetId);
    }

    async getTexture() {
        let txt = await getAsset(this.textureId);
        return txt.resource;
    }
}

class SkinData extends Data {
    constructor(name, price, assetId, textureId, isAd = false) {
        super(name, price, assetId, textureId, ShopData.Type.Skin, isAd);
    }
}

class ColoredSkinData extends SkinData {
    constructor(name, price, assetId, textureId, colorVariants, isAd = false) {
        super(name, price, assetId, textureId, isAd);

        this._colorVariants = colorVariants;
        this.activeColor = 0;

        for (let color of this._colorVariants) {
            color.root = this;
        }
    }

    get colorVariants() {
        return [this, ...this._colorVariants]
    }
}

class SkinColor extends ColorData {
    constructor(assetId, textureId) {
        super(ShopData.Type.Skin, assetId, textureId);
    }
}

class HatData extends Data {
    constructor(name, price, assetId, textureId, isAd = false) {
        super(name, price, assetId, textureId, ShopData.Type.Hat, isAd);
    }
}

class ColoredHatData extends HatData {
    constructor(name, price, assetId, textureId, colorVariants, isAd = false) {
        super(name, price, assetId, textureId, isAd);

        this._colorVariants = colorVariants;
        this.activeColor = 0;

        for (let color of this._colorVariants) {
            color.root = this;
        }
    }

    get colorVariants() {
        return [this, ...this._colorVariants]
    }
}

class HatColor extends ColorData {
    constructor(assetId, textureId) {
        super(ShopData.Type.Hat, assetId, textureId);
    }
}

class FaceData extends Data {
    constructor(name, price, assetId, textureId, isAd = false) {
        super(name, price, assetId, textureId, ShopData.Type.Face, isAd);
    }

    getAsset() {
        return new Promise((resolve, reject) => {
            let dataAsset = pc.app.assets.get(this.assetId);
            if (dataAsset.loaded) {
                resolve(dataAsset.resource);
            } else {
                dataAsset.ready((asset) => {
                    resolve(asset.resource);
                });
                pc.app.assets.load(dataAsset);
            }
        });
    }
}

class PowerupData extends Data {
    constructor(name, price, itemId, textureId, isAd = false) {
        super(name, price, itemId, textureId, ShopData.Type.Powerup, isAd);
    }
}

ShopData.getByName = function (name) {
    for (let key in ShopData.Lists) {
        let data = ShopData.Lists[key].find(data => data.name === name);
        if (data) return data;
    }
    return null;
}

ShopData.getSelected = function () {
    for (let key in ShopData.Lists) {
        let data = ShopData.Lists[key].find(data => data.isSelected);
        if (data) return data;
    }
    return null;
}

ShopData.resetSelected = function () {
    for (let key in ShopData.Lists) {
        let data = ShopData.Lists[key].find(data => data.isSelected);
        if (data) {
            data._isSelected = false;
            if (data.slot) data.slot.selectedItem.enabled = false;
            return;
        }
    }
}

ShopData.getEquipped = function (type) {
    let data = ShopData.Lists[type].find(data => data.isEquipped);
    return data;
}

ShopData.resetEquipped = function (type) {
    let data = ShopData.Lists[type].find(data => data.isEquipped);
    if (data) {
        data._isEquipped = false;
        if (data.activeColor > 0) data.activeColor = 0;
        if (data.slot) data.slot.activeItem.enabled = false;
    }
}

class AvatarData {
    constructor(skin, hat, face) {
        this.skin = skin;
        this.hat = hat;
        this.face = face;

        return new Proxy(this, {
            get(target, prop) {
                if (prop == ShopData.Type.Skin) return target["skin"];
                if (prop == ShopData.Type.Hat) return target["hat"];
                if (prop == ShopData.Type.Face) return target["face"];

                if (prop in target) return target[prop];
                return undefined;
            },

            set(target, prop, value) {
                if (prop == ShopData.Type.Skin) target["skin"] = value;
                if (prop == ShopData.Type.Hat) target["hat"] = value;
                if (prop == ShopData.Type.Face) target["face"] = value;

                if (prop in target) target[prop] = value;
                return true;
            }
        });
    }

    get NetworkData() { return { skin: this.skin.NetworkData, hat: this.hat.NetworkData, face: this.face.NetworkData, } }

    equals(otherAvatar) {
        return (
            this.skin?.name === otherAvatar.skin?.name &&
            this.hat?.name === otherAvatar.hat?.name &&
            this.face?.name === otherAvatar.face?.name
        );
    }

    clone() {
        return new AvatarData(this.skin, this.hat, this.face);
    }
}

AvatarData.Default = function () {
    return new AvatarData(
        ShopData.getByName("Hoodie"),
        ShopData.getByName("Beanie"),
        ShopData.getByName("Default Face")
    );
};

// Kendi saçı olan skinler: bu skin giyilince şapka yuvasında oyuncunun şapkası yerine bu saç görünür.
// Sadece görünüş: kayıtlı ve ağa giden şapka değişmez, başka skine geçince şapka geri gelir.
ShopData.SkinHair = {
    "Skirt Girl": 212148215,   // Çift Topuz (Space Bun Hair), sarı
};

// Ekranda gösterilecek şapka: skin saçlıysa saçı, değilse oyuncunun şapkası (getAsset'i olan nesne)
ShopData.hatFor = function (skin, hat) {
    let name = skin ? (skin.root ? skin.root.name : skin.name) : null;
    let id = name ? ShopData.SkinHair[name] : null;
    if (!id) return hat;
    return { name: name + " Hair", assetId: id, getAsset: () => getAsset(id) };
};

ShopData.SaveUpdates = false;

ShopData.Init = function () {
    ShopData.Lists = {
        [ShopData.Type.Skin]: ShopData.Skins,
        [ShopData.Type.Hat]: ShopData.Hats,
        [ShopData.Type.Face]: ShopData.Faces,
        [ShopData.Type.Powerup]: ShopData.Powerups,
    };

    var avatar = AvatarData.Default();

    avatar.skin.isBought = true;
    avatar.skin.isEquipped = true;

    avatar.hat.isBought = true;
    avatar.hat.isEquipped = true;

    avatar.face.isBought = true;
    avatar.face.isEquipped = true;

    ShopData.Load();
}

ShopData.Save = function () {
    if (!ShopData.SaveUpdates) return;

    let save = { list: [] };

    const types = [
        ShopData.Type.Skin,
        ShopData.Type.Hat,
        ShopData.Type.Face,
        ShopData.Type.Powerup,
    ];

    types.forEach((type) => {
        let list = ShopData.Lists[type]

        for (let i = 0; i < list.length; i++) {
            let data = list[i];

            save.list.push(data.SaveData);
        }
    });

    Utils.setItem("Shop", JSON.stringify(save));
}

ShopData.Load = function () {
    pc.app.player.avatar = AvatarData.Default();

    let data = JSON.parse(Utils.getItem("Shop"));
    if (data != null || data != undefined) {
        let list = data.list;

        for (let i = 0; i < list.length; i++) {
            let saveData = list[i];
            let data = ShopData.getByName(saveData.name);

            if (!data) continue;

            data._activeColor = saveData.color;
            data._isEquipped = saveData.isEquipped;
            data._isBought = saveData.isBought;

            if (data._isEquipped) {
                pc.app.player.avatar[data.type] = data._activeColor < 1 ? data : data.colorVariants[data._activeColor];
                pc.app.player.reloadAvatar();
            }

            Data.updateGlobal(data);
        }
    }

    setTimeout(() => {
        ShopData.SaveUpdates = true;
        ShopData.Save();
    }, 1);
}

async function safeAsync(func, ...args) {
    try {
        return await func(...args);
    } catch (err) {
        console.error("Error occurred:", err);
        return null;
    }
}

async function getAsset(assetId) {
    if (!assetId) return null;

    let dataAsset = pc.app.assets.get(assetId);
    if (!dataAsset) return null;

    if (dataAsset.loaded) return dataAsset;

    try {
        return await new Promise((resolve, reject) => {
            dataAsset.ready(asset => resolve(asset));
            dataAsset.once('error', err => reject(err));
            pc.app.assets.load(dataAsset);
        });
    } catch (e) {
        console.error("Failed to load asset", assetId, e);
        return null;
    }
}