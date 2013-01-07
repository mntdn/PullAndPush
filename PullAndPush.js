var winWidth = 600;
var winHeight = 450;

Crafty.init(winWidth,winHeight);
Crafty.background('lightgrey');

// ************************************************************************************
//
// 										TODO
//		Mettre une ligne "tampon" avant la ligne de game over : on voit quelle sera la dernière tuile qui sera au-dessus du tas
//		Le système de combo fonctionne, mais il est compliqué d'afficher un compteur de combo... Peut-être faire quelque chose sur le côté ?
//
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
	Crafty.e("HTML, Mouse")
		.attr({x:200, y:20, w:100, h:100})
		.replace("<h1>PLAY</h1>")
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

	var colorsArray = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF"];

	var tileWidth = 52, tileHeight = 32;
	Crafty.sprite("assets/tile.png", {sprTile:[0,0,tileWidth,tileHeight]});
	Crafty.sprite("assets/pad.png", {sprPad:[0,0,tileWidth,tileHeight]});
	
	var comboCounter = 0; // Counts the number of simultaneous matches we did
	
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
						.attr({ x:(col*tileWidth)+1, y:(line*tileHeight)+10, w:85 })
						.textFont({ family: 'Arial', size: '11px' })
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
	
	function updateScore(toAdd, pos) {
		// updates the current score by toAdd
		// pos is an {x, y} object
		var s = scoreText.text();
		scoreText.text(s+(toAdd*comboCounter));
		// console.log(pos);
		// a litte animation to show the score gained
		var nbSteps = 50;
		if (pos.y + (toAdd*comboCounter) > winHeight) pos.y = winHeight - (toAdd*comboCounter) - 10;
		Crafty.e("DOM, Text")
			.attr({x: pos.x, y: pos.y})
			.text(toAdd*comboCounter)
			.css({
				'font-size':(toAdd*comboCounter)+'px', 
				'font-weight':'bold', 
				'font-family':'Arial, sans-serif', 
				'color': '#FFF',
				'-webkit-text-stroke': '1px black',
				'text-shadow': '-2px 2px 2px #000'
			})
			.bind("EnterFrame", function (e) {
				if (nbSteps-- > 0) {
					this.y -= 0.7;
				} else {
					this.destroy();
				}
			})
		;
		// console.log("Won",toAdd,"points");
	}
	
	function comboCheck() {
		// console.log(comboCounter,"COMBO");
		var nbSteps = 50;
		Crafty.e("DOM, Text")
			.attr({x: 50, y: ((fieldHeight*tileHeight)/2) - (comboCounter*10)})
			.text(comboCounter+"x COMBO!")
			.css({
				'font-size':(comboCounter*20)+'px', 
				'font-weight':'bold', 
				'font-family':'Arial, sans-serif', 
				'color': '#F00',
				'text-align':'center',
				'margin':'0',
				'padding':'0',
				'line-height':'80%',
				'-webkit-text-stroke': '1px black',
				'text-shadow': '-2px 2px 2px #000'
			})
			.bind("EnterFrame", function (e) {
				if (nbSteps-- > 0) {
					this.y -= 0.7;
				} else {
					this.destroy();
				}
			})
		;
	}
	
	function checkBoard(color, x, y, direction, amount) {
		// Checks the board for aligned tiles
		// color contains the color to check to
		// direction contains "x", "y" or "xy" depending on the direction we want to take
		// amount contains the amount of tiles of the same color
		
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
								console.log("Trouvé horiz !", x, y, amount);
								comboCounter++;
								updateScore(10*amount, {x: (x-Math.ceil(amount/2)+1)*tileWidth, y: y*tileHeight});
								// let's delete the tiles
								for (var i=x; i > x-amount; i--)
									fieldArray[y][i].color = -2;
								if (x < (fieldWidth-3)) {
									checkBoard(fieldArray[y][x+1].color, x+1, y, "x", 1);
								} else {
									// we test the next line
									if (y < (fieldHeight-1)) {
										checkBoard(fieldArray[y+1][0].color, 0, y+1, "x", 1);
									} else {
										console.log("Fini !");
									}
								}
							} else if (x < (fieldWidth-3)) {
								checkBoard(fieldArray[y][x+1].color, x+1, y, "x", 1);
							} else {
								// we test the next line
								if (y < (fieldHeight-1)) {
									checkBoard(fieldArray[y+1][0].color, 0, y+1, "x", 1);
								} else {
									console.log("Fini !");
								}
							}
						} else {
							if (amount > 2) {
								console.log("Trouvé horiz !", x, y, amount);
								comboCounter++;
								updateScore(10*amount, {x: (x-Math.ceil(amount/2)+1)*tileWidth, y: y*tileHeight});
								// let's delete the tiles
								for (var i=x; i > x-amount; i--)
									fieldArray[y][i].color = -2;
							}
							// we test the next line
							if (y < (fieldHeight-1)) {
								checkBoard(fieldArray[y+1][0].color, 0, y+1, "x", 1);
							} else {
								console.log("Fini !");
							}
						}
					} else {
						console.log("Fini !");
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
								console.log("Trouvé vert !", x, y, amount);
								comboCounter++;
								updateScore(10*amount, {x: x*tileWidth, y: (y-Math.ceil(amount/2)+1)*tileHeight });
								// let's delete the tiles
								for (var i=y; i > y-amount; i--)
									fieldArray[i][x].color = -2;
								if (y < (fieldHeight-3)) {
									checkBoard(fieldArray[y+1][x].color, x, y+1, "y", 1);
								} else {
									// we test the next column
									if (x < (fieldWidth-1)) {
										checkBoard(fieldArray[0][x+1].color, x+1, 0, "y", 1);
									} else {
										console.log("Fini !");
									}
								}
							} else if (y < (fieldHeight-3)) {
								checkBoard(fieldArray[y+1][x].color, x, y+1, "y", 1);
							} else {
								// we test the next column
									if (x < (fieldWidth-1)) {
										checkBoard(fieldArray[0][x+1].color, x+1, 0, "y", 1);
								} else {
									console.log("Fini !");
								}
							}
						} else {
							if (amount > 2) {
								console.log("Trouvé vert !", x, y, amount);
								comboCounter++;
								updateScore(10*amount, {x: x*tileWidth, y: (y-Math.ceil(amount/2)+1)*tileHeight });
								// let's delete the tiles
								for (var i=y; i > y-amount; i--)
									fieldArray[i][x].color = -2;
							}
							// we test the next line
							if (x < (fieldWidth-1)) {
								checkBoard(fieldArray[0][x+1].color, x+1, 0, "y", 1);
							} else {
								console.log("Fini !");
							}
						}
					} else {
						console.log("Fini !");
					}
					break;
			}
		}
	}
	
	function blinkMatches() {
		// makes the found matches blink
		var matchesArray = new Array();
		for (var i=0; i<fieldWidth; i++) {
			for (var j=0; j<fieldHeight; j++)
				if (fieldArray[j][i].color === -2) {
					// Crafty(fieldArray[j][i].id).alpha = 0.3;
					// fieldArray[j][i].color = -1;
					matchesArray.push({ x: j, y:i });
				}
		}
		
		if (matchesArray.length > 0) {
			PAUSE_MODE = true;
			window.setTimeout(function () {
				// we unpause in 200 milliseconds, the time for us to blink the tiles
				PAUSE_MODE = false;
			}, 200);
			matchesArray.forEach(function (e) {
				// let's do the blinking : we make the alpha lower then higher to simulate this effect
				window.setTimeout(function () {
					Crafty(fieldArray[e.x][e.y].id).alpha = 0.1;
				}, 50);
				window.setTimeout(function () {
					Crafty(fieldArray[e.x][e.y].id).alpha = 0.8;
				}, 100);
				window.setTimeout(function () {
					Crafty(fieldArray[e.x][e.y].id).alpha = 0.1;
				}, 150);
				window.setTimeout(function () {
					Crafty(fieldArray[e.x][e.y].id).alpha = 0.8;
				}, 180);
				window.setTimeout(function () {
					// let's not forget to clear the tile afterwards...
					fieldArray[e.x][e.y].color = -1;
				}, 190);
			});
		}
	}
	
	Crafty.c("tile", {
		init: function () {},
		tile: function (xTile, yTile, colorTile) { // colorTile is a number between 0 and colorsArray.length-1
			var tileId = Crafty.e("2D, Canvas, Tint, Collision, sprTile")
				.attr({ x: xTile, y: yTile, color: colorTile })
				.tint(colorsArray[colorTile], 0.5)
			;
			return tileId[0];
		}
	});
	
	Crafty.c("pad", {
		init: function () {
			var padLoadId = -1; // the ID of the tile on our pad
			Crafty.e("2D, Canvas, sprPad")
				.attr({ x:0, y:((fieldHeight*tileHeight) + 4) })
				.bind('KeyDown', function(e) {
					if(e.key == Crafty.keys['LEFT_ARROW']) {
						if (this.x - tileWidth >= 0) {
							this.x -= tileWidth;
							if (padLoadId != -1)
								Crafty(padLoadId).
									attr({x:this.x, y:(this.y-tileHeight) });
						}
					} else if (e.key == Crafty.keys['RIGHT_ARROW']) {
						if (this.x + tileWidth <= (tileWidth*(fieldWidth-1))) {
							this.x += tileWidth;
							if (padLoadId != -1)
								Crafty(padLoadId).
									attr({x:this.x, y:(this.y-tileHeight) });
						}
					} else if (e.key == Crafty.keys['J']) {
						if (!PAUSE_MODE) {
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
						}
					} else if (e.key == Crafty.keys['S']) {
						PAUSE_MODE = !PAUSE_MODE;
					}
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
						.css({'font-size':'16px', 'font-weight': 'bold', 'font-family':'Arial sans-serif', 'color': '#190adb' })
						.text(scoreTotal)
					;
	
	/* for (var i=0; i<fieldHeight; i++) {
		fieldArray[i] = new Array();
		for (var j=0; j<fieldWidth; j++)
			fieldArray[i][j] = { "color": Crafty.math.randomInt(0,3), "id": -1 };
			// fieldArray[i][j] = { "color": (j==1)?-1:1, "id": -1 };
	}
	drawField();
	checkBoard();
	blinkMatches();
	comboCheck();
	console.log(comboCounter); */
	
	var no_play = 0;
	var moveTilesId = 0, addTilesId = 0;
	
	function gameLoop () {
		// we add a new gastro every second
		addTilesId = window.setInterval(function () {
			var authorizedColumns = new Array();
			for (var i=0; i<fullColumns.length; i++) 
				if (fullColumns[i] == 0) authorizedColumns.push(i);
			
			if (authorizedColumns.length > 0) {
				// if the game is not over!
				var rColumn = Crafty.math.randomElementOfArray(authorizedColumns);
				fieldArray[0][rColumn].color = Crafty.math.randomInt(0,colorsArray.length-1);
				fieldArray[0][rColumn].moving = 1;
				if (authorizedColumns.length > 1) {
					do {
						var rColumn2 = Crafty.math.randomElementOfArray(authorizedColumns);
					} while (rColumn2 === rColumn);
					fieldArray[0][rColumn2].color = Crafty.math.randomInt(0,colorsArray.length-1);
					fieldArray[0][rColumn2].moving = 1;
					// console.log(authorizedColumns, rColumn, rColumn2);
				}
			}
		}, 1000);
		
		// we trigger that new event every X ms, first we drop all the tiles, then we check for matching tiles, then we draw the new field
		moveTilesId = window.setInterval(function () {
			// if (!PAUSE_MODE) drawField();
			if (!PAUSE_MODE) comboCounter = 0;
			if (!PAUSE_MODE) checkMoving();
			if (!PAUSE_MODE) checkBoard();
			if (!PAUSE_MODE) blinkMatches();
			if (!PAUSE_MODE) comboCheck();
			if (!PAUSE_MODE) dropTiles();
			if (!PAUSE_MODE) drawField();
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