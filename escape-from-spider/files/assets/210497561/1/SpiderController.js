var SpiderController = pc.createScript('spiderController');

// Script attributes for path root and spider
SpiderController.attributes.add('pathRoot', { type: 'entity' });
SpiderController.attributes.add('spider', { type: 'entity' });
SpiderController.attributes.add('player', { type: 'entity' });
SpiderController.attributes.add('moveSpeed', { type: 'number', default: 2 });
SpiderController.attributes.add('rotationSpeed', { type: 'number', default: 0.1 });
SpiderController.attributes.add('raycastDistance', { type: 'number', default: 2 }); // Distance for raycasting
SpiderController.attributes.add('spiderRayStart', { type: 'entity' });
SpiderController.attributes.add('spiderRayEnd', { type: 'entity' });
//SpiderController.attributes.add('spiderHead', { type: 'entity' });
SpiderController.attributes.add('mouthGrabParent', { type: 'entity' });
SpiderController.attributes.add('trigger', { type: 'entity' });
SpiderController.attributes.add('attackTrigger', { type: 'entity' });
SpiderController.attributes.add('spiderWebTemplate', { type: 'asset', assetType: 'template' });

// Initialize code called once per entity
SpiderController.prototype.initialize = function () {
    this.app.spiderController = this;
    this.app.playerSpiderDistance = 100;
    this.spiderNetworkPosition = new pc.Vec3(0, 0, 0);
    this.spiderNetworkRotation = new pc.Quat();
    this.interpolatedPosition = new pc.Vec3(0, 0, 0);
    this.originalRotation = new pc.Quat();
    this.finalRotation = new pc.Quat();
    this.rotateTime = 0;
    this.isSpiderIdle = false;
    this.currentWaypointIndex = null;
    this.spiderQuatLerp = new pc.Quat();
    this.spiderSurfaceEuler = new pc.Vec3();
    this.spiderDesiredAngle = 0;
    this.canSpiderAttack = true;
    this.isPlayerInAttackRange = false;
    this.targetWaypointPos = new pc.Vec3();
    this.spiderAnim = this.spider.anim;
    this.spiderRayPoint = this.spider.findByName("RayPoint");
    //this.waypoints = this.generateWaypoints();
    //console.log(this.waypoints)
    if (this.app.networkManager.currentSceneName == "Chapter1") {
        this.waypoints = waypoints;
    } 
    else if (this.app.networkManager.currentSceneName == "Chapter2") {
        this.waypoints = waypoints2;
    }
    else if (this.app.networkManager.currentSceneName == "Chapter3") {
        this.waypoints = waypoints3;
        console.log("chapter 3 waypoints")
    } 
    else {
        this.waypoints = waypoints;
    }

    this.targetNode = null;
    this.targetCell = null;
    this.app.webCount = 0;
    this.stunned = false;
    this.trapped = false;
    this.flarePos = null;
    this.spiderAnim.setBoolean("isRunning", true);

    eventSubscribe(this, "Connected", this.onListen);
    eventSubscribe(this, "ConnectionFailed", this.startPathfinding);

    this.handleDoorOpen();
    this.handlePlayerCheck();

    this.spiderChangedLocation();
    this.app.on("AmbienceManager:SpiderChangedLocation", this.spiderChangedLocation, this);
    this.entity.anim.on('footstep', () => {
        const sound = this.footstepSound;
        sound.pitch = pc.math.random(0.5, 1.2);
        sound.play();
    });

    this.on('destroy', function () {
        clearInterval(this.findNearestWaypointToPlayerInterval);
        clearTimeout(this.spiderAttackTimeout);
        clearTimeout(this.attackTimeout);
        clearInterval(this.attackInterval);
        clearTimeout(this.stunTimeout);
        clearTimeout(this.trapTimeout);
        if (this.flareTimeout) clearTimeout(this.flareTimeout);
        this.app.off("AmbienceManager:SpiderChangedLocation", this.spiderChangedLocation, this);
    }, this);
};

