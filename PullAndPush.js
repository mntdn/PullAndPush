var winWidth = 600;
var winHeight = 450;

Crafty.init(winWidth,winHeight);
Crafty.background('lightgrey');

// ************************************************************************************
// 										TODO
//		Mettre une ligne "tampon" avant la ligne de game over : on voit quelle sera la dernière tuile qui sera au-dessus du tas
// ************************************************************************************

var DEBUG_MODE = false;
var PAUSE_MODE = false;

Crafty.scene("menu", function () {
	Crafty.sprite("assets/tile.png", {sprTile:[0,0,96,32]});
	
	Crafty.e("2D, DOM, Mouse, Text, sprTile")
		.attr({ x: 50, y: 50 })
		.text("Jouer")
		.bind("Click", function (e) {
			Crafty.scene("main");
		})
	;
});

Crafty.scene("main", function () {

	var fieldArray = new Array(); // contains the field with the tiles
	var fieldWidth = 6, fieldHeight = 12; // width and height of the field, in number of tiles
	for (var i=0; i<fieldHeight; i++) {
		fieldArray[i] = new Array();
		for (var j=0; j<fieldWidth; j++)
			// each tile has a color (between 0 and 3), an id (the id of the Crafty entity),
			// and a prorpiety indicating if the tile is moving or not (not moving = touching another tile)
			fieldArray[i][j] = { "color": -1, "id": -1, "moving": 1 };
	}

	var fullColumns = new Array(); 
	for (var j=0; j<fieldWidth; j++) // all the columns are empty when we start
		fullColumns[j] = 0;

	var tileWidth = 52, tileHeight = 32;
	Crafty.sprite("assets/tile.png", {sprTile:[0,0,tileWidth,tileHeight]});
	Crafty.sprite("assets/pad.png", {sprPad:[0,0,tileWidth,tileHeight]});
	
	function drawField() {
		// we redraw all the tiles if they have changed
		var line = 0, col = 0;
		fieldArray.forEach(function (e) {
			e.forEach(function (f) {
				if (f.color != -1) {
					if (f.id != -1) {
						if (Crafty(f.id).color != f.color) {
							// console.log(f.id, Crafty(f.id).color, f.color);
							Crafty(f.id).destroy();
							f.id = Crafty.e("tile")
								.tile(col*tileWidth, line*tileHeight, f.color);
							f.moving = 1;
						}
					} else {
						f.id = Crafty.e("tile")
							.tile(col*tileWidth, line*tileHeight, f.color);
					}
				} else if (f.id != -1) {
					// if there was a tile let's destroy it
					Crafty(f.id).destroy();
					f.moving = 1;
				}
				col++;
			});
			line++;
			col=0;
		});
		
		for (var i=0; i<fieldWidth; i++) {
			var sum = 0;
			for (var j=0; j<fieldHeight; j++)
				if (fieldArray[j][i].color !== -1)
					sum++;
			if (sum === fieldHeight) {
				// if the whole column contains tiles, it's full
				fullColumns[i]=1;
			} else {
				fullColumns[i]=0;
			}
		}
		
		if (fullColumns.indexOf(0) === -1) {
			console.log("GAME OVER !");
			window.clearInterval(moveTilesId);
			window.clearInterval(addTilesId);
			Crafty.e("2D, Canvas, Color, Mouse")
				.attr({ x: 50, y: 50, w: 200, h: 150 })
				.color("white")
				.bind("Click", function (e) {
					Crafty.scene("main");
				})
			;
			Crafty.e("2D, DOM, Text")
				.attr({ x: 75, y: 75, w: 150 })
				.text("GAME OVER ! Click to play again")
			;
		}
		// console.log(fullColumns);
		
		if (DEBUG_MODE) {
			Crafty("Text").destroy();
			var line = 0, col = 0;
			fieldArray.forEach(function (e) {
				e.forEach(function (f) {
					Crafty.e("2D, DOM, Text")
						.attr({ x:(col*tileWidth)+10, y:(line*tileHeight)+10, w:85 })
						.textFont({ family: 'Arial', size: '12px' })
						.text(f.id+"|"+f.color+"|"+f.moving);
					col++;
				});
				line++;
				col=0;
			});
		}
	}
	
	function dropTiles() {
		// let's drop all the tiles by one, beginning by the bottom
		for (var line=(fieldHeight-1); line>=0; line--) {
			for (var col=0; col<fieldWidth; col++) {
				if (fieldArray[line][col].color == -1) {
					// there's no tile here, let's see if there's one to drop above
					// console.log("found", line, col);
					if ((line-1 >= 0) && (fieldArray[line-1][col].color != -1)) {
						// there's something above, we drop it
						fieldArray[line][col].color = fieldArray[line-1][col].color;
						fieldArray[line-1][col].color = -1;
					}
				} /* else {
					// this tile is not moving
					fieldArray[line][col].moving = 0;
				} */
			}
		}
	}
	
	function checkMoving() {
		// let's check all the moving tiles
		for (var col=0; col<fieldWidth; col++) {
			var line = fieldHeight-1;
			while (fieldArray[line][col].color !== -1) {
				// the tiles don't move as long as they touch the one that touches the bottom
				fieldArray[line][col].moving = 0;
				if (line > 0) {
					line--;
				} else {
					fieldArray[line][col].moving = 0;
					break;
				}
			}
			if (line > 0)
				for (var i=line; i>=0; i--)
					// every tile that is over the basic heap (the one that touches the bottom) is or will be moving
					fieldArray[i][col].moving = 1;
		}
	}
	
	function pullColumn(col) {
		// we pull the column col by one tile, destroying the tile on the bottom 
		var line = (fieldHeight-1);
		fieldArray[line][col].color = -1;
		while (fieldArray[line-1][col].color != -1) {
			fieldArray[line][col].color = fieldArray[line-1][col].color;
			// console.log(line, fieldArray[line][col].color);
			line--;
			if (line > 0) {
				if (fieldArray[line-1][col].color == -1)
					fieldArray[line][col].color = -1;
			} else {
				fieldArray[line][col].color = -1;
				break;
			}
		}
	}
	
	function pushColumn(column, color) {
		// we push the column `column` with a tile of color `color`
		var line = (fieldHeight-1);
		while (fieldArray[line][column].color != -1)
			line--;
		for (var i=line; i < (fieldHeight-1); i++)
			fieldArray[i][column].color = fieldArray[i+1][column].color;
		fieldArray[(fieldHeight-1)][column].color = color;
	}
	
	function updateScore(toAdd) {
		// updates the current score by toAdd
		var s = scoreText.text();
		scoreText.text(s+toAdd);
		console.log("Won",toAdd,"points");
	}
	
	function checkBoard(color, x, y, direction, amount) {
		// Checks the board for aligned tiles
		// color contains the color to check to
		// direction contains "x", "y" or "xy" depending on the direction we want to take
		// amount contains the amount of tiles of the same color
		
		// BUG : si un match-3 avec un moving 1 0 0 0 1 ça ne détecte pas apparemment
		
		// console.log("Appel", color, x, y, direction, amount);
		if (typeof color == 'undefined') {
			//first call of this function, we check the color in both directions
			checkBoard(fieldArray[0][0].color, 0, 0, "x", 1);
			checkBoard(fieldArray[0][0].color, 0, 0, "y", 1);
		} else {
			// not first call, let's do actual checking
			switch (direction) {
				case "x":
					if (y <= (fieldHeight-1)) {
						if (x < (fieldWidth-1)) {
							if ((color === -1) || (fieldArray[y][x].moving === 1)) {
								// if no tile or moving tile, we check for the next tile
								checkBoard(fieldArray[y][x+1].color, x+1, y, "x", 1);
							} else if (fieldArray[y][x+1].color === color) {
								checkBoard(color, x+1, y, "x", amount+1);
							} else if (amount > 2) {
								console.log("Trouvé horiz !", y, amount);
								updateScore(10*amount);
								// let's delete the tiles
								for (var i=x; i > x-amount; i--)
									fieldArray[y][i].color = -1;
								if (x < (fieldWidth-3)) {
									checkBoard(fieldArray[y][x+1].color, x+1, y, "x", 1);
								} else {
									// we test the next line
									if (y < (fieldHeight-1)) {
										checkBoard(fieldArray[y+1][0].color, 0, y+1, "x", 1);
									} else {
										// console.log("Fini !");
									}
								}
							} else if (x < (fieldWidth-3)) {
								checkBoard(fieldArray[y][x+1].color, x+1, y, "x", 1);
							} else {
								// we test the next line
								if (y < (fieldHeight-1)) {
									checkBoard(fieldArray[y+1][0].color, 0, y+1, "x", 1);
								} else {
									// console.log("Fini !");
								}
							}
						} else {
							if (amount > 2) {
								console.log("Trouvé horiz !", y, amount);
								updateScore(10*amount);
								// let's delete the tiles
								for (var i=x; i > x-amount; i--)
									fieldArray[y][i].color = -1;
							}
							// we test the next line
							if (y < (fieldHeight-1)) {
								checkBoard(fieldArray[y+1][0].color, 0, y+1, "x", 1);
							} else {
								// console.log("Fini !");
							}
						}
					} else {
						// console.log("Fini !");
					}
					break;
				case "y":
					if (x <= (fieldWidth-1)) {
						if (y < (fieldHeight-1)) {
							if ((color === -1) || (fieldArray[y][x].moving === 1)) {
								// if no tile or moving tile, we check for the next tile
								checkBoard(fieldArray[y+1][x].color, x, y+1, "y", 1);
							} else if (fieldArray[y+1][x].color === color) {
								checkBoard(color, x, y+1, "y", amount+1);
							} else if (amount > 2) {
								console.log("Trouvé vert !", x, amount);
								updateScore(10*amount);
								// let's delete the tiles
								for (var i=y; i > y-amount; i--)
									fieldArray[i][x].color = -1;
								if (y < (fieldHeight-3)) {
									checkBoard(fieldArray[y+1][x].color, x, y+1, "y", 1);
								} else {
									// we test the next column
									if (x < (fieldWidth-1)) {
										checkBoard(fieldArray[0][x+1].color, x+1, 0, "y", 1);
									} else {
										// console.log("Fini !");
									}
								}
							} else if (y < (fieldHeight-3)) {
								checkBoard(fieldArray[y+1][x].color, x, y+1, "y", 1);
							} else {
								// we test the next column
									if (x < (fieldWidth-1)) {
										checkBoard(fieldArray[0][x+1].color, x+1, 0, "y", 1);
								} else {
									// console.log("Fini !");
								}
							}
						} else {
							if (amount > 2) {
								console.log("Trouvé vert !", x, amount);
								updateScore(10*amount);
								// let's delete the tiles
								for (var i=y; i > y-amount; i--)
									fieldArray[i][x].color = -1;
							}
							// we test the next line
							if (x < (fieldWidth-1)) {
								checkBoard(fieldArray[0][x+1].color, x+1, 0, "y", 1);
							} else {
								// console.log("Fini !");
							}
						}
					} else {
						// console.log("Fini !");
					}
					break;
			}
		}
	}
	
	Crafty.c("tile", {
		_colorsArray: ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF"],
		init: function () {},
		tile: function (xTile, yTile, colorTile) { // colorTile is a number between 0 and 3
			var tileId = Crafty.e("2D, Canvas, Tint, Collision, sprTile")
				.attr({ x: xTile, y: yTile, color: colorTile })
				.tint(this._colorsArray[colorTile], 0.5)
			;
			return tileId[0];
		}
	});
	
	Crafty.c("pad", {
		init: function () {
			var isKeyDown = false;
			var padLoadId = -1; // the ID of the tile on our pad
			Crafty.e("2D, Canvas, sprPad")
				.attr({ x:0, y:((fieldHeight*tileHeight) + 4) })
				.bind('KeyDown', function(e) {
					if (!isKeyDown) {
						if(e.key == Crafty.keys['LEFT_ARROW']) {
							if (this.x - tileWidth >= 0) {
								this.x -= tileWidth;
								if (padLoadId != -1)
									Crafty(padLoadId).
										attr({x:this.x, y:(this.y-tileHeight) });
							}
							isKeyDown = true;
						} else if (e.key == Crafty.keys['RIGHT_ARROW']) {
							if (this.x + tileWidth <= (tileWidth*(fieldWidth-1))) {
								this.x += tileWidth;
								if (padLoadId != -1)
									Crafty(padLoadId).
										attr({x:this.x, y:(this.y-tileHeight) });
							}
							isKeyDown = true;
						} else if (e.key == Crafty.keys['J']) {
							var col = Math.round(this.x/tileWidth);
							if (padLoadId != -1) {
								// we unload the tile and empty the pad
								if (fullColumns[col] !== 1) {
									pushColumn(col, Crafty(padLoadId).color);
									drawField();
									Crafty(padLoadId).destroy();
									padLoadId = -1;
									this.y -= tileHeight;
								} else {
									console.log("Column full!");
								}
							} else if (fieldArray[(fieldHeight-1)][col].color != -1) {
								// empty pad, so we load the tile
								this.y += tileHeight;
								padLoadId = Crafty.e("tile")
									.tile(this.x, this.y-tileHeight, fieldArray[(fieldHeight-1)][col].color);
								pullColumn(col);
								drawField();
							}
							isKeyDown = true;
						} else if (DEBUG_MODE === true && (e.key == Crafty.keys['S'])) {
							if (!PAUSE_MODE) {
								window.clearInterval(moveTilesId);
								window.clearInterval(addTilesId);
								console.log("PAUSE");
								PAUSE_MODE = true;
							} else {
								gameLoop();
								console.log("PLAY");
								PAUSE_MODE = false;
							}
							isKeyDown = true;
						}
					}
				})
				.bind('KeyUp', function(e) {
					isKeyDown = false;
				})
			;
		}
	});
	
	Crafty.e("2D, DOM, Color")
		.attr({x: 0, y: tileHeight, w: (fieldWidth*tileWidth), h: 2 })
		.color("gray");
		
	Crafty.e("2D, DOM, Color")
		.attr({x: 0, y: (fieldHeight*tileHeight), w: (fieldWidth*tileWidth), h: 4 })
		.color("black");
	Crafty.e("pad");
	
	var scoreTotal = 0;
	var scoreText = Crafty.e("2D, DOM, Text")
						.attr({ x:450, y:32 })
						.text(scoreTotal)
					;
	
	/* for (var i=0; i<fieldHeight; i++) {
		fieldArray[i] = new Array();
		for (var j=0; j<fieldWidth; j++)
			fieldArray[i][j] = { "color": Crafty.math.randomInt(0,3), "id": -1 };
			// fieldArray[i][j] = { "color": (j==1)?-1:1, "id": -1 };
	}
	drawField();
	checkBoard(); */
	
	var no_play = 0;
	var moveTilesId = 0, addTilesId = 0;
	
	function gameLoop () {
		// we add a new gastro every second
		addTilesId = window.setInterval(function () {
			if (fullColumns.indexOf(0) !== -1) {
				// if the game is not over!
				do {
					var rColumn = Crafty.math.randomInt(0,(fieldWidth-1));
					// console.log("R");
				} while (fullColumns[rColumn] !== 0);
				// console.log(rColumn);
				fieldArray[0][rColumn].color = Crafty.math.randomInt(0,3);
				fieldArray[0][rColumn].moving = 1;
			}
			if (fullColumns.indexOf(0) !== -1) {
				// if the game is not over!
				do {
					var rColumn = Crafty.math.randomInt(0,(fieldWidth-1));
					// console.log("R");
				} while (fullColumns[rColumn] !== 0);
				// console.log(rColumn);
				fieldArray[0][rColumn].color = Crafty.math.randomInt(0,3);
				fieldArray[0][rColumn].moving = 1;
			}
		}, 1000);
		// we trigger that new event every X ms, first we drop all the tiles, then we check for matching tiles, then we draw the new field
		moveTilesId = window.setInterval(function () {
			drawField();
			checkMoving();
			checkBoard();
			drawField();
			dropTiles();
		}, 500);
		// fieldArray[0][Crafty.math.randomInt(0,3)].color = Crafty.math.randomInt(0,3);
	}
	
	if (!no_play) {
		gameLoop ();
	}
});

Crafty.load([
		"assets/tile.png", 
		"assets/pad.png"
	],
	function() {
		//when loaded
		Crafty.scene("menu"); //go to the menu
	},

	function(e) {
		//progress
		console.log(e.loaded, e.total, e.percent ,e.src);
	},

	function(e) {
		//uh oh, error loading
	}
);