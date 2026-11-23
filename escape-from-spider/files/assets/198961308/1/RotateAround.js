var RotateAround = pc.createScript('rotateAround');

// Reference to the player entity
RotateAround.attributes.add('player', { type: 'entity' });
RotateAround.attributes.add('cylinder', { type: 'entity' }); // The cylinder to rotate around

// Initialize the script
RotateAround.prototype.initialize = function () {
    if (!this.player) {
        console.error("Player entity not assigned.");
    }
    if (!this.cylinder) {
        console.error("Cylinder entity not assigned.");
    }
};

// Update function called every frame
RotateAround.prototype.update = function (dt) {
    if (!this.player || !this.cylinder) return;

    // Get the world position of the player and the text (around the cylinder)
    var playerPos = this.player.getPosition();

    // Get the cylinder position (pivot point)
    var cylinderPos = this.cylinder.getPosition();

    // Calculate the direction from the text to the player, but lock to Y-axis
    var direction = playerPos.clone().sub(cylinderPos);
    direction.y = 0; // Ignore Y-axis movement to only rotate on Y-axis

    // Get the target rotation for the text to face the player horizontally
    var targetRotation = new pc.Quat();
    targetRotation.setFromEulerAngles(0, Math.atan2(direction.x, direction.z) * pc.math.RAD_TO_DEG, 0);

    // Apply the rotation to the text entity (on Y-axis only)
    this.entity.setRotation(targetRotation);
};
