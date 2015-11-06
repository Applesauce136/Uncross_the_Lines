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
var numCircles = 10;

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

    // make the circle
    var circle = draw.circle(diameter)
        .center(x, y)
        .front();

    // give the circle a place to store its friends
    // friends = circles to which it's connected
    circle.friends = [];

    // add the circle to the master list
    circles.add(circle);
    return circle;

}

// move circle
var move = function(circle, dx, dy) {

    // get new coordinates
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

    // if they're not connected...
    if (!connected(c1, c2)) {

        // make the line
        var line =  draw.line(c1.cx(), c1.cy(),
                              c2.cx(), c2.cy())
            .stroke("#555555")
            .after(c1)
            .after(c2);

        // update state variables
        lines[c1 + c2] = line;
        crossed[line] = true;

        // render the line
        drawLine(c1, c2);

        // tell the circles who their friends are
        c1.friends.push(c2);
        c2.friends.push(c1);
    }
}

// disconnect two circles
var disconnect = function (c1, c2) {

    // if they're connected
    if (connected(c1, c2)) {

        // get the line and remove it from the master list
        var line = lines[c1 + c2];
        lines.splice(c1 + c2, 1);
        if (!line) {
            line = lines[c2 + c1];
            lines.splice(c2 + c1, 1);
        }

        // remove the line from our list of crossings
        crossed.splice(line, 1);
        line.plot(0, 0, 0, 0);

        // remove line
        // TODO: make sure lines are removed from memory
        // right now i think .remove() actually just hides them
        line.remove();
        
        // remove friends from circles
        var i1 = c1.friends.indexOf(c2);
        if (i1 >= 0) {
            c1.friends.splice(i1, 1);
        }
        var i2 = c2.friends.indexOf(c1);
        if (i2 >= 0) {
            c2.friends.splice(i2, 1);
        }
    }
}

// check to see if circles are connected
var connected = function (c1, c2) {
    
    // if c2 is c1's friend
    for (var i in c1.friends) {
        if (c1.friends[i] === c2) {
            return true;
        }
    }
    // if c1 is c2's friend
    for (var i in c2.friends) {
        if (c2.friends[i] === c1) {
            return true;
        }
    }
    // the second check might not be necessary,
    // but safe programming is good programming
    // also it's only like ~5 more accesses, at worst
    return false;
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

    // update all the lines
    checkAllLines();
    recolorLines();
}

// check all the lines
// runtime is a little scary!
var checkAllLines = function () {

    // for all our lines
    for (var i in lines) {
        checkLine(lines[i]);
    }
}

// check to see if a line intersects any lines
var checkLine = function (line) {

    crossed[line] = false;
    // for all our lines
    for (var i in lines) {
        var line2 = lines[i]

        if (linesIntersect(line, line2)) {
            crossed[line] = true;
            return true;
        }
    }
    return false;
}

// recolor all the lines properly
// note: relies on crossed[],
// ideally call after checking lines
var recolorLines = function () {

    // for all our lines
    for (var i in lines) {
        // set its stroke to either red or green
        lines[i].stroke( crossed[lines[i]] ? "red" : "green" );
    }
}

// check if two lines intersect
// super huge thanks to:
// http://jeffe.cs.illinois.edu/teaching/373/notes/x06-sweepline.pdf
var linesIntersect = function (l1, l2) {

    // only check if bboxes intersect
    if (bboxIntersect(l1, l2)) {

        // a bunch of accessing and terminology fixing
        var x0, y0, x1, y1, x2, y2, x3, y3;
        
        x0 = l1.array().value[0][0];
        y0 = l1.array().value[0][1];

        x1 = l1.array().value[1][0];
        y1 = l1.array().value[1][1];

        x2 = l2.array().value[0][0];
        y2 = l2.array().value[0][1];

        x3 = l2.array().value[1][0];
        y3 = l2.array().value[1][1];

        // if the lines share points, pretend they don't intersect
        // since they're on the same circle
        return (!samePoint(x0, y0, x2, y2) &&
                !samePoint(x0, y0, x3, y3) &&
                !samePoint(x1, y1, x2, y2) &&
                !samePoint(x1, y1, x3, y3)) &&
            // check the orientations of bunches of points
            // see PDF linked above for details
            // or ask a math person
            (CCW(x0, y0, x2, y2, x3, y3) !==
             CCW(x1, y1, x2, y2, x3, y3) &&
             CCW(x2, y2, x0, y0, x1, y1) !==
             CCW(x3, y3, x0, y0, x1, y1));
    }
    else {
        return false;
    }
}

// check to see if two points are basically the same
var samePoint = function (x0, y0, x1, y1) {
    return (Math.abs(x0 - x1) < diameter / 100 &&
            Math.abs(y0 - y1) < diameter / 100);
}

// check to see if three points are counterclockwise
var CCW = function (x0, y0, x1, y1, x2, y2) {
    return 0 > Math.sign(crossProduct(x1 - x0, y1 - y0,
                                      x2 - x0, y2 - y0));
}

// vectors yay!
var crossProduct = function (x0, y0, x1, y1) {
    return x0 * y1 - x1 * y0;
}

