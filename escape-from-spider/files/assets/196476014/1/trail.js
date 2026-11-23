var Trail = pc.createScript("trail");

Trail.attributes.add("color", {
    type: "rgb",
    title: "color"
});

Trail.attributes.add("radius", {
    type: "number",
    title: "radius",
    default: 0.5
});

Trail.attributes.add("lifetime", {
    type: "number",
    title: "lifetime",
    default: 1.2
});

Trail.attributes.add("trailfadeness", {
    type: "number",
    title: "trailfadeness",
    default: 2,
    min: 1,
    max: 4
});

Trail.attributes.add("opacityFactor", {
    type: "number",
    title: "opacityFactor",
    default: 0.8,
    min: 0.1,
    max: 1
});


Trail.v1 = new pc.Vec3();
Trail.q1 = new pc.Quat();
Trail.m1 = new pc.Mat4();

Trail.prototype.init = function () {
    this.MAX_VERTICES = 3600;
    this.VERTEX_SIZE = 4;
    this.timer = 0;
    this.node = null;
    this.vertices = [];
    this.vertexData = new Float32Array(this.MAX_VERTICES * this.VERTEX_SIZE);
    this.model = null;
    var e = this.color.r + ", " + this.color.g + ", " + this.color.b;

    var shaderDefinition = {
        attributes: {
            poslist: pc.SEMANTIC_POSITION
        },
        vshader: ["attribute vec4 poslist;",
            "",
            "uniform mat4 matrix_viewProjection;",
            "uniform float trail_time;",
            "",
            "varying float vAge;",
            "",
            "void main(void)",
            "{",
            "   vAge = trail_time - poslist.w;",
            "   gl_Position = matrix_viewProjection * vec4(poslist.xyz, 1.0);",
            "}"].join("\n"),

        fshader: ["precision mediump float;",
            "",
            "varying float vAge;",
            "",
            "uniform float trail_lifetime;",
            "uniform bool visible;",
            "void main(void)",
            "{",
            "   vec4 color = vec4(0);",
            "   if(visible) color = vec4(" + e + ", (1.0 - (vAge / trail_lifetime)) *" + this.opacityFactor + ");",
            "   gl_FragColor = color;",
            "}"].join("\n")
    };

    var gl = new pc.Shader(this.app.graphicsDevice, shaderDefinition);
    var material = this.material = new pc.scene.Material();
    material.shader = gl;
    material.setParameter("trail_time", 0);
    material.setParameter("trail_lifetime", this.lifetime);
    material.setParameter("visible", true);
    material.cull = pc.CULLFACE_NONE;
    material.blendType = pc.BLEND_ADDITIVE;
    material.blendSrc = pc.BLENDMODE_SRC_ALPHA;
    material.blendDst = pc.BLENDMODE_ONE_MINUS_SRC_ALPHA;
    material.blendEquation = pc.BLENDEQUATION_ADD;
    material.depthWrite = false;

    var vertexFormat = new pc.VertexFormat(this.app.graphicsDevice, [{
        semantic: pc.SEMANTIC_POSITION,
        components: 4,
        type: pc.TYPE_FLOAT32
    }]);

    // Vertex Buffer for the mesh
    var vertexBuffer = new pc.VertexBuffer(this.app.graphicsDevice, vertexFormat, this.MAX_VERTICES, pc.BUFFER_DYNAMIC);
    var mesh = new pc.scene.Mesh(this.app.graphicsDevice)
    mesh.vertexBuffer = vertexBuffer;
    mesh.indexBuffer[0] = null;
    mesh.primitive[0].type = pc.PRIMITIVE_TRISTRIP;
    mesh.primitive[0].base = 0;
    mesh.primitive[0].count = 0;
    mesh.primitive[0].indexed = false;

    var node = new pc.GraphNode();
    var instance = new pc.MeshInstance(node, mesh, material);
    instance.layer = pc.LAYER_WORLD;
    instance.cull = false;
    instance.updateKey();
    this.model = new pc.Model();
    this.model.graph = node;
    this.model.meshInstances.push(instance);
    this.setNode(this.entity);
    this.vb = vertexBuffer;
    this.isNoneState = false;
    this.cachedVec = new pc.Vec3(0, 0, 0);
    this.camera = this.app.root.findByName('Camera');

    this.on('destroy', function () {
        this.SetOff();
    }, this);
};

