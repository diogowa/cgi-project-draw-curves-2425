#version 300 es

precision mediump float;

out vec4 frag_color;

uniform vec4 u_color;

void main() {
    /*
    gl_PointCoord gives us the points between (0, 0) and (1, 1), so the middle will be at (0.5, 0.5)
    If we want to discard the points outside a circle and the circle is between (0, 0) and (1, 1), its radius will be 0.5
    */
    float distance = sqrt(pow(gl_PointCoord.x - 0.5, 2.0) + pow(gl_PointCoord.y - 0.5, 2.0));
    if (distance > 0.5) {
        discard;
    }

    frag_color = vec4(u_color);
}