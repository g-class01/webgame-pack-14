var ScrollVerticalAreaFitter = pc.createScript('scrollVerticalAreaFitter');
ScrollVerticalAreaFitter.attributes.add("yOffset", { type: "number" });
ScrollVerticalAreaFitter.attributes.add("rowCount", { type: "number", default: 3 });
ScrollVerticalAreaFitter.prototype._onContentChanged = function () {
    var layoutGroup = this.entity.layoutgroup;
    if (layoutGroup) {
        // Get all the children that are a layout element and resize the content element
        // and work out the height needed 

        // Get the padding for the top and bottom
        var height = layoutGroup.padding.y + layoutGroup.padding.w;
        var children = this.entity.children;
        if (children.length > 0) {
            height = (Math.ceil(children.length / this.rowCount) * this.rowCount) * (children[0].element.height + layoutGroup.spacing.y);
            height = height / this.rowCount;
            this.entity.element.height = height + this.yOffset;
        }
    }
};

// initialize code called once per entity
ScrollVerticalAreaFitter.prototype.initialize = function () {
    this.entity.on('contentchanged', this._onContentChanged, this);
    this.app.on("contentchanged", this._onContentChanged, this);

    this.entity.on("destroy", () => {
        this.app.off("contentchanged", this._onContentChanged, this);
    }, this);

    this._onContentChanged();
};