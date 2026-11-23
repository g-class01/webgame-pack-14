var AgarFeed = pc.createScript('agarFeed');
AgarFeed.attributes.add("scalePoint", { type: "number", default: .05 })

// AgarManager detects eating with a distance check and draws all feeds with
// instancing. 400 always-active trigger bodies cost ~0.5 ms per frame.
AgarFeed.prototype.initialize = function() {
    this.id = this.entity.parent.children.indexOf(this.entity);
    if (this.entity.collision) this.entity.removeComponent('collision');
};
