var SpiderCamera = pc.createScript('spiderCamera');
SpiderCamera.attributes.add("spider", { type: "entity" })

SpiderCamera.prototype.initialize = function() {
    this.app.spiderCamera = this;
};

SpiderCamera.prototype.update = function () {
    this.entity.setPosition(this.spider.getPosition());
}