SpiderController.prototype.handleDoorOpen = function () {
    this.currentDoor = null;

    this.trigger.collision.on("triggerenter", (other) => {
        if (other.name == "Collider" && other.parent.name == "Door") other = other.parent;

        if (other.tags.has("Interactable") && other.name == "Door") {
            if (this.currentDoor != null) return;

            let door = other.script.interactableTransform;
            if (door.toggle == true) return;

            door.setToggle(true);
            this.currentDoor = door;

            setTimeout(() => {
                door.setToggle(false);
                setTimeout(() => {
                    this.currentDoor = null;
                }, 400);
            }, 600);
        }
    });
};

SpiderController.prototype.handlePlayerCheck = function () {
    this.attackTrigger.collision.on("triggerenter", (other) => {
        if (!other.tags.has("Player")) return;
        if (this.app.player.controller.isProtected) return;

        this.havePlayer = true;
    });

    this.attackTrigger.collision.on("triggerleave", (other) => {
        if (!other.tags.has("Player")) return;

        this.havePlayer = false;
    });
}

//connected to the server
SpiderController.prototype.onListen = function () {
    if (!this.app.room) return;
    this.networkSpider = this.app.room.state.spider;
    this.networkSpider.position.onChange(() => {
        //interpolate this position in update
        //console.log("spider pos", this.networkSpider.position.x, this.networkSpider.position.y, this.networkSpider.position.z)
        this.spiderNetworkPosition.set(this.networkSpider.position.x, this.networkSpider.position.y, this.networkSpider.position.z);
    });

    this.networkSpider.rotation.onChange(() => {
        //interpolate this rotation in update
        this.spiderNetworkRotation.setFromEulerAngles(this.networkSpider.rotation.x, this.networkSpider.rotation.y, this.networkSpider.rotation.z);
    });

    this.networkSpider.listen("walk", (newAnim, oldAnim) => {
        this.spiderAnim.setBoolean("isRunning", newAnim);
    });

    this.networkSpider.listen("isAttacking", (newAnim, oldAnim) => {
        if (newAnim)
            this.playSound("attack", true);
        const spiderControllerPlayerId = this.app.room.state.spiderPowerup.ownerPlayerId;
        if (spiderControllerPlayerId != null) {
            //local player degilsek (localin animi zaten localde oynuyor)
            if (this.app.room.state.spiderPowerup.ownerPlayerId != this.app.room.sessionId) {
                this.app.networkManager.remotePlayers[spiderControllerPlayerId].remotePlayerController.playerSpider.anim.setBoolean("attack", newAnim);
            }
        } else {
            this.spiderAnim.setBoolean("attack", newAnim);
            if (newAnim && !oldAnim) {
                this.attackTimeout = setTimeout(() => {
                    if (this.havePlayer) {
                        console.log("spider grab local player")
                        if (this.app.room)
                            this.app.room.send("Client:SpiderController:GrabLocalPlayer");
                    }
                }, 500);
            }
            else {
                if (this.attackTimeout) clearTimeout(this.attackTimeout);
                if (this.attackInterval) clearInterval(this.attackInterval);
            }
        }
    });

    this.networkSpider.listen("isStunned", (newAnim, oldAnim) => {
        if (newAnim)
            this.playSound("stunned", true);
        this.spiderAnim.setBoolean("isStunned", newAnim);
    });

    this.networkSpider.listen("isTrapped", (newAnim, oldAnim) => {
        if (newAnim)
            this.playSound("stunned", true);
        this.spiderAnim.setBoolean("isTrapped", newAnim);
    });

    this.networkSpider.listen("followingPlayerSession", (newSession, oldSession) => {
        if (newSession == this.app.room.sessionId) {
            this.app.fire("SpiderPulseEffect", true);
        } else {
            this.app.fire("SpiderPulseEffect", false);
        }
    });

    this.networkSpider.listen("grabbedPlayerSession", (newSession, oldSession) => {
        //spider is player
        if (this.app.room.state.spiderPowerup.ownerPlayerId != null) {
            let spiderPlayer; //find the spider player entity
            if (this.app.room.state.spiderPowerup.ownerPlayerId === this.app.room.sessionId)
                spiderPlayer = this.app.player.entity;
            else
                spiderPlayer = this.app.networkManager.remotePlayers[this.app.room.state.spiderPowerup.ownerPlayerId].entity;
            const mouthGrabParentPlayerSpider = spiderPlayer.findByName("MouthGrabParent");
            if (newSession != "") { //player spider grabbed player
                this.playSound("catch", true);
                //nonlocal player yakalandi
                if (newSession != this.app.room.sessionId) {
                    const targetPlayer = this.app.networkManager.remotePlayers[newSession];
                    if (targetPlayer) {
                        console.log("spider grabbed nonlocal player", targetPlayer.entity);

                        targetPlayer.entity.reparent(mouthGrabParentPlayerSpider);
                        targetPlayer.remotePlayerController.grabbedBySpider(true);
                        if (this.app.isSpider)
                            this.app.player.stats.caught += 1;
                    }
                } else { //local player yakalandi
                    console.log("spider grabbed local player")
                    this.app.networkManager.localPlayer.reparent(mouthGrabParentPlayerSpider);
                    this.app.networkManager.playerController.grabbedBySpider(true);
                }
            }
        } else { //spider is an ai
            if (newSession != "") { //spider grabbed player
                this.playSound("catch", true);
                //nonlocal player yakalandi
                if (newSession != this.app.room.sessionId) {
                    const targetPlayer = this.app.networkManager.remotePlayers[newSession];
                    if (targetPlayer) {
                        console.log("spider grabbed nonlocal player", targetPlayer.entity)
                        targetPlayer.entity.reparent(this.mouthGrabParent);
                        targetPlayer.remotePlayerController.grabbedBySpider(true);
                    }
                } else { //local player yakalandi
                    console.log("spider grabbed local player")
                    this.app.fire("SpiderPulseEffect", false);
                    this.app.networkManager.localPlayer.reparent(this.mouthGrabParent);
                    this.app.networkManager.playerController.grabbedBySpider(true);
                }
            }
        }
        //spider dropped grabbed player
        if (newSession == "") {
            //nonlocal player kurtuldu
            if (oldSession != this.app.room.sessionId) {
                const targetPlayer = this.app.networkManager.remotePlayers[oldSession];
                if (targetPlayer) {
                    console.log("spider dropped nonlocal player", targetPlayer.entity)
                    targetPlayer.remotePlayerController.grabbedBySpider(false);
                }
            } else { //local player kurtuldu
                console.log("spider dropped local player")
                this.app.fire("SpiderPlayerLightEffect", new pc.Color(1, 1, 1, 1));
                this.app.networkManager.playerController.grabbedBySpider(false);
            }
        }
    });

    this.app.room.onMessage("Spawn:WaypointWeb", (message) => {
        let id = message.id;
        if (!id) return;

        let waypoint = this.waypoints[id];

        const rayStart = new pc.Vec3(waypoint.position.x, waypoint.position.y + 1, waypoint.position.z);
        const rayEnd = rayStart.clone().sub(new pc.Vec3(0, 1, 0));

        const _rayResults = [
            this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd, "Ground"),
            this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd.clone().add(new pc.Vec3(0.5, 0, 0.5)), "Ground"),
            this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd.clone().add(new pc.Vec3(0.5, 0, -0.5)), "Ground"),
            this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd.clone().add(new pc.Vec3(-0.5, 0, 0.5)), "Ground"),
            this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd.clone().add(new pc.Vec3(-0.5, 0, -0.5)), "Ground")
        ];

        let success = false;
        let pos = pc.Vec3.ZERO;
        for (const result of _rayResults) {
            if (result) {
                pos = result.point.clone().add(new pc.Vec3(0, .1, 0));
                success = true;
                break;
            }
        }

        if (success) {
            let web = this.spiderWebTemplate.resource.instantiate();
            web.reparent(this.app.root);
            web.tags.add("SpiderWeb");
            web.setPosition(pos);
            web.id = id;
        }
    })
}

