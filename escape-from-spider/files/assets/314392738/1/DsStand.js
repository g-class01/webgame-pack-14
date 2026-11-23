var DsStand = pc.createScript('dsStand');

// Başlangıç alanındaki powerup standları (Steal and Run'daki gibi): yerdeki halkanın üstünde
// durunca daire dolar, dolunca ödül verilir.
//  bat    -> reklam izle, 10 vuruşluk sopa (bitince yeniden alınır)
//  shield -> reklam izle, 30 sn canavar yakalayamaz (kalkan herkese görünür)
//  hook   -> reklam izle, 3 atışlık kanca (DsGadgets)
//  ice    -> reklam izle, 2 buz bombası (DsGadgets)
//  pebble -> reklam izle, çakıllar MAX_PEBBLES'a tamamlanır (güvenli bölgelerde)
//  skin   -> reklam izle, mağazadaki skin (ShopData) kalıcı olarak alınır ve giyilir; zaten alındıysa reklamsız giyilir
// Market (DsMarket) da aynı canGet / grant fonksiyonlarını kullanır
DsStand.attributes.add('kind', { type: 'string', default: 'bat' });
DsStand.attributes.add('skin', { type: 'string', default: '', description: 'kind=skin için ShopData.Skins içindeki ad' });
DsStand.attributes.add('radius', { type: 'number', default: 1.7 });

DsStand.prototype.initialize = function () {
    this.circle = this.entity.findByName('Loading Radial');
    this.radial = this.circle && this.circle.script && this.circle.script.progressRadial;
    if (this.radial) this.radial.powerup = this;
    this.armed = true;
    this.floorY = this.circle ? this.circle.getPosition().y : this.entity.getPosition().y - 3.6;
    // reklam ikonunun yanındaki "0" yazısı kalkar, ikon ortalanır
    var tt = this.entity.findByName('Title');
    var pt = tt && tt.findByName('PriceText');
    if (pt) pt.enabled = false;
    var ra = tt && tt.findByName('RewardedAd');
    if (ra) { var rp = ra.getLocalPosition(); ra.setLocalPosition(0, rp.y, rp.z); }
    if (this.kind === 'skin') this.setupSkin();
    try { this.setupDisplay(); } catch (e) { console.warn('dsStand display', e); }
};

// ---------------------------------------------------------------- 3D vitrin
// Standın üstünde dönen 2D resim yerine eşyanın 3D modeli döner (skinlerde skinli karakter).
// Modeller oyuncunun elindeki eşya şablonlarından alınır (şablonun scripti çalışmaz, sadece Model dalı kopyalanır).
DsStand.MODEL = { bat: 314399197, hook: 314713378, ice: 314713379, pebble: 314389305 };
DsStand.SKIN_TEMPLATE = 196470324;          // mağazadaki manken (skin_based): Body = çıplak gövde + kafa
DsStand.SKIN_MAT = 196470348;               // skin kıyafetinin malzemesi (mağaza mankeniyle aynı)
DsStand.SIZE = { bat: 3.7, hook: 3.1, ice: 2.5, pebble: 3.5, shield: 2.9 };   // modelin en uzun kenarı (m)
// skin karakteri standın tabanında durur (oyuncudan biraz büyük); eşyalar tabanın lift kadar üstünde hafifçe süzülür
DsStand.SHOW = { size: 3, skinH: 3.6, spin: 60, bob: 0.15, lift: 0.45 };

DsStand.prototype.setupDisplay = function () {
    var rot = this.entity.findByName('rotator');
    var img = rot && rot.findByName('Image');
    if (!img) return;
    var pos = img.getPosition().clone();
    pos.y = this.floorY;   // taban (sarı halkanın yüksekliği)
    var item = rot.findByName('Item');
    if (item) item.enabled = false;
    var holder = new pc.Entity('Display3D');
    this.entity.addChild(holder);
    var s = this.entity.getWorldTransform().getScale().x;
    holder.setLocalScale(1 / s, 1 / s, 1 / s);   // standın ölçeği modeli etkilemesin
    holder.setPosition(pos);
    holder.setRotation(pc.Quat.IDENTITY);
    var fit = new pc.Entity('Fit');
    holder.addChild(fit);
    this.show = holder; this.showFit = fit; this.showPos = pos;
    this.showT = Math.random() * 6;
    this.fitted = false;
    this.buildModel(fit);
};

