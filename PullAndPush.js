var winHeight = 800;
var winWidth = 600;

Crafty.init(winHeight, winWidth);
Crafty.background('lightgray');

// ************************************************************************************
// 										TODO
//		Rendre la taille du tableau dépendante de 2 variables w et h
// 		Ajouter les matchs par colonne
//		Mettre une ligne "tampon" avant la ligne de game over : on voit quelle sera la dernière tuile qui sera au-dessus de tas
// ************************************************************************************

var fieldArray = new Array(); // contains the field with the tiles
for (var i=0; i<10; i++) {
	fieldArray[i] = new Array();
	for (var j=0; j<4; j++)
		// each tile has a color (between 0 and 3) and an id (the id of the Crafty entity
		fieldArray[i][j] = { "color": -1, "id": -1 };
}

var fullColumns = [0,0,0,0]; // all the columns are empty when we start

var gastroFieldTile = {"height":1,
				"width":12,
				"data":[5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
				"x":0,
				"y":320,
				"tileheight":32,
				"tilewidth":32,
				"tiles":[	"sprTrayHG",
							"sprTrayHD",
							"sprTrayBD",
							"sprTrayBG",
							"sprTrayH",
							"sprTrayD",
							"sprTrayB",
							"sprTrayG",
							"sprTrayFill"
						]		
				};

function drawTileset(data) {
	//draws a tileset with a JSON format
	var posData = 0;
	for (var y = data.y; y < (data.y+(data.height * data.tileheight)); y += data.tileheight) {
		for (var x = data.x; x < (data.x+(data.width * data.tilewidth)); x += data.tilewidth) {
			// console.log(data.tiles[data.data[posData]-1], x, y);
			Crafty.e("2D, Canvas, "+data.tiles[data.data[posData]-1])
				.attr({ x: x, y: y });
			posData++;
		}
	}
}

Crafty.sprite(32, "assets/tray.png", {
										sprTrayHG:[0,0],
										sprTrayHD:[1,0],
										sprTrayBD:[2,0],
										sprTrayBG:[3,0],
										sprTrayH:[4,0],
										sprTrayD:[5,0],
										sprTrayB:[6,0],
										sprTrayG:[7,0],
										sprTrayFill:[8,0]
									});
									
Crafty.sprite("assets/tile.png", {sprGastro:[0,0,96,32]});
Crafty.sprite("assets/pad.png", {sprPad:[0,0,96,32]});

Crafty.scene("main", function () {

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
								.tile(col*96, line*32, f.color);
						}
					} else {
						f.id = Crafty.e("tile")
							.tile(col*96, line*32, f.color);
					}
				} else if (f.id != -1) {
					// if there was a tile let's destroy it
					Crafty(f.id).destroy();
				}
				col++;
			});
			line++;
			col=0;
		});
		
		for (var i=0; i<4; i++) {
			if (fieldArray[0][i].color !== -1) {
				fullColumns[i]=1;
			} else {
				fullColumns[i]=0;
			}
		}
		
		if (fullColumns.indexOf(0) === -1)
			console.log("GAME OVER !");
		// console.log(fullColumns);
	}
	
	function dropTiles() {
		// let's drop all the tiles by one, beginning by the bottom
		for (var line=9; line>=0; line--) {
			for (var col=0; col<4; col++) {
				if (fieldArray[line][col].color == -1) {
					// there's no tile here, let's see if there's one to drop above
					// console.log("found", line, col);
					if ((line-1 >= 0) && (fieldArray[line-1][col].color != -1)) {
						// there's something above, we drop it
						fieldArray[line][col].color = fieldArray[line-1][col].color;
						fieldArray[line-1][col].color = -1;
					}
				}
			}
		}
	}
	
	function pullColumn(col) {
		// we pull the column col by one tile, destroying the tile on the bottom 
		var line = 9;
		fieldArray[line][col].color = -1;
		while (fieldArray[line-1][col].color != -1) {
			fieldArray[line][col].color = fieldArray[line-1][col].color;
			// console.log(line, fieldArray[line][col].color);
			line--;
			if (line > 0) {
				if (fieldArray[line-1][col].color == -1)
					fieldArray[line][col].color = -1;
			} else {
				break;
			}
		}
	}
	
	function pushColumn(column, color) {
		// we push the column `column` with a tile of color `color`
		var line = 9;
		while (fieldArray[line][column].color != -1)
			line--;
		for (var i=line; i < 9; i++)
			fieldArray[i][column].color = fieldArray[i+1][column].color;
		fieldArray[9][column].color = color;
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
			// checkBoard(fieldArray[0][0].color, 0, 0, "y", 1);
		} else {
			// not first call, let's do actual checking
			switch (direction) {
				case "x":
					if (y <= 9) {
						if (x <= 2) {
							if (color === -1) {
								// if no tile, we check for the next tile
								checkBoard(color, x+1, y, "x", 1);
							} else if (fieldArray[y][x+1].color === color) {
								checkBoard(color, x+1, y, "x", amount+1);
							} else if (x <= 1) {
								// console.log("change coul ligne", y);
								checkBoard(fieldArray[y][x+1].color, x+1, y, "x", 1);
							} else if (amount > 2) {
								console.log("Trouvé !", y, amount);
								// let's delete the tiles
								for (var i=x; i > x-amount; i--)
									fieldArray[y][i].color = -1;
								if (y < 9) {
									checkBoard(fieldArray[y+1][0].color, 0, y+1, "x", 1);
								} else {
									// console.log("Fini !");
								}
							} else {
								// console.log("Rien sur la ligne", y);
								if (y < 9) {
									checkBoard(fieldArray[y+1][0].color, 0, y+1, "x", 1);
								} else {
									// console.log("Fini !");
								}
							}
						} else if (amount > 2) {
							// we are at the end of the line and there's at least 3 consecutives tiles
							console.log("Trouvé !", y, amount);
							// let's delete the tiles
							for (var i=x; i > x-amount; i--)
								fieldArray[y][i].color = -1;
							// we test the next line
							if (y < 9) {
								checkBoard(fieldArray[y+1][0].color, 0, y+1, "x", 1);
							} else {
								// console.log("Fini !");
							}
						} else {
							// we are at the end of the line but no 3 consecutive tiles
							// console.log("Rien sur la ligne", y);
							if (y < 9) {
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
					break;
			}
		}
	}
	
	Crafty.c("tile", {
		_colorsArray: ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF"],
		init: function () {},
		tile: function (xTile, yTile, colorTile) { // colorTile is a number between 0 and 3
			var setPosition = false; // position not set by default
			if (typeof xTile == 'undefined') {
				var posGastroArray = Crafty.math.randomInt(0,3);
				var xTile = posGastroArray*96;
			} else {
				var posGastroArray = Math.round(xTile/96);
				setPosition = true; //we set the position, so we don't wont to update this tile movement
			}
			
			if (typeof yTile == 'undefined') 
				var yTile = 0;
			
			if (typeof colorTile == 'undefined')
				var colorTile = Crafty.math.randomInt(0,3);

			// this.color = colorTile;
			// console.log("in", this[0], this.color);
				
			var stopMovement = false;
			var tileId = Crafty.e("2D, Canvas, Tint, Collision, sprGastro")
				.attr({ x: xTile, y: yTile, color: colorTile })
				.tint(this._colorsArray[colorTile], 0.5)
				.bind('MoveGastro', function(e) {
					// when the event is triggered, we move the tile
					// we do nothing when the position was manually set
					if (!stopMovement && !setPosition) {
						if ((yTile+32) < gastroFieldTile.y) {
							yTile += 32;
							this.attr({ x: this.x, y: yTile });
							if (this.hit("sprGastro")) {
								yTile -= 32;
								this.attr({ x: this.x, y: yTile });
								stopMovement = true;
								bottomArray[posGastroArray][((gastroFieldTile.y/gastroFieldTile.tileheight) - (yTile/32) - 1)] = this[0];
							}
						} else {
							this.attr({ x: this.x, y: (gastroFieldTile.y - 32) });
							stopMovement = true;
							bottomArray[posGastroArray][0] = this[0];
						}
					}
				})
			;
			return tileId[0];
		}
	});
	
	Crafty.c("pad", {
		init: function () {
			var isKeyDown = false;
			var padLoadId = -1; // the ID of the tile on our pad
			Crafty.e("2D, Canvas, sprPad")
				.attr({ x:0, y:(gastroFieldTile.y + gastroFieldTile.tileheight) })
				.bind('KeyDown', function(e) {
					if (!isKeyDown) {
						if(e.key == Crafty.keys['LEFT_ARROW']) {
							if (this.x - 96 >= 0) {
								this.x -= 96;
								if (padLoadId != -1)
									Crafty(padLoadId).
										attr({x:this.x, y:(this.y-32) });
							}
							isKeyDown = true;
						} else if (e.key == Crafty.keys['RIGHT_ARROW']) {
							if (this.x + 96 <= (96*3)) {
								this.x += 96;
								if (padLoadId != -1)
									Crafty(padLoadId).
										attr({x:this.x, y:(this.y-32) });
							}
							isKeyDown = true;
						} else if (e.key == Crafty.keys['J']) {
							var col = Math.round(this.x/96);
							if (padLoadId != -1) {
								// we unload the tile and empty the pad
								if (fullColumns[col] !== 1) {
									pushColumn(col, Crafty(padLoadId).color);
									drawField();
									Crafty(padLoadId).destroy();
									padLoadId = -1;
									this.y -= 32;
								} else {
									console.log("Column full!");
								}
								isKeyDown = true;
							} else if (fieldArray[9][col].color != -1) {
								// empty pad, so we load the tile
								this.y += 32;
								padLoadId = Crafty.e("tile")
									.tile(this.x, this.y-32, fieldArray[9][col].color);
								pullColumn(col);
								drawField();
								isKeyDown = true;
							}
						} else if (e.key == Crafty.keys['D']) {
							drawField();	
						}
					}
				})
				.bind('KeyUp', function(e) {
					isKeyDown = false;
				})
			;
		}
	});
	
	// let's create a new event
	Crafty.addEvent(this, window.document, "MoveGastro", null);
	
	drawTileset(gastroFieldTile);
	Crafty.e("pad");
	// for (var i=0; i<10; i++) {
		// fieldArray[i] = new Array();
		// for (var j=0; j<4; j++)
			// fieldArray[i][j] = { "color": Crafty.math.randomInt(-1,3), "id": -1 };
	// }
	drawField();
	
	var gastroCounter = new Array();
	
	// we trigger that new event every X ms, first we drop all the tiles, then we check for matching tiles, then we draw the new field
	window.setInterval(function () {dropTiles(); checkBoard(); drawField();}, 500);
	// we add a new gastro every second
	window.setInterval(function () {
		if (fullColumns.indexOf(0) !== -1) {
			// if the game is not over!
			do {
				var rColumn = Crafty.math.randomInt(0,3);
				// console.log("R");
			} while (fullColumns[rColumn] !== 0);
			// console.log(rColumn);
			fieldArray[0][rColumn].color = Crafty.math.randomInt(0,3);
		}
	}, 1000);
	// fieldArray[0][Crafty.math.randomInt(0,3)].color = Crafty.math.randomInt(0,3);
});

Crafty.scene("main");