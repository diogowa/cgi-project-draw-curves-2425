#version 300 es

#define MAX_CONTROL_POINTS 256

in uint a_index;

uniform int u_segments;
uniform vec2 u_controlPoints[MAX_CONTROL_POINTS];
uniform float u_pointSize;
uniform int u_curveFunctionsIndex;

// Calculates a cubic b-spline
// Returns a vec2
vec2 cubicBSpline(int firstIndexControlPoint, float t) {
    float c0 = (1.0 / 6.0) * (-pow(t, 3.0) + 3.0*pow(t, 2.0) - 3.0*t + 1.0);
    float c1 = (1.0 / 6.0) * (3.0*pow(t, 3.0) - 6.0*pow(t, 2.0) + 4.0);
    float c2 = (1.0 / 6.0) * (-3.0*pow(t, 3.0) + 3.0*pow(t, 2.0) + 3.0*t + 1.0);
    float c3 = (1.0 / 6.0) * pow(t, 3.0);
    vec2 point = vec2(0.0, 0.0);
    point.x = c0 * u_controlPoints[firstIndexControlPoint].x +
                c1 * u_controlPoints[firstIndexControlPoint + 1].x +
                c2 * u_controlPoints[firstIndexControlPoint + 2].x +
                c3 * u_controlPoints[firstIndexControlPoint + 3].x;
    point.y = c0 * u_controlPoints[firstIndexControlPoint].y +
                c1 * u_controlPoints[firstIndexControlPoint + 1].y +
                c2 * u_controlPoints[firstIndexControlPoint + 2].y +
                c3 * u_controlPoints[firstIndexControlPoint + 3].y;
    return point;
}

// Calculates a cubic catmull-rom
// Returns a vec2
vec2 cubicCatmullRom(int firstIndexControlPoint, float t) {
    float c0 = (1.0 / 2.0) * (-pow(t, 3.0) + 2.0*pow(t, 2.0) - t);
    float c1 = (1.0 / 2.0) * (3.0*pow(t, 3.0) - 5.0*pow(t, 2.0) + 2.0);
    float c2 = (1.0 / 2.0) * (-3.0*pow(t, 3.0) + 4.0*pow(t, 2.0) + t);
    float c3 = (1.0 / 2.0) * (pow(t, 3.0) - pow(t, 2.0));
    vec2 point = vec2(0.0, 0.0);
    point.x = c0 * u_controlPoints[firstIndexControlPoint].x +
                c1 * u_controlPoints[firstIndexControlPoint + 1].x +
                c2 * u_controlPoints[firstIndexControlPoint + 2].x +
                c3 * u_controlPoints[firstIndexControlPoint + 3].x;
    point.y = c0 * u_controlPoints[firstIndexControlPoint].y +
                c1 * u_controlPoints[firstIndexControlPoint + 1].y +
                c2 * u_controlPoints[firstIndexControlPoint + 2].y +
                c3 * u_controlPoints[firstIndexControlPoint + 3].y;
    return point;
}

// Calculates a cubic bezier
// Returns a vec2
vec2 cubicBezier(int firstIndexControlPoint, float t) {
    float c0 = -pow(t, 3.0) + 3.0*pow(t, 2.0) - 3.0*t + 1.0;
    float c1 = 3.0*pow(t, 3.0) - 6.0*pow(t, 2.0) + 3.0*t;
    float c2 = -3.0*pow(t, 3.0) + 3.0*pow(t, 2.0);
    float c3 = pow(t, 3.0);
    vec2 point = vec2(0.0, 0.0);
    point.x = c0 * u_controlPoints[firstIndexControlPoint].x +
                c1 * u_controlPoints[firstIndexControlPoint + 1].x +
                c2 * u_controlPoints[firstIndexControlPoint + 2].x +
                c3 * u_controlPoints[firstIndexControlPoint + 3].x;
    point.y = c0 * u_controlPoints[firstIndexControlPoint].y +
                c1 * u_controlPoints[firstIndexControlPoint + 1].y +
                c2 * u_controlPoints[firstIndexControlPoint + 2].y +
                c3 * u_controlPoints[firstIndexControlPoint + 3].y;
    return point;
}

void main() {
    // The .xx of this float gives us the t in the curve and
    // the x. of this float gives us the first index of our control point
    float number = float(a_index) / float(u_segments);

    int indexControlPoint = int(number);
    float t = number - float(indexControlPoint);

    vec2 point;
    if (int(u_curveFunctionsIndex) == 0) {
        point = cubicBSpline(indexControlPoint, t);
    } else if (int(u_curveFunctionsIndex) == 1) {
        point = cubicCatmullRom(indexControlPoint, t);
    } else if (int(u_curveFunctionsIndex) == 2) {
        // Cubic bezier goes: 
        // - 1 part curve P0, P1, P2, P3;
        // - 2 part curve P3, P4, P5, P6;
        indexControlPoint = 3 * indexControlPoint;
        point = cubicBezier(indexControlPoint, t);
    }

    gl_Position = vec4(point.x, point.y, 0.0f, 1.0f);

    gl_PointSize = u_pointSize;
}