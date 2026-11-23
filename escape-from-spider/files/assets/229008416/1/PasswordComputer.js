var PasswordComputer = pc.createScript('passwordComputer');
PasswordComputer.attributes.add("passText", { type: "entity" });
PasswordComputer.attributes.add("codeText", { type: "entity" });
PasswordComputer.attributes.add("operationText", { type: "entity" });
PasswordComputer.attributes.add("door", { type: "entity" });
PasswordComputer.attributes.add("doorCollider", { type: "entity" });

PasswordComputer.prototype.initialize = function () {
    this.indicator = this.entity.findByName("Indicator");

    this.entity.on("interact", this.interact, this);
    this.entity.on("toggleIndicator", (toggle) => toggleIndicator(this, toggle), this);

    this.app.passwordComputer = this;

    eventSubscribe(this, "SetComputerPassword", this.setPass);
    eventSubscribe(this, "PasswordButtonClick", this.onClick);

    this.pass = 9999;
    this.enteringPass = "";

    this.mathOperation = "";

    this.anim = false;
    this.locked = true;

    this.entity.canInteract = true;

    if (this.app.computerPassword)
        this.setPass(this.app.computerPassword);
};

PasswordComputer.prototype.setPass = function (pass) {
    this.pass = pass;
    console.log("comp pass", pass);

    function randomMathOperation(target) {
        const operations = ['+', '-', '*', '/'];
        const possibleExpressions = [];

        for (let a = 1; a <= 9; a++) {
            for (let b = 1; b <= 9; b++) {
                if (a + b === target) possibleExpressions.push(`${a} + ${b}`);
                if (a - b === target) possibleExpressions.push(`${a} - ${b}`);
                if (a * b === target) possibleExpressions.push(`${a} x ${b}`);
                if (a / b === target && a % b === 0) possibleExpressions.push(`${a} / ${b}`);
            }
        }

        if (possibleExpressions.length === 0) return `No valid expression for ${target}`;

        const randomIndex = Math.floor(Math.random() * possibleExpressions.length);
        return possibleExpressions[randomIndex];
    }

    this.mathOperation = randomMathOperation(pass % 10);
    this.operationText.element.text = "X = " + this.mathOperation;

    this.codeText.element.text = String(pass).slice(0, -1) + 'X';
}

PasswordComputer.prototype.interact = function (playerInteract) {
    if (!playerInteract.rightItem || Item.Codebook != playerInteract.rightItem.id) {
        this.app.fire('WarningTextController:setWarning', "You need a codebook to enter password!", 3, new pc.Color(1, 0, 0, 1));
        return;
    }

    this.app.fire("OpenMenu", "PasswordComputer");
};

PasswordComputer.prototype.onClick = function (number) {
    if (this.anim || this.enteringPass.length >= 4) return;

    this.enteringPass += number;
    this.passText.element.text = this.enteringPass;

    if (this.enteringPass.length >= 4) {
        this.anim = true;

        let truePass = this.enteringPass == this.pass;
        if (truePass) {
            this.passText.element.color = pc.Color.GREEN;
        }
        else {
            this.passText.element.color = pc.Color.RED;
        }

        setTimeout(() => {
            this.anim = false;
            this.passText.element.color = pc.Color.WHITE;
            this.enteringPass = "";
            this.passText.element.text = "";

            if (truePass) {
                this.app.fire("CloseMenu");
                this.app.player.interact.setRightHand(null);
                this.app.room.send("PasswordComputer:Unlock");
            }
        }, 1000);
    }
}

PasswordComputer.prototype.unlock = function () {
    if (this.app.menu.activeMenu != null) if (this.app.menu.activeMenu.name == "PasswordComputer") this.app.fire("CloseMenu")

    this.door.tween(this.door.getLocalEulerAngles())
        .rotate(new pc.Vec3(-90, -120, 0), 1.0, pc.QuincticOut)
        .start();

    this.doorCollider.enabled = false;

    this.locked = false;

    this.entity.canInteract = false;
    this.app.player.interact.refresh();
    toggleIndicator(this, false);

    this.app.fire('WarningTextController:setWarning', "Corridor door is now opened!", 5, new pc.Color(0, 1, 0, 1));
    this.app.fire("RefreshTutorial");
}

PasswordComputer.prototype.update = function (dt) {
    //if (pc.app.keyboard.wasPressed("n")) this.app.player.controller.teleport(new pc.Vec3(-36, 27, -270)); // coderoom
    //if (pc.app.keyboard.wasPressed("j")) this.app.player.controller.teleport(new pc.Vec3(-42, -6, -418)); // generator
    //if (pc.app.keyboard.wasPressed("g")) this.app.generator.unlock(); // generator unlock
}