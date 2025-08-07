import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "./utils.js";
import { vec2, vec4 } from "./MV.js";

class Curve {
    constructor(controlPoints) {
        this.controlPoints = controlPoints;
        this.color = getRandomColorVec4();
        this.pointSize = getRandomBetweenTwoValues(MIN_POINT_SIZE, MAX_POINT_SIZE);
        this.velocity = vec2(getRandomBetweenTwoValues(-1, 1), getRandomBetweenTwoValues(-1, 1));
        // Tells if the curve is being drawn
        this.isDrawing = true;
    }
}

class Point {
    constructor(position, curveVelocity) {
        this.position = position;
        this.curveVelocity = curveVelocity;
        this.velocity = vec2(0.005 * (getRandomBetweenTwoValues(-1, 1) * 0.008  + this.curveVelocity[0]), 
                                0.005 *(getRandomBetweenTwoValues(-1, 1) * 0.008 + this.curveVelocity[1]));
    }
}

var gl;
var canvas;
var aspect;

var draw_program;

let curves = [];
// Echos
// Stores all the echos of each created curve
let allEchosAllCurves = [];
let numberEchos = 50;
const MIN_NUMBER_ECHOS = 5;

// Points that create a part of the curve drawn by 4 control points
let segments = 4;
const MIN_SEGMENTS = 1;
const MAX_SEGMENTS = 50;

// Length a Control Point needs to be from the previous
const POINTS_DISTANCE_THRESHOLD = 0.15;

const MIN_POINT_SIZE = 5;
const MAX_POINT_SIZE = 25;

let showSegmentPoints = true;
let showLines = true;
let pauseAnimations = false;
let animationsVelocity = 1;
let showEchos = false;
let isGravityOn = false;
const GRAVITY = -9.8;
let isBlackWhiteOn = false;

// Curves functions
const B_SPLINE = "B-Spline";
const CATMULL_ROM = "Catmull-Rom";
const BEZIER = "Bézier";
const curvesFunctions = [B_SPLINE, CATMULL_ROM, BEZIER];
// Curve function that is being used to draw the points
let curvesFunctionsIndex = 0;


/**
 * Resize event handler
 * 
 * @param {*} target - The window that has resized
 */
function resize(target) {
    // Aquire the new window dimensions
    const width = target.innerWidth;
    const height = target.innerHeight;

    // Set canvas size to occupy the entire window
    canvas.width = width;
    canvas.height = height;

    // Set the WebGL viewport to fill the canvas completely
    gl.viewport(0, 0, width, height);
}

function getRandomColorVec4() {
    let randomColorR = Math.random();
    let randomColorG = Math.random();
    let randomColorB = Math.random();
    // Don't let opacity/alpha be less than 0.1;
    let randomColorA = Math.random() * (1 - 0.1) + 0.1;
    return vec4(randomColorR, randomColorG, randomColorB, randomColorA);
}

function getRandomBetweenTwoValues(min, max) {
    return Math.random() * (max - min) + min;
}

function addNewCurve() {
    curves.push(new Curve([]));
    allEchosAllCurves.push([]);
}

function newPoint(position, currentCurve) {
    return new Point(position, currentCurve.velocity);
}

