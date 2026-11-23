/*
editor.on("viewport:update", () => {
    const points = pc.app.root.findByName("PathfindingManager");
    for (let i = 0; i < points.children.length - 1; i++) {
        let point = points.children[i];

        if (!point.name.startsWith("Node")) continue;

        for (let i2 = 0; i2 < point.children.length; i2++) {
            let otherPoint = point.children[i2];

            if (!otherPoint.name.startsWith("Neighbor")) continue;
            //console.log(point.name + " ----> " + otherPoint.name)
            //find real node
            otherPoint = points.findByName("Node_" + parseInt(otherPoint.name.split("_")[1], 10));

            // Start and end positions of the line
            let start = point.getPosition().clone();
            let end = otherPoint.getPosition().clone();

            // Draw the main line
            pc.app.drawLine(start, end, pc.Color.WHITE);

            // Calculate the middle position of the line
            let middlePos = new pc.Vec3();
            middlePos.lerp(start, end, 0.5);

            // Direction vector of the line
            let direction = end.clone().sub(start).normalize();

            // Perpendicular vector for the arrowhead
            let perp = new pc.Vec3(-direction.z, 0, direction.x).normalize();

            // Arrowhead size
            let arrowSize = 0.5;

            // Points for the arrowhead
            let arrowLeft = middlePos.clone().sub(direction.clone().scale(arrowSize)).add(perp.clone().scale(arrowSize * 0.5));
            let arrowRight = middlePos.clone().sub(direction.clone().scale(arrowSize)).sub(perp.clone().scale(arrowSize * 0.5));

            // Draw the arrowhead
            pc.app.drawLine(middlePos, arrowLeft, pc.Color.RED);
            pc.app.drawLine(middlePos, arrowRight, pc.Color.RED);
        }

    }
});


setInterval(() => {
    if (pc.app.pathfindingManager == null || pc.app.pathfindingManager.waypoints == null) return;
    const points = pc.app.pathfindingManager.waypoints;

    for (let i = 0; i < points.length - 1; i++) {
        let point = points[i];

        for (let i2 = 0; i2 < point.neighbors.length; i2++) {
            let otherPoint = point.neighbors[i2];
            //console.log(point.id + " ----> " + otherPoint.id)
            //find real node
            otherPoint = points[otherPoint.id]

            // Start and end positions of the line
            let start = point.position.clone();
            let end = otherPoint.position.clone();

            // Draw the main line
            pc.app.drawLine(start, end, pc.Color.WHITE);

            // Calculate the middle position of the line
            let middlePos = new pc.Vec3();
            middlePos.lerp(start, end, 0.5);

            // Direction vector of the line
            let direction = end.clone().sub(start).normalize();

            // Perpendicular vector for the arrowhead
            let perp = new pc.Vec3(-direction.z, 0, direction.x).normalize();

            // Arrowhead size
            let arrowSize = 0.5;

            // Points for the arrowhead
            let arrowLeft = middlePos.clone().sub(direction.clone().scale(arrowSize)).add(perp.clone().scale(arrowSize * 0.5));
            let arrowRight = middlePos.clone().sub(direction.clone().scale(arrowSize)).sub(perp.clone().scale(arrowSize * 0.5));

            // Draw the arrowhead
            pc.app.drawLine(middlePos, arrowLeft, pc.Color.RED);
            pc.app.drawLine(middlePos, arrowRight, pc.Color.RED);
        }

    }
}, 0);
*/