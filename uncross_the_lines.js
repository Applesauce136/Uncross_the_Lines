"use strict";

// VALUES
// ----------------------------------------------------------------

// CONSTANTS
// --------------------------------

// the minimum distance between a circle's starting position
// and the boundary of the screen
var boundary = 20;

// window boundaries
// thanks to:
// http://stackoverflow.com/questions/3437786/get-the-size-of-the-screen-current-web-page-and-browser-window
var w = window;
var d = document;
var e = d.documentElement;
var g = d.getElementsByTagName('body')[0];

// dimensions
var width = Math.min(w.innerWidth,
                     e.clientWidth,
                     g.clientWidth) - boundary * 3;
var height = Math.min(w.innerHeight,
                      e.clientHeight,
                      g.clientHeight) - boundary * 3;

// will contain the background box
var background;

// number of circles
var numCircles = 15;

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

// all the lines
var lines = [];

// whether each line is crossing something
var crossed = [];

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

// is shift held down?
var shift = false;

// is the mouse held down?
var mouseDown = false;

// are we on a circle?
var mouseOn = false;

// have we moved since clicking?
var moved = false;

// was the last addition recent?
// (that is, on the last mousedown?)
var recent = false;

// was the last mousedown a box?
var boxed = false;

// did we win?
var success = false;

// ================================
// ================================================================

// HELPER FUNCTIONS
// ----------------------------------------------------------------

// ALL ABOUT CIRCLES
// --------------------------------

// make a circle, and add it to the set of all circles
var makeCircle = function(x, y) {
    var circle = draw.circle(diameter)
        .center(x, y)
        .front();

    // the circles attached to this one
    circle.friends = [];

    circles.add(circle);
    return circle;

}

// move circle (relative to circle itself)
var move = function(circle, dx, dy) {

    var nx = circle.cx() + dx;
    var ny = circle.cy() + dy;

    // make sure the new coordinates are in bounds
    if (inBounds(nx, ny)) {
        circle.center(nx, ny).front();
    }

    // update the circle's neighbors
    for (var i in circle.friends) {
        var friend = circle.friends[i];
        drawLine(circle, friend);
    }

    return circle;
}

// ================================

// ALL ABOUT LINES
// --------------------------------

// connect two circles
var connect = function (c1, c2) {

    var line =  draw.line(c1.cx(), c1.cy(),
                          c2.cx(), c2.cy())
        .stroke("#555555")
        .after(c1)
        .after(c2);
    lines[c1 + c2] = line;
    crossed[line] = true;

    // render the line
    drawLine(c1, c2);

    // tell the circles who their friends are
    c1.friends.push(c2);
    c2.friends.push(c1);

}

// draw line between two circles
var drawLine = function(c1, c2) {

    // get the line
    var line = lines[c1 + c2];
    if (!line) {
        line = lines[c2 + c1];
    }

    // update its coordinates
    line.plot(c1.cx(), c1.cy(),
              c2.cx(), c2.cy());

    for (var i in lines) {

        var line1 = lines[i];
        crossed[line1] = false;

        for (var j in lines) {

            var line2 = lines[j]

            if (linesIntersect(line1, line2)) {
                crossed[line1] = true;
                break;
            }
        }
    }

    for (var i in lines) {
        lines[i].stroke( crossed[lines[i]] ? "red" : "green" );
    }
}

// check if lines intersect
// super huge thanks to:
// http://jeffe.cs.illinois.edu/teaching/373/notes/x06-sweepline.pdf
var linesIntersect = function (l1, l2) {

    var x0, y0, x1, y1, x2, y2, x3, y3;
    
    x0 = l1.array().value[0][0];
    y0 = l1.array().value[0][1];

    x1 = l1.array().value[1][0];
    y1 = l1.array().value[1][1];

    x2 = l2.array().value[0][0];
    y2 = l2.array().value[0][1];

    x3 = l2.array().value[1][0];
    y3 = l2.array().value[1][1];

    var samePoint = function (x0, y0, x1, y1) {
        return (Math.abs(x0 - x1) < diameter / 1000 &&
                Math.abs(y0 - y1) < diameter / 1000);
    }

    // share endpoint test
    return (!samePoint(x0, y0, x2, y2) &&
            !samePoint(x0, y0, x3, y3) &&
            !samePoint(x1, y1, x2, y2) &&
            !samePoint(x1, y1, x3, y3)) &&
        // counterclockwise test
        (CCW(x0, y0, x2, y2, x3, y3) !==
         CCW(x1, y1, x2, y2, x3, y3) &&
         CCW(x2, y2, x0, y0, x1, y1) !==
         CCW(x3, y3, x0, y0, x1, y1));
    
}