DsStand.prototype.buildModel = function (fit) {
    var app = this.app, self = this, k = this.kind;
    if (k === 'skin') {
        var t = app.assets.get(DsStand.SKIN_TEMPLATE);
        if (!t || !t.resource) return;
        var ch = t.resource.instantiate();
        ['PotionObjects', 'SpeedBoots_Left', 'SpeedBoots_Right', 'CageGhost'].forEach(function (n) {
            ch.find(function (e) { return e.name === n; }).forEach(function (e) { e.enabled = false; });
        });
        fit.addChild(ch);
        // skin, mağazadaki gibi gövdenin üstüne giydirilen ayrı bir model: aynı iskelete bağlanır
        var arm = ch.findByName('Armature');
        var sd = this.skinData();
        this.skinReady = false;
        if (arm && sd && sd.getAsset) {
            var mesh = function (name, a) {
                if (!a || !a.resource || !ch.parent) return;
                var e = new pc.Entity(name);
                e.addComponent('render', { type: 'asset', asset: a.id, materialAssets: [DsStand.SKIN_MAT], rootBone: arm, castShadows: false });
                ch.addChild(e);
            };
            sd.getAsset().then(function (a) {
                mesh('SkinMesh', a);
                // saçlı skin (ShopData.SkinHair): oyuncudaki gibi kafada saç
                var hair = ShopData.hatFor ? ShopData.hatFor(sd, null) : null;
                return hair ? hair.getAsset().then(function (h) { mesh('HairMesh', h); }) : null;
            }).then(function () { self.skinReady = true; self.fitted = false; }, function () { self.skinReady = true; });
        } else this.skinReady = true;
        return;
    }
    if (k === 'shield') { this.buildShield(fit); return; }
    var ta = app.assets.get(DsStand.MODEL[k]);
    if (!ta || !ta.resource) return;
    var inst = ta.resource.instantiate();
    var model = inst.findByName('Model');
    if (!model) { inst.destroy(); return; }
    model.parent.removeChild(model);
    inst.destroy();
    model.enabled = true;
    fit.addChild(model);
    if (k === 'ice') model.setLocalEulerAngles(25, 30, 20);   // köşesi öne gelsin, küp olduğu belli olsun
    if (k === 'hook') {
        // elde tutuş açısıyla yan yatık geliyor: vitrinde dik dursun
        var hg = model.findByName('HookGun');
        if (hg) hg.setLocalEulerAngles(0, 0, 0);
    }
    if (k === 'pebble') {
        // üç çakıl: biri büyük, ikisi yanında
        var st = model.findByName('Stone');
        if (st) {
            var p = st.getLocalPosition(), sc = st.getLocalScale();
            [[-34, -8, 10, 0.75], [30, -10, -6, 0.65]].forEach(function (o, i) {
                var c = st.clone();
                c.setLocalPosition(p.x + o[0], p.y + o[1], p.z + o[2]);
                c.setLocalScale(sc.x * o[3], sc.y * o[3], sc.z * o[3]);
                c.setLocalEulerAngles(10 + i * 25, 70 * (i + 1), 15);
                model.addChild(c);
            });
        }
    }
};

// Kalkan modeli projede yok: sarı çerçeveli mavi yuvarlak kalkan, ortada sarı topuz
DsStand.prototype.buildShield = function (fit) {
    var mk = function (r, g, b, emi) {
        var m = new pc.StandardMaterial();
        m.diffuse = new pc.Color(r, g, b);
        m.emissive = new pc.Color(r * emi, g * emi, b * emi);
        m.gloss = 0.6; m.metalness = 0.2; m.useMetalness = true;
        m.update();
        return m;
    };
    var gold = mk(1, 0.78, 0.15, 0.25), blue = mk(0.15, 0.45, 1, 0.2);
    var part = function (type, mat, pos, scale) {
        var e = new pc.Entity('Shield' + type);
        e.addComponent('render', { type: type, material: mat, castShadows: false });
        e.setLocalPosition(pos[0], pos[1], pos[2]);
        e.setLocalEulerAngles(90, 0, 0);
        e.setLocalScale(scale[0], scale[1], scale[2]);
        fit.addChild(e);
    };
    part('cylinder', gold, [0, 0, 0], [2, 0.22, 2]);
    part('cylinder', blue, [0, 0, 0.06], [1.7, 0.22, 1.7]);
    part('cylinder', gold, [0, 0, 0.12], [0.18, 0.2, 1.5]);
    part('sphere', gold, [0, 0, 0.18], [0.5, 0.5, 0.5]);
};

