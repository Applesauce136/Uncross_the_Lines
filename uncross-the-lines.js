"use strict";

Array.prototype.myRemove = function (item) {
    var index = this.index(item);
    if (index > -1) {
        this.splice(index, 1);
    }
}

// VALUES

var debugging = false;

// ----------------------------------------------------------------
// NUMERICS
// --------------------------------

// the minimum distance between a circle's starting position
// and the boundary of the screen
var buffer = 20;

// dimensions of window
var width;
var height;

// number of circles
var numCircles = 20;

// diameter of circles
var diameter = 40;

// ================================

// SVG GENERAL
// --------------------------------
// my div

// input places
// var typeField;
var nodesField;
var button;

var canvas;

// the SVG object
var draw;

// offset of SVG canvas, for mouse purposes
var border;
var offsetX;
var offsetY;
// ================================

// SVG MINE
// --------------------------------
// all the circles
var circles;

// all the lines
var lines;

// the current selection
var selection;

// the background box
var bg;

// box selection
var box;
// ================================

// STATE VARIABLES
// --------------------------------

// a table of all the lines and whether they're crossed
var crosses;

// the type of population algorithm we're using
var type = "borderOfTrianglesIterated";

// the cursor position
var cursorX = 0;
var cursorY = 0;

// the distance traveled recently
var traveled = 0;

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

var makeWindow = function () {

    // window boundaries
    // thanks to:
    // http://stackoverflow.com/questions/3437786/get-the-size-of-the-screen-current-web-page-and-browser-window
    var w = window;
    var d = document;
    var e = d.documentElement;
    var g = d.getElementsByTagName('body')[0];

    width = Math.min(w.innerWidth,
                     e.clientWidth,
                     g.clientWidth) - buffer * 3;
    height = Math.min(w.innerHeight,
                      e.clientHeight,
                      g.clientHeight) - buffer * 3;

    if (draw !== undefined) {
        draw.remove();
    }

    canvas = document.getElementById("drawing");
    draw = SVG(canvas).size(width, height);

    border = canvas.getBoundingClientRect();
    offsetX = border.left;
    offsetY = border.top;
}

// FUNCTIONS
// ----------------------------------------------------------------

// CREATORS
// --------------------------------
var makeCircle = function (x, y) {
    return circles
        .circle(diameter)
        .fill("black")
        .center(x, y)
        .data("friends", [])
        .data("lines", [])
        .data("selected", false)

        .on("select", function (e) {
            this.data("selected", true);
            this.fire("recolor");
            this.data("friends").forEach(function (id) {
                SVG.get(id).fire("recolor");
            });
        })

        .on("deselect", function (e) {
            this.data("selected", false);
            this.fire("recolor");
            this.data("friends").forEach(function (id) {
                SVG.get(id).fire("recolor");
            });
        })
    
        .on("recolor", function (e) {
            if (this.data("selected")) {
                this.fill("red");
            }
            else if (this.data("friends")
                     .reduce(function(a, b) {
                         return a ||
                             SVG.get(b).data("selected");
                     },
                             false)) {
                this.fill("blue");
            }
            else {
                this.fill("black");
            }
        })

        .on("move", function (e) {
            this.data("lines").forEach(function (id) {
                SVG.get(id).fire("move");
            });
        });
}

var makeLine = function (c1, c2) {
    return lines
        .line(c1.cx(), c1.cy(),
              c2.cx(), c2.cy())
        .stroke("red")
        .data("start", c1.id())
        .data("end", c2.id())
        .data("crossed", false)
        .data("selected", false)
        .data("active", false)

        .on("move", function (e) {
            var start = SVG.get(this.data("start"));
            var end = SVG.get(this.data("end"));
            this.plot(start.cx(), start.cy(),
                      end.cx(),   end.cy());
            this.data("selected",
                      SVG.get(this.data("start")).data("selected") &&
                      SVG.get(this.data("end")).data("selected"));
            this.data("active",
                      SVG.get(this.data("start")).data("selected") ||
                      SVG.get(this.data("end")).data("selected"));
        })

        .on("intersect", function (e) {
            var that = this;
            var crossed = false;
            lines.each(function () {
                crossed = crossed || linesIntersect(this, that);
            });            
            this.data("crossed", crossed);
            this.fire("recolor");
        })

        .on("recolor", function (e) {
            this.stroke( this.data("crossed") ? 
                         "red" :
                         "green");
        });
}

