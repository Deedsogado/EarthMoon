"use strict";

var canvas;
var gl;

var axis;
var floor;
var segment;
var sphere;

var lineProgram;
var sphereProgram;
var earthProgram;
var moonProgram;

// A = angle
// X = x-axis
// Y = y-axis
// Z = z-axis
var view = "A";
var aspect = 1.0;

var mvMatrix, pMatrix, nMatrix, liMatrix;
var cameraMatrix = mat4();
var pivot;
var lightSource = vec4(10000.0, 1.0, 0.0, 0.0);

var animate = true;
var keepRendering = true;
var activeTextureIdCounter = 0;
var earthRotation = radians(180);
var theta = radians(45);
var radius = 5;

var mousePosOne;
var mousePosTwo;
var mouseButtonHeldDown = false;
var mouseButtonPressedAtLeastOnce = false;

// Stack stuff
var matrixStack = new Array();
function pushMatrix() {
	matrixStack.push(mat4(mvMatrix));
}
function popMatrix() {
	mvMatrix = matrixStack.pop();
}

var lightStack = new Array();
function pushMatrixLi() {
	lightStack.push(mat4(liMatrix));
}
function popMatrixLi() {
	liMatrix = lightStack.pop();
}

function configureTexture(image, targetProgram, samplerName) {

	var texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0 + activeTextureIdCounter);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB,
		gl.RGB, gl.UNSIGNED_BYTE, image);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
		gl.NEAREST_MIPMAP_LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

	gl.uniform1i(gl.getUniformLocation(targetProgram.program, samplerName), activeTextureIdCounter++);
}

var LineProgram = function () {
	this.program = initShaders(gl, "line-vshader", "line-fshader");
	gl.useProgram(this.program);

	this.vertexLoc = gl.getAttribLocation(this.program, "vPosition");
	this.colorLoc = gl.getAttribLocation(this.program, "vColor");

	this.mvMatrixLoc = gl.getUniformLocation(this.program, "mvMatrix");
	this.pMatrixLoc = gl.getUniformLocation(this.program, "pMatrix");
	this.nMatrixLoc = gl.getUniformLocation(this.program, "nMatrix");
}

var SphereProgram = function () {
	this.program = initShaders(gl, "sphere-vshader", "sphere-fshader");
	gl.useProgram(this.program);

	this.vertexLoc = gl.getAttribLocation(this.program, "vPosition");
	this.normalLoc = gl.getAttribLocation(this.program, "vNormal");
	this.colorLoc = gl.getAttribLocation(this.program, "vColor");

	this.mvMatrixLoc = gl.getUniformLocation(this.program, "mvMatrix");
	this.pMatrixLoc = gl.getUniformLocation(this.program, "pMatrix");
	this.nMatrixLoc = gl.getUniformLocation(this.program, "nMatrix");
	this.liMatrixLoc = gl.getUniformLocation(this.program, "liMatrix");
	this.lightSourceLoc = gl.getUniformLocation(this.program, "lightPositionSphere");
}

var EarthProgram = function () {
	this.program = initShaders(gl, "earth-vshader", "earth-fshader");
	gl.useProgram(this.program);

	this.vertexLoc = gl.getAttribLocation(this.program, "vPosition");
	this.normalLoc = gl.getAttribLocation(this.program, "vNormal");
	this.colorLoc = gl.getAttribLocation(this.program, "vColor");
	// Added by Ross
	this.texCoordLoc = gl.getAttribLocation(this.program, "vTexCoord");

	this.mvMatrixLoc = gl.getUniformLocation(this.program, "mvMatrix");
	this.pMatrixLoc = gl.getUniformLocation(this.program, "pMatrix");
	this.nMatrixLoc = gl.getUniformLocation(this.program, "nMatrix");
	this.liMatrixLoc = gl.getUniformLocation(this.program, "liMatrix");
	this.lightSourceLoc = gl.getUniformLocation(this.program, "lightPositionEarth");

	var earthTexture = document.getElementById("texEarth");
	configureTexture(earthTexture, this, "earthDaySampler");

	var earthTexture = document.getElementById("texNight");
	configureTexture(earthTexture, this, "earthNightSampler");

}

