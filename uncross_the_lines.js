"use strict";

// VALUES
// ----------------------------------------------------------------

// CONSTANTS
// --------------------------------

// window boundaries
// thanks to http://stackoverflow.com/questions/3437786/get-the-size-of-the-screen-current-web-page-and-browser-window
var w = window;
var d = document;
var e = d.documentElement;
var g = d.getElementsByTagName('body')[0];

// the minimum distance between a circle's starting position
// and the boundary of the screen
var boundary = 20;

// dimensions
var width = Math.min(w.innerWidth, e.clientWidth, g.clientWidth) - boundary * 3;
var height = Math.min(w.innerHeight, e.clientHeight, g.clientHeight) - boundary * 3;
console.log("width:  " + width + "\n" +
            "height: " + height + "\n" +
           "");

// number of circles
var numCircles = 30;

// diameter of circles
var diameter = 20;

// the probability that any two circles will be connected
var threshold = .3;

// my div
var canvas = document.getElementById("drawing");

// the SVG object
var draw = SVG("drawing").size(width, height);

// offset of SVG canvas, for mouse purposes
var border = canvas.getBoundingClientRect();
var offsetX = border.left;
var offsetY = border.top;

// all the circles
var circles = draw.set();

// all the circle pairs
// each element is a draw.set() containing two circles and a line
// var circleSet = [];

// ================================

// STATE VARIABLES
// --------------------------------

// the cursor positions
var cursorX;
var cursorY;

// the currently selected circles
var selection = draw.set();

// box selection
var box;
var boxStartX;
var boxStartY;

// is the mouse held down?
var mouseDown = false;

// is shift held down?
var shift = false;

// are we on a circle?
var mouseOn = false;

// have we moved since clicking?
var moved = false;

// was the last addition recent?
// (that is, on the last mousedown?)
var recent = false;

// was the last mousedown a box?
var boxed = false;

// ================================
// ================================================================

// HELPER FUNCTIONS
// ----------------------------------------------------------------

// make a circle, and add it to the set of all circles
var makeCircle = function(x, y) {
    var circle = draw.circle(diameter)
        .center(x, y)
        .front();

    circle.sets = [];

    circles.add(circle);
    return circle;

}

// connect two circles
var connect = function (c1, c2) {
    
    var circlePair = draw.set()
        .add(c1)
        .add(c2)
        .add(draw.line(0, 0, 0, 0)
             .stroke("#555555")
             .after(c1)
             .after(c2));
    drawLine(circlePair);

    // circleSet.push(circlePair);
    c1.sets.push(circlePair);
    c2.sets.push(circlePair);

}

// update circle under mouse
var updateMouseOn = function () {
    mouseOn = false;
    circles.each(function (i) {
        if (this.inside(cursorX, cursorY)) {
            mouseOn = this;
        }
    });
    return mouseOn;
}

var selected = function(circle) {
    return selection.has(circle);
}

// add circle to selection
var add = function(circle) {
    if (!selected(circle)) {
        selection.add(circle);
        circle.fill("red").front();
        return true;
    }
    return false;
}

// remove circle from selection
var remove = function(circle) {
    if (selected(circle)) {
        selection.remove(circle);
        circle.fill("black");
        return true;
    }
    return false;
}

// move circle (relative to circle itself)
var move = function(circle, dx, dy) {
    var nx = circle.cx() + dx;
    var ny = circle.cy() + dy;
    if (boundary < nx && nx < width - boundary &&
        boundary < ny && ny < height - boundary) {
        circle.center(nx, ny);
    }
    for (var i = 0; i < circle.sets.length; i++) {
        drawLine(circle.sets[i]);
    }
    return circle;
}

// clear the selection
var empty = function () {
    selection.each(function (i) {
        this.fill("black");
    });
    return selection.clear();
}

var drawBox = function () {
    if (Math.abs(boxStartX - cursorX) > diameter / 4 ||
        Math.abs(boxStartY - cursorY) > diameter / 4) {
        if (box !== undefined) {
            box.remove();
        }
        // draw box
        box = draw
        // box size
            .rect(Math.abs(boxStartX - cursorX),
                  Math.abs(boxStartY - cursorY))
        // box position
            .move(Math.min(boxStartX, cursorX),
                  Math.min(boxStartY, cursorY))
        // SC2 style baby
            .fill("green")
            .opacity(.3);
        boxed = true;
    }
}