Trail.prototype.postUpdate = function (deltaTime) {
    if (this.timer += deltaTime, this.model.meshInstances[0].material.setParameter("trail_time", this.timer),
        this.clearOld(), this.spawn(this.radius), this.vertices.length > 1) {
        this.copyToArrayBuffer();
        this.updateNumActive();
        var tf_proto = this.model.meshInstances[0].mesh.vertexBuffer;
        (new Float32Array(tf_proto.lock())).set(this.vertexData);
        tf_proto.unlock();
        if (!this.app.scene.containsModel(this.model)) {
            this.app.scene.addModel(this.model);
        }
    } else {
        if (this.app.scene.containsModel(this.model)) {
            this.app.scene.removeModel(this.model);
        }
    }
};

Trail.prototype.SetOn = function () {
    this.reset();
    this.material.setParameter("visible", true);
};

Trail.prototype.SetOff = function () {
    this.app.scene.removeModel(this.model);
    this.material.setParameter("visible", false);
};

Trail.prototype.visible = function () {
    this.material.setParameter("visible", true);
};

Trail.prototype.invisible = function () {
    this.material.setParameter("visible", false);
};

Trail.prototype.reset = function () {
    this.oldPos = null;
    this.timer = 0;
    this.vertices = [];
};

Trail.prototype.spawn = function (radius) {
    var e = this.node.getPosition();

    // Make the generated vertices to orient towards the camera
    var cameraPos = this.camera.getPosition();
    var currentPos = this.node.getPosition();
    var dir = Trail.v1;
    var m = Trail.m1;
    var q = Trail.q1;
    dir.copy(cameraPos).sub(currentPos).normalize();
    setMat4Forward(m, dir, pc.Vec3.UP);
    q.setFromMat4(m);

    var listToFind = [];
    if (this.oldPos) {
        var b = this.oldPos.clone().sub(e);
        var r = 0;
        for (; r < 9; r++) {  // 9 because the shape is Nonagon.
            var exponent = Math.PI / 4 * r;
            this.cachedVec.set(radius * Math.cos(exponent), radius * Math.sin(exponent), 0);
            q.transformVector(this.cachedVec, this.cachedVec);
            this.cachedVec.add(e);

            listToFind = listToFind.concat([this.cachedVec.x, this.cachedVec.y, this.cachedVec.z, this.cachedVec.x + b.x, this.cachedVec.y + b.y, this.cachedVec.z + b.z]);
        }
        this.oldPos = e.clone();
        this.vertices.unshift({
            spawnTime: this.timer,
            vertexPair: listToFind
        });
    } else {
        this.oldPos = e.clone();
    }
};

Trail.prototype.clearOld = function () {
    var i = this.vertices.length - 1;
    for (; i >= 0; i--) {
        var v = this.vertices[i];
        if (!(this.timer - v.spawnTime >= this.lifetime)) {
            return;
        }
        this.vertices.pop();
    }
};

Trail.prototype.copyToArrayBuffer = function () {
    var i = 0;
    for (; i < this.vertices.length; i++) {
        var v = this.vertices[i];
        var j = 0;
        for (; j < 18; j++) {
            this.vertexData[72 * i + 0 + 4 * j] = v.vertexPair[0 + 3 * j];
            this.vertexData[72 * i + 1 + 4 * j] = v.vertexPair[1 + 3 * j];
            this.vertexData[72 * i + 2 + 4 * j] = v.vertexPair[2 + 3 * j];
            this.vertexData[72 * i + 3 + 4 * j] = v.spawnTime;
        }
    }
};

Trail.prototype.updateNumActive = function () {
    this.model.meshInstances[0].mesh.primitive[0].count = this.trailfadeness * this.vertices.length * 9;
};

Trail.prototype.setNode = function (prev) {
    this.node = prev;
};

Trail.prototype.Finit = function () {
    this.vb.destroy();
};

Trail.prototype.clear = function () {
    this.reset();
    if (this.app.scene.containsModel(this.model)) {
        console.log("Removed model");
        this.app.scene.removeModel(this.model);
    }
};

// helper function
var setMat4Forward = (function () {
    var x, y, z;

    x = new pc.Vec3();
    y = new pc.Vec3();
    z = new pc.Vec3();

    return function (mat4, forward, up) {
        // Inverse the forward direction as +z is pointing backwards due to the coordinate system
        z.copy(forward).scale(-1);
        y.copy(up).normalize();
        x.cross(y, z).normalize();
        y.cross(z, x);

        var r = mat4.data;

        r[0] = x.x;
        r[1] = x.y;
        r[2] = x.z;
        r[3] = 0;
        r[4] = y.x;
        r[5] = y.y;
        r[6] = y.z;
        r[7] = 0;
        r[8] = z.x;
        r[9] = z.y;
        r[10] = z.z;
        r[11] = 0;
        r[15] = 1;

        return mat4;
    };
}());