SpiderController.prototype.playSound = function (soundName, randomPitch = false) {
    if (this.entity.sound == null) return;
    if (this.app.spiderPlayer) {
        this.slot = this.app.spiderPlayer.sound.slot(soundName);
    } else {
        this.slot = this.entity.sound.slot(soundName);
    }

    if (this.slot == null) return;
    if (randomPitch) {
        this.slot.pitch = pc.math.random(0.8, 1.2);
    }
    this.slot.play();
};

SpiderController.prototype.spiderChangedLocation = function () {
    if (this.app.spiderLocation == LOCATIONS.HOUSE) {
        this.footstepSound = this.entity.sound.slot("footstepHouse");
    } else if (this.app.spiderLocation == LOCATIONS.BASEMENT) {
        this.footstepSound = this.entity.sound.slot("footstepBasement");
    } else {
        this.footstepSound = this.entity.sound.slot("footstep");
    }
};

//online movement (spider follows server positions)
SpiderController.prototype.startLerping = function (dt) {
    this.interpolatedPosition = this.spider.getPosition().clone();
    this.interpolatedPosition.lerp(this.spider.getPosition(),
        this.spiderNetworkPosition, 5 * dt);
    this.spider.setPosition(this.interpolatedPosition);

    let interpolatedRotation = this.spider.getLocalRotation().clone();
    let slerp = interpolatedRotation.slerp(interpolatedRotation, this.spiderNetworkRotation, dt * 8);
    this.spider.setLocalRotation(slerp);
}

