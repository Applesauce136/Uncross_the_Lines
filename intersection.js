"use strict";

// super huge thanks to:
// http://jeffe.cs.illinois.edu/teaching/373/notes/x06-sweepline.pdf

var crossProduct = function (x0, y0, x1, y1) {
    return x0 * y1 - x1 * y0;
}

var CCW = function (x0, y0, x1, y1, x2, y2) {
    return Math.sign(crossProduct(x1 - x0, y1 - y0,
                                  x2 - x0, y2 - y0));
}

var linesIntersect = function (x0, y0, x1, y1, x2, y2, x3, y3) {

    return (CCW(x0, y0, x2, y2, x3, y3) !==
            CCW(x1, y1, x2, y2, x3, y3) &&
            CCW(x2, y2, x0, y0, x1, y1) !==
            CCW(x3, y3, x0, y0, x1, y1));
}
