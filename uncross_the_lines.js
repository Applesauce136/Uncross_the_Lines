"use strict";

// VALUES
// ----------------------------------------------------------------

// CONSTANTS
// --------------------------------

// my div
var canvas = document.getElementById("drawing");

// the SVG object
var width = 300;
var height = 300;
var draw = SVG("drawing").size(width, height);

// number of circles
var numCircles = 10;

// radius of circles
var radius = 30;

// offset of SVG canvas, for mouse purposes
var border = canvas.getBoundingClientRect();
var offsetX = border.left;
var offsetY = border.top;

// all the circles
var circles = draw.set();

// the currently selected circles
var selection = draw.set();

// box selection
var box;
var boxStartX;
var boxStartY;

// ================================

// STATE VARIABLES
// --------------------------------

// the cursor positions
var cursorX;
var cursorY;

// is the mouse held down?
var mouseDown = false;

// is shift held down?
var shift = false;

// are we on a circle?
var mouseOn = false;

// have we moved since clicking?
var moved = false;

// ================================
// ================================================================

// HELPER FUNCTIONS
// ----------------------------------------------------------------

// make a circle, and add it to the set of all circles
var makeCircle = function(x, y) {
    var circle = draw.circle(radius)
        .move(x, y);
    circles.add(circle);
    return circle;
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
var moveCircle = function(circle, dx, dy) {
    return circle.dmove(dx, dy);
}

// clear the selection
var empty = function () {
    selection.each(function (i) {
        this.fill("black");
    });
    return selection.clear();
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
    makeCircle(makeRandom(20, width - 20),
               makeRandom(20, height - 20));
}

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
    
    if (mouseOn) {
        add(mouseOn);
    }

    boxStartX = cursorX;
    boxStartY = cursorY;

}

document.onmousemove = function (e) {

    // delete the old box
    if (box) {
        box.remove();
    }

    // save old position
    var cursorXprev = cursorX;
    var cursorYprev = cursorY;

    // update cursor position
    cursorX = e.pageX - offsetX;
    cursorY = e.pageY - offsetY;

    if (mouseDown) {
        if (!shift && mouseOn) {

            moved = true;
            
            if (!selected(mouseOn)) {
                empty();
                add(mouseOn);
            }

            // for each selected circle...
            selection.each(function (i) {
                moveCircle(this,
                           cursorX - cursorXprev,
                           cursorY - cursorYprev);
            });
        }
        else if (!mouseOn &&
                Math.abs(boxStartX - cursorX) > radius / 4 &&
                 Math.abs(boxStartY - cursorY) > radius / 4
                ) {
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
        }
    }
}

document.onmouseup = function (e) {

    if (box) {
        if (!shift && !moved) {
            empty();
        }
        circles.each(function (i) {
            if (intersect(this, box)) {
                add(this);
            }
        });
        box.remove();
    }
    else if (mouseOn) {
        console.log(moved);
        if (!shift && !moved) {
            empty();
        }
        if (shift && selected(mouseOn) && !moved) {
            remove(mouseOn);
        }
        else {
            add(mouseOn);
        }
    }
    else if (!shift) {
        empty();
    }

    mouseOn = false;
    mouseDown = false;
    moved = false;

}
// ================================
// ================================================================
