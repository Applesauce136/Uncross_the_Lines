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
        circle.fill("red");
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

// random number between min and max
var makeRandom = function (min, max) {
    return min + (max - min) * Math.random();
}

var debug = function() {
//     console.clear();
    console.log("cursorX:   " + cursorX + "\n" +
                "cursorY:   " + cursorY + "\n" +
                "shift:     " + shift + "\n" +
                "mouseDown: " + mouseDown + "\n" +
                "moved:     " + moved + "\n" +
                "recent:    " + recent + "\n" +
                "mouseOn:   " + mouseOn + "\n" +
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

}

document.onmousemove = function (e) {

    // save old position
    var cursorXprev = cursorX;
    var cursorYprev = cursorY;

    // update cursor position
    cursorX = e.pageX - offsetX;
    cursorY = e.pageY - offsetY;

    // move selection
    if (!shift && mouseDown && mouseOn) {

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
}

document.onmouseup = function (e) {


    if (mouseOn) {
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
