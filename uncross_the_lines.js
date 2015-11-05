"use strict";

// INIT STUFF

//this is my div
var canvas = document.getElementById("drawing");

//make the SVG!
var width = 300, height = 300;
var draw = SVG("drawing").size(width, height);

// this is the background
draw.rect(width, height).fill("#eeeeee").back();

// CURSOR THINGS

// offset of SVG canvas, for mouse purposes
var border = canvas.getBoundingClientRect();
var offsetX = border.left;
var offsetY = border.top;

// these have the cursor position
var cursorX;
var cursorY;

// this is for box selection
var mouseDown;

// all the circles
var circles = draw.set();

// the currently selected circles
var selection = draw.set();

// are we on a circle?
var onCircle = false;

// is shift being held?
var shift = false;



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

document.onmousedown = function (e) {
    
    mouseDown = true;

    onCircle = false;
    // check if circle is selected
    circles.each(function (i) {
        if (this.inside(cursorX, cursorY)) {
            onCircle = true;
            if (!selection.has(this)) {
                selection.add(this);
                this.fill("red");
            }            
        }
    });

    // empty selection
    if (!shift && !onCircle) {
        selection.each(function (i) {
            this.fill("black");
        });
        selection.clear();
    }
}

document.onmousemove = function (e) {

    // save old position
    var cursorXprev = cursorX;
    var cursorYprev = cursorY;
    
    // update cursor position
    cursorX = e.pageX - offsetX;
    cursorY = e.pageY - offsetY;

    // move selection
    if (mouseDown && onCircle) {
        
        // for each selected circle...
        selection.each(function (i) {
            /* MEH
            // if the mouse is on it, move with cursor
            if (mouseOn.has(this)) {
            this.move(cursorX, cursorY);
            }

            // otherwise, move akin to cursor
            else {
            MEH */
            this.dmove(cursorX - cursorXprev,
                       cursorY - cursorYprev);
            /* MEH } MEH */
        });
    }
}

document.onmouseup = function (e) {

    mouseDown = false;

}

// POPULATE SPACE
var numCircles = 10;
for (var i = 0; i < numCircles; i++) {
    
    // radius
    var circle = draw.circle(10)
    
    // random position
        .move(width * Math.random(),
              height * Math.random());

    circles.add(circle);
}
