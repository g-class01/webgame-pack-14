var ScrollingTexture = pc.createScript('scrollingTexture');

ScrollingTexture.attributes.add('materialAsset', {
    type: 'asset'
});

ScrollingTexture.attributes.add('speed', {
    type: 'vec2',
});
ScrollingTexture.attributes.add('opacity', { type: "boolean" });

ScrollingTexture.tmpVec2 = new pc.Vec2();
ScrollingTexture.tmpOffset = new pc.Vec2();

ScrollingTexture.prototype.initialize = function () {
    // get the material that we will animate
    if (this.materialAsset) {
        this.material = this.materialAsset.resource;
    }
};

ScrollingTexture.prototype.update = function (dt) {
    var velocity = ScrollingTexture.tmpVec2;
    var offset = ScrollingTexture.tmpOffset;

    // Calculate how much to offset the texture
    // Speed * dt
    velocity.set(this.speed.x, this.speed.y);
    velocity.scale(dt);

    // Update the diffuse and normal map offset values
    offset.copy(this.material.emissiveMapOffset);
    offset.add(velocity);

    //this.material.offset.set(new pc.Vec2(this.speed.x * dt, 0));
    this.material.emissiveMapOffset = offset;
    this.material.normalMapOffset = offset;
    this.material.diffuseMapOffset = offset;
    if (this.opacity)
        this.material.opacityMapOffset = offset;

    this.material.update();
};
