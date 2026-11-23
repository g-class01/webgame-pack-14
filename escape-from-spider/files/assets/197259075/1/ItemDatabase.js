const Item = {
    Agar: -5,
    Catch: -4,
    BecomeHuman: -3,
    SpiderPowerup: -2,
    Empty: -1,
    GoldChest: 0,
    SpeedCoil: 1,
    Scroll: 2,
    Bat: 3,
    Scissors: 4,
    BearTrap: 5,
    Axe: 6,
    Potion: 7,
    Fusion: 8,
    XrayMachine: 9,
    GreenFusion: 10,
    YellowFusion: 11,
    Wrench: 12,
    KeyGray: 13,
    KeyRed: 14,
    KeyOrange: 15,
    KeyGreen: 16,
    KeyBlue: 17,
    KeyPurple: 18,
    KeyPink: 19,
    Cutter: 20,
    FartBomb: 21,
    IceCube: 22,
    CageSpawner: 23,
    FlareGun: 24,
    TrafoCableRed: 25,
    TrafoCableGreen: 26,
    TrafoCableBlue: 27,
    Carjack: 28,
    Codebook: 29,
    Fuel: 30,
    WoodPiece: 31,
    MetalPiece: 32,
    IronPiece: 33,
    GliderSeat: 34,
    GliderWing: 35,
    GliderWheel: 36,
    GliderPropeller: 37,
    GliderEngine: 38,
    Grenade: 39,
}

const ItemType = {
    Default: 0,
    Timed: 1,
    Consumable: 2,
}

var ItemDatabase = pc.createScript('itemDatabase');
ItemDatabase.attributes.add("items", {
    type: "json",
    schema: [
        {
            name: "name",
            type: "string"
        },
        {
            name: "template",
            type: "asset",
            assetType: "template"
        },
        {
            name: "fpsTemplate",
            type: "asset",
            assetType: "template"
        },
        {
            name: "entities",
            type: "string",
            array: true
        },
        {
            name: "id",
            type: "number",
            enum: [
                { 'GoldChest': Item.GoldChest },
                { 'Speed Coil': Item.SpeedCoil },
                { 'Scroll': Item.Scroll },
                { 'Bat': Item.Bat },
                { 'Scissors': Item.Scissors },
                { 'Bear Trap': Item.BearTrap },
                { 'Axe': Item.Axe },
                { 'Potion': Item.Potion },
                { 'Fusion': Item.Fusion },
                { 'Xray Machine': Item.XrayMachine },
                { 'Green Fusion': Item.GreenFusion },
                { 'Yellow Fusion': Item.YellowFusion },
                { 'Wrench': Item.Wrench },
                { 'KeyGray': Item.KeyGray, },
                { 'KeyRed': Item.KeyRed, },
                { 'KeyOrange': Item.KeyOrange, },
                { 'KeyGreen': Item.KeyGreen, },
                { 'KeyBlue': Item.KeyBlue, },
                { 'KeyPurple': Item.KeyPurple, },
                { 'KeyPink': Item.KeyPink, },
                { 'Cutter': Item.Cutter, },
                { 'Fart Bomb': Item.FartBomb, },
                { 'Ice Cube': Item.IceCube, },
                { 'Cage Spawner': Item.CageSpawner, },
                { 'Flare Gun': Item.FlareGun, },
                { 'Trafo Cable Red': Item.TrafoCableRed, },
                { 'Trafo Cable Green': Item.TrafoCableGreen, },
                { 'Trafo Cable Blue': Item.TrafoCableBlue, },
                { 'Carjack': Item.Carjack, },
                { 'Codebook': Item.Codebook, },
                { 'Fuel': Item.Fuel, },
                { 'WoodPiece': Item.WoodPiece, },
                { 'MetalPiece': Item.MetalPiece, },
                { 'IronPiece': Item.IronPiece, },
                { 'GliderSeat': Item.GliderSeat, },
                { 'GliderWing': Item.GliderWing, },
                { 'GliderWheel': Item.GliderWheel, },
                { 'GliderPropeller': Item.GliderPropeller, },
                { 'GliderEngine': Item.GliderEngine, },
                { 'Grenade': Item.Grenade, },
            ]
        },
        {
            name: "type",
            type: "number",
            enum: [{ 'Default': ItemType.Default }, { 'Timed': ItemType.Timed }, { 'Consumable': ItemType.Consumable }]
        },
        {
            name: "amount",
            type: "number",
        },
        {
            name: "price",
            type: "number",
        },
        {
            name: "texture",
            type: "string",
        },
        {
            name: "spineItem",
            type: "boolean",
        },
    ],
    array: true
});

ItemDatabase.prototype.getItem = function (index) {
    return this.items[index];
}