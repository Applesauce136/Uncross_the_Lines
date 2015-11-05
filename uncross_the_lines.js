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
var box;
var boxStartX;
var boxStartY;
var mouseDown;

// the currently selected circles
var selection = draw.set();



document.onmousedown = function (e) {
    
    mouseDown = true;

    //empty selection
    selection.each(function (i) {
        this.fill("black");
    });
    selection.clear();

    boxStartX = cursorX;
    boxStartY = cursorY;
}

document.onmousemove = function (e) {

    // delete the old box
    if (box) {
        box.remove();
    }

    // update cursor position
    cursorX = e.pageX - offsetX;
    cursorY = e.pageY - offsetY;

    // draw box!
    if (mouseDown) {
        
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
    };
}

document.onmouseup = function (e) {
    //TODO: add circles to selection
    mouseDown = false;
}

// POPULATE SPACE
var numCircles = 10;
for (var i = 0; i < numCircles; i++) {
    // radius
    draw.circle(10)
    // random position
        .move(width * Math.random(),
              height * Math.random())
    // if clicked, add to selection
        .click(function () {
            selection.add(this);
            this.fill("red");
        });
}