var makeBox = function () {

    return draw
        .rect(0, 0)
        .fill("green")
        .opacity(.3)
        .front()
        .data("anchorX", 0)
        .data("anchorY", 0)

        .on("anchor", function (e) {
            this.data("anchorX", e.detail.x);
            this.data("anchorY", e.detail.y);
        })

        .on("redraw", function (e) {
            this.show();
            var x = e.detail.x;
            var y = e.detail.y;
            this.move(Math.min(x, this.data("anchorX")),
                      Math.min(y, this.data("anchorY")))
                .width (Math.abs(x - this.data("anchorX")))
                .height(Math.abs(y - this.data("anchorY")));
        });
}

var makeBG = function () {
    return draw
        .rect(width, height)
        .back()
        .data("success", "rgb(230, 255, 230)")
        .data("failure", "rgb(255, 240, 240)")

        .on("recolor", function (e) {
            this.fill(success ? this.data("success") : this.data("failure"));
        })
        .fire("recolor");
}

// ================================

// BOND MAKERS AND BREAKERS
// --------------------------------
var areFriends = function (c1, c2) {
    
    return
    // if c2 is c1's friend
    (c1.data("friends").reduce(function (a, b) {
        return a || SVG.get(b) === c2;
    }, false) ||
     // if c1 is c2's friend
     c2.data("friends").reduce(function (a, b) {
         return a || SVG.get(b) === c1;
     }, false));
    // the second check might not be necessary,
    // but safe programming is good programming
    // also it's only like ~5 more accesses, at worst
}

var makeFriends = function (c1, c2) {

    // if they're not already friends
    if (!areFriends(c1, c2)) {
        
        // draw a line between them
        var line = makeLine(c1, c2);

        // tell them they're friends
        c1.data("friends", c1.data("friends").concat(c2.id()));
        c2.data("friends", c2.data("friends").concat(c1.id()));

        // tell them about the line
        c1.data("lines", c1.data("lines").concat(line.id()));
        c2.data("lines", c2.data("lines").concat(line.id()));

    }
}

var breakUp = function (c1, c2) {

    // if they're already friends
    if (areFriends(c1, c2)) {
        
        // find the line between them
        var line;
        c1.data("lines").forEach( function () {
            var line_in = this;
            c2.data("lines").forEach( function () {
                if (this === line_in) {
                    line = SVG.get(this);
                }
            })});

        // tell them they're not friends anymore
        c1.data("friends", c1.data("friends").myRemove(c2.id()));
        c2.data("friends", c2.data("friends").myRemove(c1.id()));

        if (line !== undefined) {
            // tell to forget about the line
            c1.data("lines", c1.data("lines").myRemove(line.id()));
            c2.data("lines", c2.data("lines").myRemove(line.id()));
        }
    }
}

// ================================

// SELECTION MODIFIERS
// --------------------------------

var select = function (circle) {
    if (!circle.data("selected")) {
        circle.fire("select");
        selection.add(circle);
    }
}

var deselect = function (circle) {
    if (circle.data("selected")) {
        circle.fire("deselect");
        selection.remove(circle);
    }
}

var clearSelection = function (circle) {
    var oldSelection = [];
    selection.each(function () {
        oldSelection.push(this);
    });
    oldSelection.forEach(function (item) {
        deselect(item);
    });
}

// ================================

// INTERSECTION
// --------------------------------