var CCW = function (x0, y0, x1, y1, x2, y2) {
    return 0 > Math.sign(crossProduct(x1 - x0, y1 - y0,
                                      x2 - x0, y2 - y0));
}

var crossProduct = function (x0, y0, x1, y1) {
    return x0 * y1 - x1 * y0;
}

// ================================

// ALL ABOUT SELECTION
// --------------------------------

// if the circle is in our selection
var selected = function(circle) {
    return selection.has(circle);
}

// add circle to selection
var add = function(circle) {
    if (!selected(circle)) {
        
        selection.add(circle);
        circle.fill("red").front();

        for (var i in circle.friends) {
            var friend = circle.friends[i];
            if (!selected(friend)) {
                friend.fill("blue");
            }
        }
        return true;
    }
    return false;
}

// remove circle from selection
var remove = function(circle) {
    if (selected(circle)) {

        selection.remove(circle);
        circle.fill("black");

        for (var i in circle.friends) {
            var friend = circle.friends[i];
            if (!selected(friend)) {
                friend.fill("black");
            }
        }
        
        return true;
    }
    return false;
}

// clear the selection
var empty = function () {
    selection.each(function (i) {
        remove(this);
    });
    return selection.clear();
}

// update circle under mouse
var updateMouseOn = function () {
    mouseOn = false;

    // iterate through circles to see if any are clicked on
    circles.each(function (i) {
        if (this.inside(cursorX, cursorY)) {
            mouseOn = this;
            return mouseOn;
        }
    });
    return mouseOn;
}

// draw a box based on the current mouse state
var drawBox = function () {

    // if the box is big enough... 
    if (Math.abs(boxStartX - cursorX) > diameter / 4 ||
        Math.abs(boxStartY - cursorY) > diameter / 4) {
        // remove the old box
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
            .opacity(.3)
            .front();
        boxed = true;
    }
}

var bboxIntersect = function (shape1, shape2) {

    // extract values
    var b1 = shape1.bbox();
    var b2 = shape2.bbox();
    
    // check each corner
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

// ================================

// ALL ABOUT NUMBERS
// --------------------------------

// check if a point is in our boundary
var inBounds = function (x, y) {
    return (boundary < x && x < width - boundary &&
            boundary < y && y < height - boundary)
}

// random number between min and max
var makeRandom = function (min, max) {
    return min + (max - min) * Math.random();
}

// ================================

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

// draw background
background = draw.rect(width, height).fill("#ffeeee").back();

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

    // update state
    mouseDown = true;
    updateMouseOn();
    
    // if we're clicking on something new
    if (mouseOn && !selected(mouseOn)) {

        // clear and add, or shift-add
        if (!shift) {
            empty();
        };
        add(mouseOn);

        // for this loop, we've added the circle
        recent = true;
    }

    // in case we're boxing
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

    // if we're clicking on something...
    if (mouseDown) {
        // moving condition
        if (mouseOn) {

            moved = true;

            // for each selected circle...
            selection.each(function () {
                move(this,
                     cursorX - cursorXprev,
                     cursorY - cursorYprev);
            });
        }
        // if we're not mousing over anything...
        else {
            drawBox();
        }
    }

    //debug();
}

document.onmouseup = function (e) {

    // if we made a box...
    if (boxed) {
        // clear selection if we're not adding to it
        if (!shift && !moved) {
            empty();
        }
        // add boxed circles to selection
        circles.each(function () {
            if (bboxIntersect(this, box)) {
                add(this);
            }
        });
        box.remove();
    }
    // if we clicked on something...
    else if (mouseOn) {
        // if we didn't move and we're not shift-adding, clear the selection
        if (!shift && !moved) {
            empty();
        }
        // if we're shift-clicking something selected, remove it
        if (shift && selected(mouseOn) && !moved && !recent) {
            remove(mouseOn);
        }
        // otherwise, add the thing we clicked on
        else {
            add(mouseOn);
        }
    }
    // if not, we can clear the selection
    else {
        empty();
    }

    success = true;
    for (var i in crossed) {
        if (crossed[i]) {
            success = false;
            break;
        }
    }
    background.fill( success ? "#eeffee" : "#ffeeee" );

    // update state
    mouseOn = false;
    mouseDown = false;
    moved = false;
    recent = false;
    boxed = false;

    //debug();
}
// ================================
// ================================================================