// Model yüklenince bir kez: boyunu SHOW.size'a (skinde boyunu skinH'ye) getirip vitrinin ortasına koyar
DsStand.prototype.fitModel = function () {
    if (this.kind === 'skin' && !this.skinReady) return;
    var fit = this.showFit, rcs = fit.findComponents('render'), mis = [];
    for (var i = 0; i < rcs.length; i++) {
        var rc = rcs[i];
        if (!rc.enabled || !rc.entity.enabled) continue;
        if (rc.type === 'asset' && !rc.meshInstances.length) return;   // daha yükleniyor
        var ma = rc.materialAssets || [];
        for (var q = 0; q < ma.length; q++) {
            var mat = ma[q] && this.app.assets.get(ma[q] && ma[q].id !== undefined ? ma[q].id : ma[q]);
            if (mat && !mat.loaded) { this.app.assets.load(mat); return; }   // malzeme gelmeden parlatılırsa düz renk kalıyor
        }
        mis = mis.concat(rc.meshInstances);
    }
    if (!mis.length) return;
    this.show.setPosition(this.showPos);
    this.show.setRotation(pc.Quat.IDENTITY);
    fit.setLocalPosition(0, 0, 0);
    fit.setLocalScale(1, 1, 1);
    var k, c;
    if (this.kind === 'skin') {
        // skinli karakterin kutusu güvenilmez: boyu kemiklerden ölçülür (tepe - ayak ucu)
        var top = fit.findByName('mixamorig:HeadTop_End'), toe = fit.findByName('mixamorig:LeftToe_End'), hip = fit.findByName('mixamorig:Hips');
        if (!top || !toe || !hip) return;
        var ty = top.getPosition().y, by = toe.getPosition().y, hp = hip.getPosition();
        k = DsStand.SHOW.skinH / Math.max(0.01, ty - by);
        c = new pc.Vec3(hp.x, by, hp.z);   // ayak ucu tabana
    } else {
        var box = new pc.BoundingBox();
        box.copy(mis[0].aabb);
        for (var j = 1; j < mis.length; j++) box.add(mis[j].aabb);
        var h = box.halfExtents;
        // sopa elde tutuluş açısıyla yatık geliyor: vitrinde çapraz dursun (uzun ekseni 40° eğik dikey)
        if (this.kind === 'bat' && !this.tilted && fit.children[0]) {
            this.tilted = true;
            var ax = h.x >= h.y && h.x >= h.z ? 'x' : (h.z >= h.y ? 'z' : 'y');
            var tq = new pc.Quat();
            if (ax === 'x') tq.setFromEulerAngles(0, 0, 50); else if (ax === 'z') tq.setFromEulerAngles(-50, 0, 0); else tq.setFromEulerAngles(0, 0, -40);
            var mdl = fit.children[0];
            mdl.setLocalRotation(tq.mul(mdl.getLocalRotation()));
            return;   // bir sonraki karede yeniden ölçülür
        }
        k = (DsStand.SIZE[this.kind] || DsStand.SHOW.size) / Math.max(0.01, 2 * Math.max(h.x, h.y, h.z));
        // modelin altı tabandan lift kadar yukarıda dursun
        c = new pc.Vec3(box.center.x, box.center.y - h.y - DsStand.SHOW.lift / k, box.center.z);
        // standın üstü karanlık: modelin malzemesi (kopyası) biraz kendi ışığını versin
        if (!this.lit) {
            this.lit = true;
            var self = this;
            mis.forEach(function (mi) {
                var m = mi.material && mi.material.clone ? mi.material.clone() : null;
                if (!m || !m.diffuse) return;
                // dokulu malzemede ışık dokunun kendi renginden gelir (düz renk basmasın)
                var lv = self.kind === 'ice' ? 0.55 : 0.3;   // buz parlak dursun
                if (m.diffuseMap) { m.emissiveMap = m.diffuseMap; m.emissive = new pc.Color(lv, lv, lv); }
                else m.emissive = new pc.Color(m.diffuse.r * 0.25, m.diffuse.g * 0.25, m.diffuse.b * 0.25);
                m.update();
                mi.material = m;
            });
        }
    }
    fit.setLocalScale(k, k, k);
    fit.setLocalPosition((this.showPos.x - c.x) * k, (this.showPos.y - c.y) * k, (this.showPos.z - c.z) * k);
    this.fitted = true;
};

DsStand.prototype.updateDisplay = function (dt) {
    if (!this.show || !this.show.enabled) return;
    if (!this.fitted) { this.fitModel(); if (!this.fitted) return; }
    this.showT += dt;
    var S = DsStand.SHOW;
    var bob = this.kind === 'skin' ? 0 : (Math.sin(this.showT * 2) + 1) * 0.5 * S.bob;   // skin yerde durur, eşya sadece yukarı doğru süzülür
    this.show.setPosition(this.showPos.x, this.showPos.y + bob, this.showPos.z);
    this.show.setEulerAngles(0, this.showT * S.spin, 0);
};