//offline movement
SpiderController.prototype.startPathfinding = function () {
    this.nearestWaypointToPlayer = this.findNearestWaypointToPlayer().id;
    this.findPath(5, this.nearestWaypointToPlayer);

    this.findNearestWaypointToPlayerInterval = setInterval(() => {
        this.currentWaypointIndex = this.shortestPath.length;
        this.nearestWaypointToPlayer = this.findNearestWaypointToPlayer().id;

        if (this.targetCell != null) {
            this.app.fire("SpiderPulseEffect", false);
            this.findPath(this.targetWaypoint.id, this.targetCell.waypointId);
        }
        else if (this.flarePos != null) {
            this.app.fire("SpiderPulseEffect", false);
            this.findPath(this.targetWaypoint.id, this.findNearestWaypointToPosition(this.flarePos).id);
        }
        else if (this.app.playerSpiderDistance < 20 && !this.app.inSafeArea && !this.app.player.controller.isDied && !this.app.isProp() && this.app.location != LOCATIONS.PRISON && !this.app.isWatchingAd) {
            this.findPath(this.targetWaypoint.id, this.nearestWaypointToPlayer);
            this.app.fire("SpiderPulseEffect", true);
            if (this.targetNode) this.targetNode = null;
        }
        else {
            this.app.fire("SpiderPulseEffect", false);
            if (!this.targetNode) this.targetNode = this.randomWaypoint();

            this.findPath(this.targetWaypoint.id, this.targetNode.id);
        }
    }, 1000);
}

// Find the nearest waypoint to the player
SpiderController.prototype.findNearestWaypointToPlayer = function () {
    let playerPos = this.player.getPosition();
    let nearestWaypoint = null;
    let shortestDistance = Infinity;

    // Check each waypoint and find the one closest to the player
    this.waypoints.forEach(waypoint => {
        let distance = playerPos.distance(waypoint.position);
        if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestWaypoint = waypoint;
        }
    });

    return nearestWaypoint;
};

SpiderController.prototype.findNearestWaypointToPosition = function (pos) {
    let nearestWaypoint = null;
    let shortestDistance = Infinity;

    // Check each waypoint and find the one closest to the position
    this.waypoints.forEach(waypoint => {
        let distance = pos.distance(waypoint.position);
        if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestWaypoint = waypoint;
        }
    });

    return nearestWaypoint;
};

SpiderController.prototype.findPath = function (startPointIndex, targetPointIndex) {
    // Get shortest path
    let startId = startPointIndex;
    let endId = targetPointIndex; // Example target
    this.shortestPath = dijkstra(startId, endId, this.waypoints);
    // Set initial target waypoint
    this.currentWaypointIndex = 0;
    this.targetWaypoint = this.waypoints[this.shortestPath[this.currentWaypointIndex]];
    this.targetWaypointPos.set(this.targetWaypoint.position.x, this.targetWaypoint.position.y, this.targetWaypoint.position.z);
};