var MoonProgram = function () {
	this.program = initShaders(gl, "moon-vshader", "moon-fshader");
	gl.useProgram(this.program);

	this.vertexLoc = gl.getAttribLocation(this.program, "vPosition");
	this.normalLoc = gl.getAttribLocation(this.program, "vNormal");
	this.colorLoc = gl.getAttribLocation(this.program, "vColor");
	// Added by Ross
	this.texCoordLoc = gl.getAttribLocation(this.program, "vTexCoord");

	this.mvMatrixLoc = gl.getUniformLocation(this.program, "mvMatrix");
	this.pMatrixLoc = gl.getUniformLocation(this.program, "pMatrix");
	this.nMatrixLoc = gl.getUniformLocation(this.program, "nMatrix");
	this.liMatrixLoc = gl.getUniformLocation(this.program, "liMatrix");
	this.lightSourceLoc = gl.getUniformLocation(this.program, "lightPositionMoon");

	var moonTexture = document.getElementById("texMoon");
	configureTexture(moonTexture, this, "moonSampler");

}

function renderAxis() {
	gl.useProgram(lineProgram.program);

	gl.enableVertexAttribArray(lineProgram.vertexLoc);
	gl.bindBuffer(gl.ARRAY_BUFFER, axis.vertexBuffer);
	gl.vertexAttribPointer(lineProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

	gl.enableVertexAttribArray(lineProgram.colorLoc);
	gl.bindBuffer(gl.ARRAY_BUFFER, axis.colorBuffer);
	gl.vertexAttribPointer(lineProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

	gl.uniformMatrix4fv(lineProgram.mvMatrixLoc, false, flatten(mvMatrix));
	gl.uniformMatrix4fv(lineProgram.pMatrixLoc, false, flatten(pMatrix));

	gl.drawArrays(gl.LINES, 0, axis.numPoints);
};

function renderFloor() {
	gl.useProgram(lineProgram.program);

	gl.enableVertexAttribArray(lineProgram.vertexLoc);
	gl.bindBuffer(gl.ARRAY_BUFFER, floor.vertexBuffer);
	gl.vertexAttribPointer(lineProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

	gl.enableVertexAttribArray(lineProgram.colorLoc);
	gl.bindBuffer(gl.ARRAY_BUFFER, floor.colorBuffer);
	gl.vertexAttribPointer(lineProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

	gl.uniformMatrix4fv(lineProgram.mvMatrixLoc, false, flatten(mvMatrix));
	gl.uniformMatrix4fv(lineProgram.pMatrixLoc, false, flatten(pMatrix));

	gl.drawArrays(gl.LINES, 0, floor.numPoints);
};

function renderSegment() {
	gl.useProgram(lineProgram.program);

	gl.enableVertexAttribArray(lineProgram.vertexLoc);
	gl.bindBuffer(gl.ARRAY_BUFFER, segment.vertexBuffer);
	gl.vertexAttribPointer(lineProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

	gl.enableVertexAttribArray(lineProgram.colorLoc);
	gl.bindBuffer(gl.ARRAY_BUFFER, segment.colorBuffer);
	gl.vertexAttribPointer(lineProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

	gl.uniformMatrix4fv(lineProgram.mvMatrixLoc, false, flatten(mvMatrix));
	gl.uniformMatrix4fv(lineProgram.pMatrixLoc, false, flatten(pMatrix));

	gl.drawArrays(gl.LINES, 0, segment.numPoints);
};

function renderSphere() {
	gl.useProgram(sphereProgram.program);

	gl.enableVertexAttribArray(sphereProgram.vertexLoc);
	gl.bindBuffer(gl.ARRAY_BUFFER, sphere.vertexBuffer);
	gl.vertexAttribPointer(sphereProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

	gl.enableVertexAttribArray(sphereProgram.normalLoc);
	gl.bindBuffer(gl.ARRAY_BUFFER, sphere.normalBuffer);
	gl.vertexAttribPointer(sphereProgram.normalLoc, 4, gl.FLOAT, false, 0, 0);

	gl.enableVertexAttribArray(sphereProgram.colorLoc);
	gl.bindBuffer(gl.ARRAY_BUFFER, sphere.colorBuffer);
	gl.vertexAttribPointer(sphereProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

	nMatrix = normalMatrix(mvMatrix, false);

	gl.uniformMatrix4fv(sphereProgram.mvMatrixLoc, false, flatten(mvMatrix));
	gl.uniformMatrix4fv(sphereProgram.pMatrixLoc, false, flatten(pMatrix));
	gl.uniformMatrix4fv(sphereProgram.nMatrixLoc, false, flatten(nMatrix));

	//  gl.uniformMatrix4fv(sphereProgram.liMatrixLoc, false, flatten(liMatrix));
	gl.uniformMatrix4fv(sphereProgram.liMatrixLoc, false, flatten(normalMatrix(liMatrix)));

	//  var ls = mult(inverse(liMatrix), lightSource);
	//	var ls = mult(normalMatrix(liMatrix, false), lightSource);
	//  var ls = mult(liMatrix, lightSource);
	//  gl.uniform4fv(sphereProgram.lightSourceLoc, flatten(ls));
	gl.uniform4fv(sphereProgram.lightSourceLoc, flatten(lightSource));

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphere.indexBuffer);
	gl.drawElements(gl.TRIANGLES, sphere.numIndices, gl.UNSIGNED_SHORT, 0);
};

function renderEarth() {
	gl.useProgram(earthProgram.program);

	gl.enableVertexAttribArray(earthProgram.vertexLoc);
	gl.bindBuffer(gl.ARRAY_BUFFER, sphere.vertexBuffer);
	gl.vertexAttribPointer(earthProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

	gl.enableVertexAttribArray(earthProgram.normalLoc);
	gl.bindBuffer(gl.ARRAY_BUFFER, sphere.normalBuffer);
	gl.vertexAttribPointer(earthProgram.normalLoc, 4, gl.FLOAT, false, 0, 0);

	gl.enableVertexAttribArray(earthProgram.colorLoc);
	gl.bindBuffer(gl.ARRAY_BUFFER, sphere.colorBuffer);
	gl.vertexAttribPointer(earthProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

	// Added by Ross
	gl.enableVertexAttribArray(earthProgram.texCoordLoc);
	gl.bindBuffer(gl.ARRAY_BUFFER, sphere.texBuffer);
	gl.vertexAttribPointer(earthProgram.texCoordLoc, 2, gl.FLOAT, false, 0, 0);

	nMatrix = normalMatrix(mvMatrix, false);

	gl.uniformMatrix4fv(earthProgram.mvMatrixLoc, false, flatten(mvMatrix));
	gl.uniformMatrix4fv(earthProgram.pMatrixLoc, false, flatten(pMatrix));
	gl.uniformMatrix4fv(earthProgram.nMatrixLoc, false, flatten(nMatrix));

	gl.uniformMatrix4fv(earthProgram.liMatrixLoc, false, flatten(normalMatrix(liMatrix)));

	gl.uniform4fv(earthProgram.lightSourceLoc, flatten(lightSource));

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphere.indexBuffer);
	gl.drawElements(gl.TRIANGLES, sphere.numIndices, gl.UNSIGNED_SHORT, 0);
};

function renderMoon() {
	gl.useProgram(moonProgram.program);

	gl.enableVertexAttribArray(moonProgram.vertexLoc);
	gl.bindBuffer(gl.ARRAY_BUFFER, sphere.vertexBuffer);
	gl.vertexAttribPointer(moonProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

	gl.enableVertexAttribArray(moonProgram.normalLoc);
	gl.bindBuffer(gl.ARRAY_BUFFER, sphere.normalBuffer);
	gl.vertexAttribPointer(moonProgram.normalLoc, 4, gl.FLOAT, false, 0, 0);

	gl.enableVertexAttribArray(moonProgram.colorLoc);
	gl.bindBuffer(gl.ARRAY_BUFFER, sphere.colorBuffer);
	gl.vertexAttribPointer(moonProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

	// Added by Ross
	gl.enableVertexAttribArray(moonProgram.texCoordLoc);
	gl.bindBuffer(gl.ARRAY_BUFFER, sphere.texBuffer);
	gl.vertexAttribPointer(moonProgram.texCoordLoc, 2, gl.FLOAT, false, 0, 0);

	nMatrix = normalMatrix(mvMatrix, false);

	gl.uniformMatrix4fv(moonProgram.mvMatrixLoc, false, flatten(mvMatrix));
	gl.uniformMatrix4fv(moonProgram.pMatrixLoc, false, flatten(pMatrix));
	gl.uniformMatrix4fv(moonProgram.nMatrixLoc, false, flatten(nMatrix));

	gl.uniformMatrix4fv(moonProgram.liMatrixLoc, false, flatten(normalMatrix(liMatrix)));

	gl.uniform4fv(moonProgram.lightSourceLoc, flatten(lightSource));

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphere.indexBuffer);
	gl.drawElements(gl.TRIANGLES, sphere.numIndices, gl.UNSIGNED_SHORT, 0);
};

function tick() {
	render();
	if (keepRendering) {
		requestAnimFrame(tick);
	}
	if (animate) {
		earthRotation -= 2.0;
		if (view == "I") {
			theta += 0.01;
		}
	}
}

function render() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const fovy = 40.0;
	const near = 0.01;
	const far = 100;

	const at = vec3(0.0, 0.0, 0.0);
	var up = vec3(0.0, 1.0, 0.0);
	// eye defaults to isomorphic front view.
	var eye = vec3(radius * Math.sin(radians(45.0)),
			radius * Math.sin(radians(10.0)),
			radius * Math.cos(radians(45.0)));

	if (view == "x") {
		eye = vec3(radius, 0, 0);
	} else if (view == "X") {
		eye = vec3(-radius, 0, 0);
	} else if (view == "y") {
		eye = vec3(0, radius, 0);
		up = vec3(0.0, 0.0, -1.0);
	} else if (view == "Y") {
		eye = vec3(0, -radius, 0);
		up = vec3(0.0, 0.0, -1.0);
	} else if (view == "z") {
		eye = vec3(0, 0, radius);
	} else if (view == "Z") {
		eye = vec3(0, 0, -radius);
	} else if (view == "I") {
		eye = vec3(radius * Math.sin(theta),
				radius * Math.sin(radians(10.0)),
				radius * Math.cos(theta));
	}

	pMatrix = perspective(fovy, aspect, near, far);
	mvMatrix = lookAt(eye, at, up);

	if (view == "A" || view == "I") {

		if (mouseButtonHeldDown && !equal(mousePosOne, mousePosTwo)) {
			mvMatrix = mult(mvMatrix, mult(cameraMatrix, pivot));
		} else {
			mvMatrix = mult(mvMatrix, cameraMatrix);
		}
	}

	liMatrix = mat4();
	//  liMatrix = mult(liMatrix, translate(lightSource));

	renderFloor();
	mvMatrix = mult(mvMatrix, translate(0.0, 0.5, 0.0));
	mvMatrix = mult(mvMatrix, scalem(0.4, 0.4, 0.4));
	liMatrix = mult(liMatrix, translate(0.0, 0.5, 0.0));
	liMatrix = mult(liMatrix, scalem(0.4, 0.4, 0.4));

	pushMatrix();
	pushMatrixLi();
	mvMatrix = mult(mvMatrix, rotateZ(23.5)); // tilt earth's axis.
	liMatrix = mult(liMatrix, rotateZ(23.5)); // tilt earth's axis.


	pushMatrix();
	pushMatrixLi();
	mvMatrix = mult(mvMatrix, scalem(3.0, 3.0, 3.0));
	mvMatrix = mult(mvMatrix, translate(0, -0.5, 0));
	mvMatrix = mult(mvMatrix, rotateZ(90));
	liMatrix = mult(liMatrix, scalem(3.0, 3.0, 3.0));
	liMatrix = mult(liMatrix, translate(0, -0.5, 0));
	liMatrix = mult(liMatrix, rotateZ(90));

	renderSegment();
	popMatrix();
	popMatrixLi();

	mvMatrix = mult(mvMatrix, rotateY(earthRotation));
	liMatrix = mult(liMatrix, rotateY(earthRotation));
	renderEarth();
	//  renderSphere();
	popMatrix();
	popMatrixLi();

	pushMatrix();
	pushMatrixLi();
	mvMatrix = mult(mvMatrix, rotateY(earthRotation / 27)); // moon orbits earth in 27 days.
	mvMatrix = mult(mvMatrix, translate(3.0, 0, 0, 0));
	mvMatrix = mult(mvMatrix, scalem(0.4, 0.4, 0.4));
	liMatrix = mult(liMatrix, rotateY(earthRotation / 27));
	liMatrix = mult(liMatrix, translate(3.0, 0, 0, 0));
	liMatrix = mult(liMatrix, scalem(0.4, 0.4, 0.4));
	renderMoon();
	//  renderSphere();

	popMatrix();
	popMatrixLi();

}

function keyDown(e) {
	if (e.shiftKey) {
		switch (e.keyCode) {
		case 37:
			// left arrow
			break;
		case 38:
			// up arrow
			break;
		case 39:
			// right arrow
			break;
		case 40:
			// down arrow
			break;
		case "X".charCodeAt(0):
			view = "X";
			break;
		case "Y".charCodeAt(0):
			view = "Y";
			break;
		case "Z".charCodeAt(0):
			view = "Z";
			break;
		case "A".charCodeAt(0):
			view = "A";
			break;
		case "I".charCodeAt(0):
			view = "I";
			break;
		case "R".charCodeAt(0):
			cameraMatrix = mat4();
			radius = 5.0;
			break;
		case 32: // spacebar
			animate = !animate;
			break;
		case 8: // backspace
			keepRendering = !keepRendering;
			requestAnimFrame(tick);
			break;
		default:
			console.log("Unrecognized key press: " + e.keyCode);
			break;
		}
	} else {
		switch (e.keyCode) {
		case 37:
			// left arrow
			break;
		case 38:
			// up arrow
			break;
		case 39:
			// right arrow
			break;
		case 40:
			// down arrow
			break;
		case "X".charCodeAt(0):
			view = "x";
			break;
		case "Y".charCodeAt(0):
			view = "y";
			break;
		case "Z".charCodeAt(0):
			view = "z";
			break;
		case "A".charCodeAt(0):
			view = "A";
			break;
		case "I".charCodeAt(0):
			view = "I";
			break;
		case "R".charCodeAt(0):
			cameraMatrix = mat4();
			radius = 5.0;
			break;
		case 32: // spacebar
			animate = !animate;
			break;
		case 8: // backspace
			keepRendering = !keepRendering;
			requestAnimFrame(tick);
			break;
		default:
			console.log("Unrecognized key press: " + e.keyCode);
			break;
		}
	}
	if (!animate) {
		requestAnimFrame(render);
	}

}

function getMouseCoords(e) {
	var canvas = document.getElementById('gl-canvas');
	var rect = canvas.getBoundingClientRect();

	var mouse = vec3(
			Math.round((e.clientX - rect.left) / (rect.right - rect.left) * canvas.width),
			Math.round((e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height),
			0);

	// convert to WebGL Coords (-1.0 to 1.0);
	mouse[0] = 2 * mouse[0] / canvas.width - 1;
	mouse[1] = -2 * mouse[1] / canvas.height + 1;

	// if mouse is outside unit circle, project to unit circle.
	if (length(mouse) >= 1) {
		mouse = normalize(mouse);
	} else {
		// mouse is inside unit circle. reach forward on unit sphere to grab z.
		var z = Math.sqrt(1 - (mouse[0] * mouse[0]) - (mouse[1] * mouse[1]));
		mouse[2] = z;
	}
	return mouse;

}

function mouseDown(e) {
	mousePosOne = getMouseCoords(e);
	mousePosTwo = mousePosOne;
	mouseButtonHeldDown = true;
	mouseButtonPressedAtLeastOnce = true;
}

function mouseMove(e) {
	mousePosTwo = getMouseCoords(e);
	// use mouse to determine eye position
	if (mouseButtonHeldDown && !equal(mousePosOne, mousePosTwo)) {
		var normalAxis = cross(mousePosOne, mousePosTwo);
		var angle = Math.acos(dot(mousePosOne, mousePosTwo));
		angle = angle * 180 / Math.PI;
		pivot = rotate(angle, normalAxis);
	}

}

function mouseUp(e) {
	cameraMatrix = mult(cameraMatrix, pivot);
	mouseButtonHeldDown = false;
}

function mouseScrolled(e) {
	radius += (e.deltaY * 0.01);

}

window.onload = function init() {
	document.onkeydown = keyDown;

	canvas = document.getElementById("gl-canvas");
	canvas.onmousedown = mouseDown;
	canvas.onmousemove = mouseMove;
	canvas.onmouseup = mouseUp;
	canvas.onmousewheel = mouseScrolled;

	gl = WebGLUtils.setupWebGL(canvas);
	if (!gl) {
		alert("WebGL isn't available");
	}

	gl.viewport(0, 0, canvas.width, canvas.height);

	aspect = canvas.width / canvas.height;

	gl.clearColor(0.0, 0.0, 0.0, 1.0);

	gl.enable(gl.DEPTH_TEST);

	axis = new Axis();
	floor = new Floor();
	segment = new Segment();
	sphere = new Sphere(1, 200, 200);

	//  Load shaders and initialize attribute buffers
	lineProgram = new LineProgram();
	sphereProgram = new SphereProgram();
	earthProgram = new EarthProgram();
	moonProgram = new MoonProgram();

	tick();
}