function setup(shaders) {
    canvas = document.getElementById("gl-canvas");
    gl = setupWebGL(canvas, { alpha: true });

    // Create WebGL programs
    draw_program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Enable Alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Handle resize events 
    window.addEventListener("resize", (event) => {
        resize(event.target);
    });

    // Get position from mouse on canvas
    function get_pos_from_mouse_event(canvas, event) {
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / canvas.width * 2 - 1;
        const y = -((event.clientY - rect.top) / canvas.height * 2 - 1);

        return vec2(x, y);
    }

    // Create the first curve that we are going to draw
    addNewCurve();

    // If isMouseDown is false, the event "mousemove" must not produce any control points
    let isMouseDown = false;
    let isCurveBeginning = false;
    let isMouseTraced = false;
    // Handle mouse down events
    window.addEventListener("mousedown", (event) => {
        let currentCurve = curves[curves.length-1];
        if (curves[curves.length-1].controlPoints.length == 0) {
            isCurveBeginning = true;
        } else {
            isCurveBeginning = false;
        }
        let position = get_pos_from_mouse_event(canvas, event);
        currentCurve.controlPoints.push(newPoint(position, currentCurve));
        isMouseDown = true;
        currentCurve.isDrawing = true;
    });

    // Handle mouse move events
    window.addEventListener("mousemove", (event) => {
        let currentCurve = curves[curves.length-1];
        if (isMouseDown && isCurveBeginning) {
            let position = get_pos_from_mouse_event(canvas, event);
            let controlPoints = currentCurve.controlPoints;
            let previousPositionX = controlPoints[controlPoints.length-1].position[0];
            let previousPositionY = controlPoints[controlPoints.length-1].position[1];

            let distance = Math.sqrt(
                Math.pow((position[0]-previousPositionX), 2) + 
                Math.pow((position[1]-previousPositionY), 2));

            if (distance > POINTS_DISTANCE_THRESHOLD) {
                currentCurve.controlPoints.push(newPoint(position, currentCurve));
            }
            isMouseTraced = true;
        }
    });

    // Handle mouse up events
    window.addEventListener("mouseup", (event) => {
        if (isMouseDown) {
            isMouseDown = false;
        }
        if (isMouseTraced) {
            isMouseTraced = false;
            if (!pauseAnimations) {
                curves[curves.length-1].isDrawing = false;
            }
            addNewCurve();
        }
    });

    // Handle keyboard events
    window.addEventListener("keydown", event => {
        const keyName = event.key;
        switch (keyName) {
            case 'z':
                // New curve
                if (curves[curves.length-1].controlPoints.length != 0) {
                    if (!pauseAnimations) {
                        curves[curves.length-1].isDrawing = false;
                    }
                    addNewCurve();
                }
                break;
            case '+':
                if (segments < MAX_SEGMENTS) {
                    segments++;
                }
                break;
            case '-':
                if (MIN_SEGMENTS < segments) {
                    segments--;
                }
                break;
            case 'C':
                // Delete curves
                curves = [];
                allEchosAllCurves = [];
                addNewCurve();
                break;
            case 'P':
                // Show/hide segments points
                showSegmentPoints ? (showSegmentPoints = false) : (showSegmentPoints = true);
                if (showSegmentPoints) {
                    document.getElementById("segment_points").innerHTML = "Hide Segment Points";
                } else {
                    document.getElementById("segment_points").innerHTML = "Show Segment Points";
                }
                break;
            case 'L':
                // Show/hide edges between points
                showLines ? (showLines = false) : (showLines = true);
                if (showLines) {
                    document.getElementById("lines").innerHTML = "Hide Lines";
                } else {
                    document.getElementById("lines").innerHTML = "Show Lines";
                }
                break;
            case ' ':
                pauseAnimations ? (pauseAnimations = false) : (pauseAnimations = true);
                if (pauseAnimations) {
                    for (let i = 0; i < curves.length-1; i++) {
                        curves[i].isDrawing = true;
                        allEchosAllCurves[i] = [];
                    }
                    document.getElementById("pause_play").innerHTML = "Play Animation";
                } else {
                    for (let i = 0; i < curves.length-1; i++) {
                        curves[i].isDrawing = false;
                    }
                    document.getElementById("pause_play").innerHTML = "Pause Animation";
                }
                break;
            case '<':
                if (animationsVelocity > 1) {
                    animationsVelocity--;
                }
                break;
            case '>':
                animationsVelocity++;
                break;
            case 'f':
                curvesFunctionsIndex++;
                if (curvesFunctionsIndex > curvesFunctions.length-1) {
                    curvesFunctionsIndex = 0;
                }
                // Change in HTML the curve function that we are currently using
                document.getElementById("curve_function").innerHTML = curvesFunctions[curvesFunctionsIndex];
                break;
            case '1':
                // Echos
                showEchos ? (showEchos = false) : (showEchos = true);
                if(showEchos) {
                    document.getElementById("echos").innerHTML = "Disable Echos";
                } else {
                    for (let i = 0; i < curves.length-1; i++) {
                        allEchosAllCurves[i] = [];
                    }
                    document.getElementById("echos").innerHTML = "Enable Echos";
                }
                break;
            case 't': {
                if (numberEchos > MIN_NUMBER_ECHOS) {
                    numberEchos--;
                }
                break;
            }
            case 'T': {
                numberEchos++;
                break;
            }
            case '2':
                // Gravity
                isGravityOn ? (isGravityOn = false) : (isGravityOn = true);
                if (isGravityOn) {
                    document.getElementById("gravity").innerHTML = "Disable Gravity";
                } else {
                    document.getElementById("gravity").innerHTML = "Enable Gravity";
                }
                break;
            case '3':
                // Black&White
                isBlackWhiteOn ? (isBlackWhiteOn = false) : (isBlackWhiteOn = true);
                if (isBlackWhiteOn) {
                    document.getElementById("black_white").innerHTML = "Disable Black&White";
                } else {
                    document.getElementById("black_white").innerHTML = "Enable Black&White";
                }
                break;
        }
    });

    // Array with indexes to help keep track of which control points affect each curve
    const index = [];
    for (let i = 0; i < 60_000; i++) {
        index.push(i);
    }
    // Create a buffer
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
    // Send indices to buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Uint32Array(index), gl.STATIC_DRAW);

    const a_index = gl.getAttribLocation(draw_program, "a_index");
    gl.vertexAttribIPointer(a_index, 1, gl.UNSIGNED_INT, false, 0, 0);
    gl.enableVertexAttribArray(a_index);

    resize(window);

    gl.clearColor(0.0, 0.0, 0.0, 1);

    // Enable Alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    window.requestAnimationFrame(animate);
}