// Update function called every frame
SpiderController.prototype.update = function (dt) {
    //this.havePlayer = this.app.systems.rigidbody.raycastFirstByTag(this.spiderRayStart.getPosition().clone(), this.spiderRayEnd.getPosition().clone(), "Player") != null;
    this.app.playerSpiderDistance = this.entity.getPosition().distance(this.app.networkManager.localPlayer.getPosition());
    //Connected to the server, lerp spider to network position and rotation
    if (this.app.room) {
        this.startLerping(dt);
        return;
    }

    //offline movement
    if (this.currentWaypointIndex == null) return;
    if (this.currentWaypointIndex < this.shortestPath.length) {
        this.moveToNextWaypoint(dt);
        if (this.isSpiderIdle == true && this.shortestPath.length > 1) {
            this.isSpiderIdle = false;
            this.spiderAnim.setBoolean("isRunning", true);
        }

    } else { //reached target point
        let oldWaypoint = this.waypoints[this.shortestPath[this.shortestPath.length - 1]];

        if (this.isSpiderIdle == false) {
            if (this.targetCell != null) {
                if (oldWaypoint.id == this.targetCell.waypointId) {
                    this.app.location = LOCATIONS.PRISON;
                    let cage = this.app.gameManager.prisonCells.find(c => c.script.interactableCage.id == this.targetCell.cageId);
                    if (!cage) return;
                    this.app.player.controller.grabbedBySpider(false);
                    this.app.player.entity.reparent(this.app.root);
                    this.app.player.entity.rigidbody.teleport(cage.children[0].getPosition());
                    cage.script.interactableCage.setPlayer(this.app.player.entity);
                    this.app.player.interact.refresh();
                    console.log("Teleported to nearest prison cell");

                    this.targetCell = null;

                    this.targetNode = this.randomWaypoint();
                    this.findPath(this.targetWaypoint.id, this.targetNode.id);
                }
            }
            else if (this.targetNode != null) {
                if (oldWaypoint.id == this.targetNode.id) {
                    this.targetNode = this.randomWaypoint();
                    this.findPath(this.targetWaypoint.id, this.targetNode.id);
                }
            }

            this.isSpiderIdle = true;
            this.spiderAnim.setBoolean("isRunning", false);
        }
    }

    this.isPlayerInAttackRange = this.app.playerSpiderDistance < 2.5 && this.mouthGrabParent.children.length == 0;
    if (this.isPlayerInAttackRange) {
        // Rotate the spider towards the player
        this.rotateTowardsTarget(dt, this.player.getPosition(), this.targetWaypoint.rotation);
        this.isPlayerInAttackRange = true;
        if (this.canSpiderAttack) {
            this.playSound("attack", true);
            this.spiderAnim.setBoolean("attack", true);
            this.playSound("attack", true);
            this.canSpiderAttack = false;

            this.spiderAttackTimeout = setTimeout(() => {
                this.isPlayerInAttackRange = this.app.playerSpiderDistance < 2.5 && this.mouthGrabParent.children.length == 0;
                this.spiderAnim.setBoolean("attack", false);
                this.canSpiderAttack = true;
                if (this.isPlayerInAttackRange) {
                    console.log("spider grabbed offline local player")
                    this.app.networkManager.localPlayer.reparent(this.mouthGrabParent);
                    this.app.networkManager.playerController.grabbedBySpider(true);
                    this.targetCell = this.randomCell();
                    this.playSound("catch", true);
                }
            }, 700);
        }
    } else {
        if (this.attackTimeout) {
            clearTimeout(this.attackTimeout);
            this.attackTimeout = null;
        }
        if (this.attackInterval) clearInterval(this.attackInterval);
        // Rotate the spider towards the next waypoint
        this.rotateTowardsTarget(dt, this.targetWaypoint.position, this.targetWaypoint.rotation);
    }

    //pc.app.drawLine(this.spider.getPosition().clone().add(new pc.Vec3(0, 1, 0)), this.targetWaypointPos.getPosition().clone().add(new pc.Vec3(0, 1, 0)), pc.Color.RED)
};


