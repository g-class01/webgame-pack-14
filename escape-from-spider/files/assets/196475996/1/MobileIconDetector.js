var MobileIconDetector = pc.createScript('mobileIconDetector');
MobileIconDetector.attributes.add('mobileItem', { type: 'entity' });
MobileIconDetector.attributes.add('pcItem', { type: 'entity' });

// initialize code called once per entity
MobileIconDetector.prototype.initialize = function () {
    if (this.mobileItem)
        this.mobileItem.enabled = false;
    if (this.pcItem)
        this.pcItem.enabled = false;
    if (this.app.isMobile) {
        if (this.mobileItem)
            this.mobileItem.enabled = true;
    }
    else {
        if (this.pcItem)
            this.pcItem.enabled = true;
    }
};