function colorToGrey(color) {
    let grey = (color[0] + color[1] + color[2]) / 3.0;
    return vec4(grey, grey, grey, color[3]);
}

// Draw curves
function drawCurve(curve, color = curve.color) {
    // Send uniform control points of the curve being drawn to vertex shader
    let controlPoints = curve.controlPoints;
    for (let i = 0; i < controlPoints.length; i++) {
        let u_controlPoints = gl.getUniformLocation(draw_program, "u_controlPoints["+i+"]");
        gl.uniform2fv(u_controlPoints, controlPoints[i].position);
    }

    // Send uniform point size to vertex shader
    let u_pointSize = gl.getUniformLocation(draw_program, "u_pointSize");
    gl.uniform1f(u_pointSize, curve.pointSize);

    if (isBlackWhiteOn) {
        color = colorToGrey(color);
    }
    
    // Send uniform color to fragment shader
    let u_color = gl.getUniformLocation(draw_program, "u_color");
    gl.uniform4fv(u_color, color);

    let numberPointsToDraw = segments * (controlPoints.length-3) + 1;
    if (controlPoints.length > 3) {
        if (curvesFunctions[curvesFunctionsIndex] == BEZIER) {
            // Number of splines that can be drawn with the given control points
            let numberBezierSplines = parseInt((controlPoints.length - 1) / 3);
            if (numberBezierSplines > 0) {
                numberPointsToDraw = numberBezierSplines * segments + 1;
            }
        }
        if (showSegmentPoints) {
            gl.drawArrays(gl.POINTS, 0, numberPointsToDraw);
        }
        if (showLines) {
            gl.drawArrays(gl.LINE_STRIP, 0, numberPointsToDraw);
        }
    }
}

// Draw all echos
function drawEchos(echos) {
    for (let i = 0; i < echos.length; i++) {
        let curve = echos[i];
    
        // Calculate alpha of the echo
        let alpha = curve.color[3] * (1.0 - i * 1.0 / echos.length);
        let color = vec4(curve.color[0], curve.color[1], curve.color[2], alpha);

        drawCurve(curve, color);
    }
}

// Apply velocity to Control Points
function velocity(curve) {
    let controlPoints = curve.controlPoints;
    for (let i = 0; i < controlPoints.length; i++) {
        let point = controlPoints[i];

        let newPositionX = point.position[0] + animationsVelocity * point.velocity[0];
        let newPositionY = point.position[1] + animationsVelocity * point.velocity[1];

        if (newPositionX > 1 || newPositionX < -1) {
            point.velocity[0] *= -1.0;
            point.position[0] += animationsVelocity * point.velocity[0];
        } else {
            point.position[0] = newPositionX;
        }
        if (newPositionY > 1 || newPositionY < -1) {
            point.velocity[1] *= -1.0;
            point.position[1] += animationsVelocity * point.velocity[1];
        } else {
            point.position[1] = newPositionY;
        }
    }
}

// Apply gravity to Control Points
function gravity(curve) {
    let controlPoints = curve.controlPoints;
    for (let i = 0; i < controlPoints.length; i++) {
        let point = controlPoints[i];
        
        let newPosition = point.position[1] + animationsVelocity * (GRAVITY / 1000);
        if (newPosition > -1) {
            point.position[1] = newPosition;
        }
    }
}

let last_time;

function animate(timestamp) {
    window.requestAnimationFrame(animate);

    if (last_time === undefined) {
        last_time = timestamp;
    }
    // Elapsed time (in miliseconds) since last time here
    const elapsed = timestamp - last_time;
    
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(draw_program);

    // Send to vertex shader the curve function that we are going to use to draw
    let u_curveFunctionsIndex = gl.getUniformLocation(draw_program, "u_curveFunctionsIndex");
    gl.uniform1i(u_curveFunctionsIndex, curvesFunctionsIndex);

    // Send to vertex shader the number of segments
    let u_segments = gl.getUniformLocation(draw_program, "u_segments");
    gl.uniform1i(u_segments, segments);

    for (let i = 0; i < curves.length; i++) {
        let curve = curves[i];
        // Variable echos has all the echos of the curve[i]
        let echos = allEchosAllCurves[i];

        if (!curve.isDrawing && isGravityOn) {
            // Gravity
            gravity(curve);
        } else if (!curve.isDrawing) {
            velocity(curve);
        }

        drawCurve(curve);

        // Echos
        if (showEchos && !curve.isDrawing) {
            echos.unshift(JSON.parse(JSON.stringify(curve)));
            echos = echos.slice(0, numberEchos);
            drawEchos(echos);
        }
    }
    
    gl.useProgram(null);

    last_time = timestamp;
}

loadShadersFromURLS(["shader.vert", "shader.frag"]).then(shaders => setup(shaders))