// check if the game is currently solved
var didWeWin = function () {
    success = true;
    // if any line is crossed, we didn't solve it
    for (var i in crossed) {
        if (crossed[i]) {
            success = false;
            break;
        }
    }
    // if we won, make it green
    // if not, it's red
    // remember, rgb
    background.fill( success ? "#eeffee" : "#ffeeee" );
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

    // if it's not already selected
    // surprisingly, svg.js doesn't have this check
    if (!selected(circle)) {
        
        selection.add(circle);
        circle.fill("red").front();

        // make all the circle's friends blue
        // it looks really cool!
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

    // only remove if it's selected
    if (selected(circle)) {

        selection.remove(circle);
        circle.fill("black");

        // uncolor this circle's friends
        // unless they're selected, in which case they stay red
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

    // accumulate selection in separate array
    var subSelection = [];
    selection.each(function (i) {
        subSelection.push(this);
    });

    // remove accumulation
    for (var i in subSelection) {
        remove(subSelection[i]);
    }

    return selection;
    // using .remove inside of .each fucks everything up
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

    // extract values, for corners
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
    return inBoundsX(x) && inBoundsY(y);
}

// check the x of a point
var inBoundsX = function (x) {
    return between(boundary, x, width - boundary);
}

// check the y of a point
var inBoundsY = function (y) {
    return between(boundary, y, height - boundary);
}

// check if a value is between two other values
var between= function (a, b, c) {
    return (a < b && b < c);
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

// INPUT PROCESSING
// ----------------------------------------------------------------

// the input processing triggers for when the game is active
var setGameInput = function () {

    // KEYBOARD PROCESSING THINGS
    // --------------------------------

    // when a key is pressed
    document.onkeydown = function (e) {

        // get the key
        var key = e.which || e.keyCode;

        // is it shift?
        if (key === 16) {
            shift = true;
        }
    }

    // when a key is released
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

    // when the mouse is clicked
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

            // tell state that the circle was just added
            recent = true;
        }

        // in case we're boxing
        boxStartX = cursorX;
        boxStartY = cursorY;

        //debug();
    }

    // while the mouse is held down
    document.onmousemove = function (e) {

        // save old position
        var cursorXprev = cursorX;
        var cursorYprev = cursorY;

        // update cursor position
        cursorX = e.pageX - offsetX;
        cursorY = e.pageY - offsetY;

        // if we're clicking on something...
        if (mouseDown) {
            // if we're on a circle
            if (mouseOn) {

                // tell state we've moved
                moved = true;

                // move all the circles in our selection
                selection.each(function () {
                    move(this,
                         cursorX - cursorXprev,
                         cursorY - cursorYprev);
                });
            }
            // if we're not on a circle...
            else {
                drawBox();
            }
        }

        //debug();
    }

    // when the mouse is released
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
        // if we clicked in space, empty the selection
        else {
            empty();
        }

        didWeWin();

        // update state
        mouseOn = false;
        mouseDown = false;
        moved = false;
        recent = false;
        boxed = false;

        //debug();
    }
}
// ================================
// ================================================================

// POPULATION ALGORITHMS
// ----------------------------------------------------------------

// Border
// creates a border
// SOLVABLE
// --------------------------------
var popBorder = function () {
    for (var i = 0; i < numCircles; i += 1) {

        var c1 = circles.get((i  ) % numCircles);
        var c2 = circles.get((i+1) % numCircles);

        connect(c1, c2);
    }
}
// ================================

// Max Edges
// creates edges randomly up to a cap
// NOT SOLVABLE
// --------------------------------
var popMaxEdges = function () {
    var cap = 3 * (numCircles - 2)
    var added;
    for (var edges = 0; edges < cap; added ? edges++ : edges) {

        added = false;

        var c1 = circles.get(Math.floor(makeRandom(0, numCircles)));
        var c2 = circles.get(Math.floor(makeRandom(0, numCircles)));

        if (c1 !== c2 &&
            !connected(c1, c2)) {

            connect(c1, c2);
            added = true;
        }
    }
}
// ================================

// Border of Triangles
// --------------------------------
// Border of Triangles
// creates a border, as well as a triangle every two nodes
// SOLVABLE
var popBorderOfTriangles = function () {
    popBorderOfTrianglesHelper(circles);
}

// Border of Triangles Iterated
// creates a border, as well as a triangle every two nodes,
// and another layer of triangles
// SOLVABLE
var popBorderOfTrianglesIterated = function () {
    popBorderOfTrianglesHelper(popBorderOfTrianglesHelper(circles));
}

// Border of Triangles Iterated
// creates a border, as well as a triangle every two nodes,
// and as many layers of triangles as will fit
// SOLVABLE
var popBorderOfTrianglesMax = function () {
    popBorderOfTrianglesMaxHelper(circles);
}

// Helper Functions
var popBorderOfTrianglesMaxHelper = function (raw_circles) {
    var newCircles = popBorderOfTrianglesHelper(raw_circles);
    if (newCircles.length() >= 3) {
        popBorderOfTrianglesMaxHelper(newCircles);
    }
}

var popBorderOfTrianglesHelper = function (raw_circles) {

    var innerCircles = draw.set();
    var iters = raw_circles.length() - (raw_circles.length() % 2);
    for (var i = 0; i < iters; i += 2) {

        var c1 = raw_circles.get((i  ) % raw_circles.length());
        var c2 = raw_circles.get((i+1) % raw_circles.length());
        var c3 = raw_circles.get((i+2) % raw_circles.length());

        connect(c1, c2);
        connect(c2, c3);
        connect(c1, c3);

        innerCircles.add(c2);
    }
    return innerCircles;
}
// ================================

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

popBorderOfTrianglesMax();
setGameInput();
// ================================================================
// max edges in a graph = n(n-1)/2
// max edges with solution = 3+3(n-3) (n >= 3)
// = 3(1+n-3)
// = 3(n-2)
// = 2n?

