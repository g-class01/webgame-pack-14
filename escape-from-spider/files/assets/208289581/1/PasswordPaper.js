var PasswordPaper = pc.createScript('passwordPaper');
PasswordPaper.attributes.add("textEntity", { type: "entity" });

PasswordPaper.prototype.postInitialize = function() {
    this.app.on("SetLockedCasePassword", this.setPass, this);
    
    if (this.app.lockedCasePassword)
        this.setPass(this.app.lockedCasePassword);

    this.entity.on("destroy", () => {
        this.app.off("SetLockedCasePassword", this.setPass, this);
    }, this);
};

PasswordPaper.prototype.setPass = function (pass) {
    if (pass == null || isNaN(pass)) return;

    this.textEntity.element.text = pass.toString();
}