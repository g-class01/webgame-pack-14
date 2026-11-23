var InteractableManager = pc.createScript('interactableManager');

InteractableManager.prototype.initialize = function () {
    eventSubscribe(this, "Connected", this.onListen);
};

InteractableManager.prototype.onListen = function () {
    if (!this.app.room) return;

    this.assignInteractables();

    this.app.room.state.transforms.onAdd((transform, sessionId) => {
        if (transform.id in this.transforms) {
            let tf = this.transforms[transform.id];
            tf.setToggle(transform.toggle);

            transform.onChange(() => {
                tf.setToggle(transform.toggle);
            })
        }
    })

    this.app.room.state.locks.onAdd((lock, sessionId) => {
        if (lock.id in this.locks) {
            let lc = this.locks[lock.id];

            if (!lock.locked) lc.unlock();

            lock.onChange(() => {
                if (!lock.locked) lc.unlock();
            })
        }
    })

    this.app.room.state.cases.onAdd((lockedCase, sessionId) => {
        if (lockedCase.id in this.cases) {
            let lc = this.cases[lockedCase.id];

            if (!lockedCase.locked) lc.unlock();

            lockedCase.onChange(() => {
                if (!lockedCase.locked) lc.unlock();
            })
        }
    })

    this.app.room.state.windows.onAdd((window, sessionId) => {
        if (window.id in this.windows) {
            let w = this.windows[window.id];
            w.setToggle(window.toggle);

            window.onChange(() => {
                w.setToggle(window.toggle);
            })
        }
    })

    this.app.room.state.switchs.onAdd((sswitch, sessionId) => {
        if (sswitch.id in this.switchs) {
            let s = this.switchs[sswitch.id];
            if (sswitch.toggle && !s.toggle)
                s.unlock();

            sswitch.onChange(() => {
                if (sswitch.toggle && !s.toggle)
                    s.unlock();
            })
        }
    })

    this.app.room.state.cages.onAdd((ccage, sessionId) => {
        if (ccage.id in this.cages) {
            let c = this.cages[ccage.id];
            c.setPlayer(ccage.playerId);
            c.setPoints(ccage.points);

            ccage.onChange(() => {
                c.setPlayer(ccage.playerId);
                c.setPoints(ccage.points);
            })
        }
    })

    this.app.room.state.fusionBase.onChange(() => {
        if (this.app.fusionBase) this.app.fusionBase.setPlacings(
            this.app.room.state.fusionBase.blue,
            this.app.room.state.fusionBase.green,
            this.app.room.state.fusionBase.yellow
        )
    })

    this.app.room.state.trafo.onChange(() => {
        if (this.app.trafo) this.app.trafo.setPlacings(
            this.app.room.state.trafo.blue,
            this.app.room.state.trafo.green,
            this.app.room.state.trafo.red
        )
    })

    this.app.room.state.basementDoor.onChange(() => {
        if (this.app.basementDoor) if (!this.app.room.state.basementDoor.locked && this.app.basementDoor.locked)
            this.app.basementDoor.unlock();
    })

    this.app.room.state.passwordComputer.onChange(() => {
        if (this.app.passwordComputer) if (!this.app.room.state.passwordComputer.locked && this.app.passwordComputer.locked)
            this.app.passwordComputer.unlock();
    })

    this.app.room.state.abandonedCar.onChange(() => {
        if (this.app.abandonedCar) if (!this.app.room.state.abandonedCar.locked && this.app.abandonedCar.locked)
            this.app.abandonedCar.unlock();
    })

    this.app.room.state.metalFence.onChange(() => {
        if (this.app.metalFence) if (!this.app.room.state.metalFence.locked && this.app.metalFence.locked)
            this.app.metalFence.unlock();
    })

    this.app.room.state.generator.onChange(() => {
        if (!this.app.generator) return;

        if (this.app.generator) if (!this.app.room.state.generator.locked && this.app.generator.locked)
            this.app.generator.unlock();

        this.app.generator.setFuel(this.app.room.state.generator.fuel);
    })

    this.app.room.onMessage("InteractableTransform:PlankDamage", (message) => {
        let transform = this.transforms[message.id];
        if (transform)
            transform.damagePlank(message.hp);
    });

    this.app.room.state.ladder.pieces.onChange(() => {
        if (!this.app.ladder) return;

        this.app.ladder.setPieces(Array.from(this.app.room.state.ladder.pieces));
        console.log("this.app.room.state.ladder.onChange", this.app.room.state.ladder.pieces)
    })

    this.app.room.state.campDoor.onChange(() => {
        if (this.app.campDoor) if (!this.app.room.state.campDoor.locked && this.app.campDoor.locked)
            this.app.campDoor.unlock();
    })

    this.app.room.state.brokenGlider.pieces.onChange(() => {
        if (!this.app.brokenGlider) return;

        if (!this.app.room.state.brokenGlider.pieces) return;

        this.app.brokenGlider.setPieces(Array.from(this.app.room.state.brokenGlider.pieces));
        console.log("this.app.room.state.brokenGlider.onChange", this.app.room.state.brokenGlider.pieces)
    })

    this.app.room.state.tankerWall.onChange(() => {
        if (this.app.tankerWall) if (!this.app.room.state.tankerWall.locked && this.app.tankerWall.locked)
            this.app.tankerWall.unlock();
    })

    this.app.room.onMessage("type", (message) => {

    });
}

InteractableManager.prototype.assignInteractables = function () {
    this.transforms = this.app.root.findByTag("Interactable", "Transform")
        .reduce((dict, e) => {
            if (e.script && e.script.interactableTransform) {
                let transform = e.script.interactableTransform;
                dict[transform.id] = transform;
            }
            return dict;
        }, {});

    this.locks = this.app.root.findByTag("Interactable", "Lock")
        .reduce((dict, e) => {
            if (e.script && e.script.interactableLock) {
                let lock = e.script.interactableLock;
                dict[lock.id] = lock;
            }
            return dict;
        }, {});

    this.cases = this.app.root.findByTag("LockedCase")
        .reduce((dict, e) => {
            if (e.script && e.script.lockedCase) {
                let lockedCase = e.script.lockedCase;
                dict[lockedCase.id] = lockedCase;
            }
            return dict;
        }, {});

    this.windows = this.app.root.findByTag("Interactable", "Window")
        .reduce((dict, e) => {
            if (e.script && e.script.interactableWindow) {
                let window = e.script.interactableWindow;
                dict[window.id] = window;
            }
            return dict;
        }, {});

    this.switchs = this.app.root.findByTag("Interactable", "Switch")
        .reduce((dict, e) => {
            if (e.script && e.script.interactableSwitch) {
                let sswitch = e.script.interactableSwitch;
                dict[sswitch.id] = sswitch;
            }
            return dict;
        }, {});

    this.cages = this.app.root.findByTag("Interactable", "Cage")
        .reduce((dict, e) => {
            if (e.script && e.script.interactableCage) {
                let ccage = e.script.interactableCage;
                ccage.register();
                dict[ccage.id] = ccage;
            }
            return dict;
        }, {});
};