var drawLine = function(circlePair) {
    var c1 = circlePair.get(0);
    var c2 = circlePair.get(1);
    var line = circlePair.get(2);
    
    line.plot(c1.cx(), c1.cy(),
              c2.cx(), c2.cy());
}

var intersect = function (shape1, shape2) {
    var b1 = shape1.bbox();
    var b2 = shape2.bbox();
    
    return (shape1.inside(b2.x , b2.y) ||
            shape1.inside(b2.x , b2.y2) ||
            shape1.inside(b2.x2, b2.y) ||
            shape1.inside(b2.x2, b2.y2) ||

            shape2.inside(b1.x , b1.y) ||
            shape2.inside(b1.x , b1.y2) ||
            shape2.inside(b1.x2, b1.y) ||
            shape2.inside(b1.x2, b1.y2)
    );
}

// random number between min and max
var makeRandom = function (min, max) {
    return min + (max - min) * Math.random();
}

var debug = function() {
    console.log("cursorX:   " + cursorX + "\n" +
                "cursorY:   " + cursorY + "\n" +
                "shift:     " + shift + "\n" +
                "mouseDown: " + mouseDown + "\n" +
                "moved:     " + moved + "\n" +
                "recent:    " + recent + "\n" +
                "mouseOn:   " + mouseOn + "\n" +
                "box:       " + box + "\n" +
                "");
}

// ================================================================

// INIT STUFF
// ----------------------------------------------------------------

// populate space
for (var i = 0; i < numCircles; i++) {
    makeCircle(makeRandom(boundary, width - boundary),
               makeRandom(boundary, height - boundary));
}

// create pairs
for (var i = 0; i < circles.index(circles.last()); i++) {

    var c1 = circles.get(i);
    var c2 = circles.get(i + 1);

    connect(c1, c2);
}
connect(circles.first(), circles.last());

// draw background
draw.rect(width, height).fill("#eeeeee").back();

// ================================================================

// INPUT PROCESSING
// ----------------------------------------------------------------

// IS SHIFT HELD DOWN?
// --------------------------------
document.onkeydown = function (e) {

    // get the key
    var key = e.which || e.keyCode;

    // is it shift?
    if (key === 16) {
        shift = true;
    }
}

document.onkeyup = function (e) {

    // get the key
    var key = e.which || e.keyCode;

    //is it shift?
    if (key === 16) {
        shift = false;
    }
}
// ================================

// MOUSE PROCESSING THINGS
// --------------------------------

document.onmousedown = function (e) {

    mouseDown = true;
    updateMouseOn();
    
    if (mouseOn && !selected(mouseOn)) {
        if (!shift) {
            empty();
        };
        add(mouseOn);
        recent = true;
    }

    boxStartX = cursorX;
    boxStartY = cursorY;

    //debug();
}

document.onmousemove = function (e) {

    // save old position
    var cursorXprev = cursorX;
    var cursorYprev = cursorY;

    // update cursor position
    cursorX = e.pageX - offsetX;
    cursorY = e.pageY - offsetY;

    if (mouseDown) {
        if (!shift && mouseOn) {

            moved = true;

            // for each selected circle...
            selection.each(function () {
                move(this,
                     cursorX - cursorXprev,
                     cursorY - cursorYprev);
            });
        }
        else if (!mouseOn) {
            drawBox();
        }
    }

    //debug();
}

document.onmouseup = function (e) {

    if (boxed) {
        if (!shift && !moved) {
            empty();
        }
        circles.each(function () {
            if (intersect(this, box)) {
                add(this);
            }
        });
        box.remove();
    }
    else if (mouseOn) {
        if (!shift && !moved && selection.index(selection.last()) >= 0) {
            empty();
        }

        if (shift && selected(mouseOn) && !moved && !recent) {
            remove(mouseOn);
        }
        else {
            add(mouseOn);
        }
    }
    else {
        empty();
    }

    mouseOn = false;
    mouseDown = false;
    moved = false;
    recent = false;
    boxed = false;

    //debug();
}
// ================================
// ================================================================