// Move spider to the next waypoint
SpiderController.prototype.moveToNextWaypoint = function (dt) {
    if (this.stunned || this.trapped) return;

    //spider playera yakinsa nodelari takip etmek yerine saldir
    if (this.isPlayerInAttackRange) {
        return;
    }
    // Get current and next waypoint positions
    let currentPos = this.spider.getPosition();
    let targetPos = this.targetWaypointPos;

    // Calculate the direction and distance to the target
    let direction = targetPos.clone().sub(currentPos).normalize();
    let distanceToTarget = currentPos.distance(targetPos);

    // Move towards the target at a consistent speed
    let movementStep = this.moveSpeed * dt; // Calculate the distance to move this frame

    // If the spider is close to the target, clamp the movement to avoid overshooting
    if (movementStep >= distanceToTarget) {
        let oldWaypoint = this.waypoints[this.shortestPath[this.currentWaypointIndex]];

        if (webNodes.includes(oldWaypoint.id) && !oldWaypoint.web && this.app.webCount < 5) {
            let canSpawn = Math.random() < .1;
            if (!canSpawn) return;

            const rayStart = new pc.Vec3(this.targetWaypointPos.x, this.targetWaypointPos.y + 1, this.targetWaypointPos.z);
            const rayEnd = rayStart.clone().sub(new pc.Vec3(0, 1, 0));

            const _rayResults = [
                this.app.systems.rigidbody.raycastFirstByTag(rayStart, rayEnd, "Ground"),
            ];

            let success = false;
            let pos = pc.Vec3.ZERO;
            for (const result of _rayResults) {
                if (result) {
                    pos = result.point.clone().add(new pc.Vec3(0, .1, 0));
                    success = true;
                    break;
                }
            }

            if (success) {
                let web = this.spiderWebTemplate.resource.instantiate();
                web.reparent(this.app.root);
                web.tags.add("SpiderWeb");
                web.setPosition(pos);

                web.waypoint = this.waypoints[this.shortestPath[this.currentWaypointIndex]];
                this.waypoints[this.shortestPath[this.currentWaypointIndex]].web = web;

                this.app.webCount += 1;
                web.script.spiderWeb.destroyTimer(30);
            }
        }

        this.spider.setPosition(targetPos); // Snap to the target position
        this.currentWaypointIndex++;
        if (this.currentWaypointIndex < this.shortestPath.length) {
            this.targetWaypoint = this.waypoints[this.shortestPath[this.currentWaypointIndex]];
            this.targetWaypointPos.set(this.targetWaypoint.position.x, this.targetWaypoint.position.y, this.targetWaypoint.position.z);
        }
    } else {
        // Move the spider towards the target
        let newPos = currentPos.clone().add(direction.scale(movementStep));
        this.spider.setPosition(newPos);
    }
};

// Rotate spider
SpiderController.prototype.rotateTowardsTarget = function (dt, targetPos, targetRot) {
    // Get direction vector to the target
    const currentPos = this.spider.getPosition();
    const targetDirection = currentPos.clone().sub(targetPos).normalize();
    // Calculate horizontal direction for yaw
    const horizontalDirection = new pc.Vec3(targetDirection.x, 0, targetDirection.z).normalize();
    // Calculate the distance between current and target positions (XZ plane)
    const horizontalDistance = Math.sqrt(Math.pow(targetPos.x - currentPos.x, 2) + Math.pow(targetPos.z - currentPos.z, 2));
    // Check if there is significant horizontal movement to calculate yaw
    let yaw;
    if (horizontalDistance > 0) {  // Threshold to avoid division by zero or negligible movement
        yaw = Math.atan2(horizontalDirection.x, horizontalDirection.z) * pc.math.RAD_TO_DEG;
        yaw -= targetRot.y + targetRot.x;
    } else {
        // If there's no horizontal movement, keep the last known yaw
        yaw = this.spiderDesiredAngle;  // Fallback to previous yaw or 0
    }
    // Calculate Pitch (rotation around X-axis, vertical angle)
    const pitch = Math.asin(-targetDirection.y) * pc.math.RAD_TO_DEG + targetRot.x;
    // Create the quaternion with the new rotations (yaw and pitch)
    const targetQuat = new pc.Quat().setFromEulerAngles(pitch, yaw, 0);
    // Smoothly interpolate (slerp) towards the target rotation
    this.spiderQuatLerp = new pc.Quat().slerp(this.spiderQuatLerp, targetQuat, this.rotationSpeed * dt);
    // Apply the new rotation to the spider
    this.spider.setRotation(this.spiderQuatLerp);
    // Store the current yaw for future reference
    this.spiderDesiredAngle = yaw;
};