DsStand.skinByName = function (n) {
    if (typeof ShopData === 'undefined' || !ShopData.Skins) return null;
    return ShopData.Skins.find(function (d) { return d.name === n; }) || null;
};
DsStand.prototype.skinData = function () { return DsStand.skinByName(this.skin); };

// Skin standı: başlık skin adı, dönen ikon mağazadaki skin resmi
DsStand.prototype.setupSkin = function () {
    var data = this.skinData();
    if (!data) { this.entity.enabled = false; return; }
    var title = this.entity.findByName('Title');
    if (title && title.element) title.element.text = data.name.toUpperCase() + '\n \n \n \n \n ';
    var texts = title ? title.children.filter(function (c) { return c.name === 'Text' && c.enabled; }) : [];
    this.subText = texts[0] || null;
    this.adIcon = title && title.findByName('RewardedAd');
    this.refreshSkin();
    var img = this.entity.findByName('rotator');
    img = img && img.findByName('Image');
    var tex = this.app.assets.get(data.textureId);
    if (img && img.element && tex) {
        var set = function () { if (img.element) img.element.texture = tex.resource; };
        if (tex.loaded) set(); else { tex.once('load', set); this.app.assets.load(tex); }
    }
};

DsStand.prototype.refreshSkin = function () {
    var data = this.skinData();
    if (!data) return;
    var bought = !!data.isBought, worn = !!data.isEquipped;
    // alınmış skinin standı haritada görünmez
    if (bought) { this.entity.enabled = false; return; }
    if (this.subText && this.subText.element) this.subText.element.text = worn ? 'You are\nwearing it!' : bought ? 'Stand here\nto wear it' : 'New skin!\nKeep it forever';
    if (this.adIcon) this.adIcon.enabled = !bought;
    this.skinState = (bought ? 1 : 0) + (worn ? 2 : 0);
};

// Mağazadaki "satın al + giy" ile aynı adımlar (ShopManager.onBuyOrEquip). Market de bunu kullanır.
DsStand.equipSkin = function (app, data) {
    var pl = app.player;
    if (!data || !pl || !pl.avatar) return;
    ShopData.resetSelected && ShopData.resetSelected();
    ShopData.resetEquipped(data.type);
    data.isBought = true;
    data.isEquipped = true;
    var av = pl.avatar.clone();
    av.skin = data;
    pl.avatar = av;
    var shop = app.shop;
    if (shop && shop.mannequin) { shop.mannequin.avatar = av.clone(); shop.mannequin.baseAvatar = av.clone(); }
    if (pl.reloadAvatar) pl.reloadAvatar();
    if (ShopData.Save) ShopData.Save();
    var ds = app.dontSplash;
    if (ds) ds.play('success', 0.6);
    app.fire('WarningTextController:setWarning', 'You got the ' + data.name + ' skin!', 4, new pc.Color(0, 1, 0, 1));
};
DsStand.prototype.equipSkin = function () {
    DsStand.equipSkin(this.app, this.skinData());
    this.refreshSkin();
};

DsStand.prototype.postInitialize = function () {
    // Yazı grubu oyuncuya dönsün
    var ug = this.entity.findByName('UIGroup');
    var ra = ug && ug.script && ug.script.rotateAround;
    if (ra) {
        ra.player = this.app.root.findByName('Camera') || (this.app.player && this.app.player.entity);
        ra.cylinder = this.entity.findByName('elytraCylinder') || this.entity;
    }
};

// Sarı halkanın kenarına değer değmez dolmaya başlasın: halka yarıçapı + oyuncunun yarıçapı.
// Model yüklenince bir kez hesaplanır.
DsStand.prototype.padRadius = function () {
    if (this.padR) return this.padR;
    var r = 0, show = this.show;
    this.entity.findComponents('render').forEach(function (rc) {
        if (!rc.enabled || !rc.entity.enabled) return;
        if (show && (rc.entity === show || rc.entity.isDescendantOf(show))) return;   // 3D vitrin halkaya sayılmasın
        rc.meshInstances.forEach(function (mi) { var h = mi.aabb.halfExtents; r = Math.max(r, h.x, h.z); });
    });
    if (r < 0.5) return this.radius;
    var ds = this.app.dontSplash;
    var col = ds && ds.player && ds.player.collision;
    this.padR = r + (col && col.radius ? col.radius : 0.5);
    return this.padR;
};

