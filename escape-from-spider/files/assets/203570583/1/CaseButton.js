var CaseButton = pc.createScript('caseButton');
CaseButton.attributes.add("caseDir", { type: "number", enum: [{ "Left" : 0 }, { "Middle" : 1 }, { "Right" : 2 }] })
CaseButton.attributes.add("forward", { type: "boolean" });

CaseButton.prototype.initialize = function () {
    this.entity.button.on("click", () => {
        this.app.fire("CaseEvent", this.caseDir, this.forward);
    });
};