// Function to generate waypoints from the hierarchy
SpiderController.prototype.generateWaypoints = function () {
    let waypoints = [];
    let chapterNumber = 1;
    if (this.app.networkManager.currentSceneName == "Chapter1") {
        chapterNumber = 1;
    } else if (this.app.networkManager.currentSceneName == "Chapter2") {
        chapterNumber = 2;
    }
    else if (this.app.networkManager.currentSceneName == "Chapter3") {
        chapterNumber = 3;
    }
    // Iterate through each node (e.g., Node_0, Node_1, Node_2)
    this.pathRoot.children.forEach((node) => {
        if (node.name.startsWith("Node_")) {
            let nodeId = parseInt(node.name.split('_')[1]); // Extract node ID from name

            // Create a waypoint object for the node
            let waypoint = {
                id: nodeId,
                position: node.getPosition().clone(),
                rotation: node.getLocalEulerAngles().clone(),
                neighbors: [],
                isWeb: chapterNumber == 1 ? webNodes.includes(nodeId) : false
            };

            // Iterate through each neighbor entity under the node
            node.children.forEach((neighborEntity) => {
                if (neighborEntity.name.startsWith("Neighbor_")) {
                    let neighborId = parseInt(neighborEntity.name.split('_')[1]); // Extract neighbor ID from name

                    // Calculate the weight (distance) to the neighbor
                    let neighborNode = this.pathRoot.findByName("Node_" + neighborId);
                    if (neighborNode != null) {
                        let distance = node.getPosition().distance(neighborNode.getPosition());

                        // Add neighbor to the waypoint's neighbors list
                        waypoint.neighbors.push({
                            id: neighborId,
                            weight: distance
                        });
                    } else {
                        waypoint.neighbors.push({
                            id: neighborId,
                            weight: 99999999
                        });
                    }
                }
            });

            // Add the waypoint to the waypoints array
            waypoints.push(waypoint);
        }
    });
    return waypoints;
};

SpiderController.prototype.randomWaypoint = function () {
    return this.waypoints[Math.floor(Math.random() * this.waypoints.length)];
}

SpiderController.prototype.randomCell = function () {
    if (this.app.networkManager.currentSceneName == "Chapter1") {
        return prisonCellPoints[Math.floor(Math.random() * prisonCellPoints.length)];
    } else if (this.app.networkManager.currentSceneName == "Chapter2") {
        return prisonCellPoints2[Math.floor(Math.random() * prisonCellPoints2.length)];
    } else if (this.app.networkManager.currentSceneName == "Chapter3") {
        return prisonCellPoints3[Math.floor(Math.random() * prisonCellPoints3.length)];
    } else {
        return prisonCellPoints[Math.floor(Math.random() * prisonCellPoints.length)];
    }
}

SpiderController.prototype.stun = function (duration) {
    this.stunned = true;
    this.spiderAnim.setBoolean("isStunned", true);
    console.log("XXX SPIDER STUNNED");

    this.stunTimeout = setTimeout(() => {
        this.stunned = false;
        this.spiderAnim.setBoolean("isStunned", false);
    }, duration * 1000);
};

SpiderController.prototype.trap = function (duration) {
    this.trapped = true;
    this.spiderAnim.setBoolean("isTrapped", true);
    console.log("XXX SPIDER TRAPPED");

    this.trapTimeout = setTimeout(() => {
        this.trapped = false;
        this.spiderAnim.setBoolean("isTrapped", false);
    }, duration * 1000);
};

SpiderController.prototype.setFlarePos = function (pos, duration) {
    this.flarePos = pos;

    if (this.flareTimeout) clearTimeout(this.flareTimeout);
    this.flareTimeout = setTimeout(() => {
        this.flarePos = null;
        this.flareTimeout = null;
    }, duration * 1000);

    console.log("flare pos set");
};