var linesIntersect = function (l1, l2) {
    // super huge thanks to:
    // http://jeffe.cs.illinois.edu/teaching/373/notes/x06-sweepline.pdf

    var crossed;

    // if both lines are in the selection or not in the selection,
    // use the old value
    if (l1 === l2) {
        crossed = false;
    }
    else if (crosses[l1][l2] !== undefined &&
             (l1.data("selected") && l2.data("selected"))) {
        crossed = crosses[l1][l2];
    }
    else {

        // a bunch of accessing and terminology fixing
        var p0, x0, y0, p1, x1, y1, p2, x2, y2, p3, x3, y3;
        
        p0 = SVG.get(l1.data("start"));
        x0 = p0.cx(); y0 = p0.cy();
        
        p1 = SVG.get(l1.data("end"));
        x1 = p1.cx(); y1 = p1.cy(); 

        p2 = SVG.get(l2.data("start"));
        x2 = p2.cx(); y2 = p2.cy(); 

        p3 = SVG.get(l2.data("end"));
        x3 = p3.cx(); y3 = p3.cy(); 
        
        // if the lines share points, pretend they don't intersect
        // since they're on the same circle
        crossed = (!samePoint(x0, y0, x2, y2) &&
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
    crosses[l1][l2] = crossed;
    crosses[l2][l1] = crossed;
    return crossed;
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

var tboxIntersect = function (shape1, shape2) {

    // extract values, for corners
    var b1 = shape1.rbox();
    var b2 = shape2.rbox();
    
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


// MISC. HELPERS
// --------------------------------
var inBounds = function (x, y) {
    return inBoundsX(x) && inBoundsY(y);
}

var inBoundsX = function (x) {
    return between(buffer, x, width - buffer);
}

var inBoundsY = function (y) {
    return between(buffer, y, height - buffer);
}

var between= function (a, b, c) {
    return (a < b && b < c);
}

// random number between min and max
var makeRandom = function (min, max) {
    return min + (max - min) * Math.random();
}

// check if the game is currently solved
var didWeWin = function () {
    success = true;
    // if any line is crossed, we didn't solve it
    lines.each(function () {
        this.fire("intersect");
        success = success && !this.data("crossed");
    });
    bg.fire("recolor");
}

var debug = function() {
    if (debugging) {
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
}
// ================================
// ================================================================

// POPULATION ALGORITHMS
// ----------------------------------------------------------------

var populate = function () {
    circles.clear();
    lines.clear();

    for (var i = 0; i < numCircles; i++) {
        makeCircle(makeRandom(buffer, width - buffer),
                   makeRandom(buffer, height - buffer));
    }

    if (type in types) {
        types[type]();
    }

    crosses = [];
    lines.each(function () {
        crosses[this] = [];
    });

    didWeWin();
}

var types = {

    // Border
    // creates a border
    // SOLVABLE
    // --------------------------------
    border: function () {
        circles.each(function (i, children) {
            makeFriends(this, children[(i+1) % numCircles]);
        });
    },
    // ================================

    // Max Edges
    // creates edges randomly up to a cap
    // NOT SOLVABLE
    // --------------------------------
    maxEdges: function () {
        var cap = 3 * (numCircles - 2)
        var added;
        for (var edges = 0; edges < cap; added ? edges++ : edges) {

            added = false;

            var c1 = circles.get(Math.floor(makeRandom(0, numCircles)));
            var c2 = circles.get(Math.floor(makeRandom(0, numCircles)));

            if (c1 !== c2 &&
                !areFriends(c1, c2)) {

                makeFriends(c1, c2);
                added = true;
            }
        }
    },
    // ================================

    // Border of Triangles
    // --------------------------------
    // Border of Triangles
    // creates a border, as well as a triangle every two nodes
    // SOLVABLE
    borderOfTriangles: function () {
        popBorderOfTrianglesHelper(circleSet());
    },

    // Border of Triangles Iterated
    // creates a border, as well as a triangle every two nodes,
    // and another layer of triangles
    // SOLVABLE
    borderOfTrianglesIterated: function () {
        popBorderOfTrianglesHelper(popBorderOfTrianglesHelper(circleSet()));
    },

    // Border of Triangles Iterated
    // creates a border, as well as a triangle every two nodes,
    // and as many layers of triangles as will fit
    // SOLVABLE
    borderOfTrianglesMax: function () {
        popBorderOfTrianglesMaxHelper(circleSet());
    }

};

// Helper Functions
var popBorderOfTrianglesMaxHelper = function (raw_circles) {
    var newCircles = popBorderOfTrianglesHelper(raw_circles);
    if (newCircles.length() >= 3) {
        popBorderOfTrianglesMaxHelper(newCircles);
    }
}

var popBorderOfTrianglesHelper = function (raw_circles) {

    var innerCircles = draw.set();
    var length = raw_circles.length();
    var iters = length - (length % 2);
    for (var i = 0; i < iters; i += 2) {

        var c1 = raw_circles.get((i  ) % length);
        var c2 = raw_circles.get((i+1) % length);
        var c3 = raw_circles.get((i+2) % length);

        makeFriends(c1, c2);
        makeFriends(c2, c3);
        makeFriends(c1, c3);

        innerCircles.add(c2);
    }
    return innerCircles;
}

// get a set of all of our cirlces,
// as opposed to a group
var circleSet = function () {
    var set = draw.set();
    circles.each(function () {
        set.add(this);
    });
    return set;
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

        // update circle under mouse
        mouseOn = false;

        // iterate through circles to see if any are clicked on
        circles.each(function (i) {
            if (this.inside(cursorX, cursorY)) {
                mouseOn = this;
            }
        });

        // if we're clicking on something
        if (mouseOn) {
	    // if we're clicking on something new
	    if (!mouseOn.data("selected")) {
		// clear and add, or shift-add
		if (!shift) {
                    clearSelection();
		};
		select(mouseOn);

		// tell state that the circle was just added
		recent = true;
	    }
        }

        // in case we're boxing
        box.fire("anchor", {x: cursorX, y: cursorY});

        debug();
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
		var dx = cursorX - cursorXprev;
		var dy = cursorY - cursorYprev;
                selection.each(function () {
		    if (inBounds(this.cx() + dx,
				 this.cy() + dy)) {
			this.dmove(dx, dy);
			this.fire("move");
		    }
                });

	    }
	    // if we're not on a circle...
	    else {

                boxed = true;

                // clear selection if we're not adding to it
                if (!shift && !moved) {
		    clearSelection();
                }
                // add boxed circles to selection
                circles.each(function () {
		    if (tboxIntersect(this, box)) {
                        select(this);
		    }
                });
                box.fire("redraw", {x: cursorX, y: cursorY});
	    }
        }
        debug();
    }

    // when the mouse is released
    document.onmouseup = function (e) {

        // if we clicked on something...
        if (mouseOn) {
	    // if we didn't move and we're not shift-adding, clear the selection
	    if (!shift && !moved) {
                clearSelection();
	    }

	    // if we're shift-clicking something selected, remove it
	    if (shift && mouseOn.data("selected") && !moved && !recent) {
                deselect(mouseOn);
	    }
	    // otherwise, add the thing we clicked on
	    else {
                select(mouseOn);
	    }
        }
        // if we clicked in space, empty the selection
        else if (!boxed) {
	    clearSelection();
        }

        box.hide();
        didWeWin();

        // update state
        mouseOn = false;
        mouseDown = false;
        moved = false;
        recent = false;
        boxed = false;

        debug();
    }
}
// ================================
// ================================================================

// typeField = document.getElementById("pop");
nodesField = document.getElementById("nodes");
button = document.getElementById("reset");

var start = function () {
    makeWindow();

    circles = draw.group();
    lines = draw.group().after(circles);
    selection = draw.set();

    box = makeBox();
    bg = makeBG();

    // var newType = typeField.value;
    // type = newType in types ? newType : type;
    
    var newNodes = parseInt(nodesField.value, 10); 
    numCircles = isNaN(newNodes) ? numCircles : newNodes;
    
    populate();
    // typeField.value = type;
    nodesField.value = numCircles;
    setGameInput();
}

button.addEventListener("click", function () { start(); });
button.dispatchEvent(new MouseEvent("click"));