DsStand.prototype.inside = function () {
    var ds = this.app.dontSplash;
    if (!ds || ds.caught || ds.finished) return false;
    var p = ds.player.getPosition(), c = this.entity.getPosition();
    return Math.hypot(p.x - c.x, p.z - c.z) < this.padRadius() && Math.abs(p.y - 1 - this.floorY) < 1.6;
};

// Bu eşya şu an alınabilir mi (standlar ve market ortak)
DsStand.canGet = function (app, kind, skin) {
    var ds = app.dontSplash;
    if (!ds) return false;
    if (app.isWatchingAd) return false;
    if (kind === 'shield') return !ds.shieldActive();
    if (kind === 'bat') return !((ds.batUses || 0) >= DontSplashManager.BAT_USES && ds.hasItem(DontSplashManager.BAT_ITEM));
    var g = app.dsGadgets;
    if (kind === 'hook') return !!g && g.canGet(DsGadgets.HOOK_ITEM);
    if (kind === 'ice') return !!g && g.canGet(DsGadgets.ICE_ITEM);
    if (kind === 'pebble') return ds.pebbleCount() < DontSplashManager.MAX_PEBBLES;
    if (kind === 'skin') { var sd = DsStand.skinByName(skin); return !!sd && !sd.isEquipped; }
    return false;
};

// Reklam izletip eşyayı verir (skin zaten alınmışsa reklamsız giydirir). done: verildikten sonra
DsStand.grant = function (app, kind, skin, src, done) {
    if (typeof src === 'function' || src === undefined) { done = src; src = null; }   // src: 'market' | yoksa stand
    var ds = app.dontSplash;
    if (!ds || !DsStand.canGet(app, kind, skin)) return false;
    var g = app.dsGadgets;
    var give;
    if (kind === 'skin') {
        var sd = DsStand.skinByName(skin);
        if (sd.isBought) { DsStand.equipSkin(app, sd); if (done) done(); return true; }
        give = function () { DsStand.equipSkin(app, sd); };
    } else {
        give = kind === 'bat' ? function () { if (ds.giveBat()) ds.play('success', 0.6); }
            : kind === 'hook' ? function () { if (g) g.give(DsGadgets.HOOK_ITEM); }
            : kind === 'ice' ? function () { if (g) g.give(DsGadgets.ICE_ITEM); }
            : kind === 'pebble' ? function () { ds.fillPebbles(); }
            : function () { ds.giveShield(); };
    }
    var go = function () { give(); if (done) done(); };
    if (window.pokiMeasure) window.pokiMeasure('rewarded', (src || 'stand') + '-' + (kind === 'skin' ? 'skin' : kind), 'interact');
    if (typeof watchRewarded === 'function') watchRewarded(go);
    else go();
    return true;
};

DsStand.prototype.canUse = function () {
    return DsStand.canGet(this.app, this.kind, this.skin);
};

// progressRadial dolunca çağırır
DsStand.prototype.watchAds = function () {
    if (this.radial) this.radial.isUse = false;
    this.armed = false;     // çıkıp tekrar girene kadar dolmaz
    var self = this;
    DsStand.grant(this.app, this.kind, this.skin, function () { if (self.kind === 'skin') self.refreshSkin(); });
};

// Uzaktayken yazılar, dönen ikon ve sarı parlayan silindir gizlenir (ışıksız/sissiz oldukları için karanlıkta uzaktan parlıyordu)
DsStand.FAR = 38;
DsStand.prototype.updateFar = function () {
    var ds = this.app.dontSplash;
    if (!ds || !ds.player) return;
    if (!this.farParts) this.farParts = ['UI', 'rotator', 'elytraCylinder', 'Display3D'].map(function (n) { return this.entity.findByName(n); }, this).filter(Boolean);
    var p = ds.player.getPosition(), c = this.entity.getPosition();
    var d = Math.hypot(p.x - c.x, p.z - c.z);
    var show = this.farShown === false ? d < DsStand.FAR - 3 : d < DsStand.FAR;
    if (show === this.farShown) return;
    this.farShown = show;
    this.farParts.forEach(function (e) { e.enabled = show; });
};

DsStand.prototype.update = function (dt) {
    this.updateFar();
    this.updateDisplay(dt);
    if (this.kind === 'skin' && this.farShown) {
        // mağazadan başka skin giyilirse yazı güncellensin
        var sd = this.skinData();
        if (sd && ((sd.isBought ? 1 : 0) + (sd.isEquipped ? 2 : 0)) !== this.skinState) this.refreshSkin();
    }
    if (!this.radial) return;
    var inside = this.inside();
    if (!inside) this.armed = true;
    var use = inside && this.armed && this.canUse();
    if (this.radial.isUse !== use) this.radial.isUse = use;
};
