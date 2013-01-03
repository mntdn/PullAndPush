var winHeight = 800;
var winWidth = 600;

Crafty.init(winHeight, winWidth);
Crafty.background('lightgray');

var fieldArray = new Array();
for (var i=0; i<10; i++) {
	fieldArray[i] = new Array();
	for (var j=0; j<4; j++)
		fieldArray[i][j] = { "color": -1, "id": -1 };
}

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
	
	function dropColumn(col) {
		// we drop the column col (just the tiles that are on the bottom) by one tile, destroying the tile on the bottom 
		var line = 9;
		fieldArray[9][col].color = -1;
		while (fieldArray[line-1][col].color != -1) {
			fieldArray[line][col].color = fieldArray[line-1][col].color;
			console.log(line, fieldArray[line][col].color);
			line--;
			if (fieldArray[line-1][col].color == -1)
				fieldArray[line][col].color = -1;
			if (line == 0)
				break;
		}
	}
	
	function pushColumn(column, color) {
		// we push the column `column` whit a tile of color `color`
		if (fieldArray[0][column].color != -1) {
			// too much tiles already
			console.log("Too much tiles !");
		} else {
			var line = 9;
			var block = new Array();
			while (fieldArray[line][column].color != -1) {
				block.unshift(fieldArray[line][column].color);
				// console.log(line, fieldArray[line][column].color);
				line--;
				if (line == 0)
					break;
			}
			block.unshift(color);
			console.log(block);
			
			line=9;
			block.forEach(function (e) {
				fieldArray[line][column].color = e;
				line--;
			});
		}
	}
	
	Crafty.c("tile", {
		_colorsArray: ["#FF0000", "#00FF00", "#0000FF", "#FFFF00"],
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
								pushColumn(col, Crafty(padLoadId).color);
								drawField();
								Crafty(padLoadId).destroy();
								padLoadId = -1;
								this.y -= 32;
								isKeyDown = true;
							} else if (fieldArray[9][col].color != -1) {
								// empty pad, so we load the tile
								this.y += 32;
								padLoadId = Crafty.e("tile")
									.tile(this.x, this.y-32, fieldArray[9][col].color);
								dropColumn(col);
								drawField();
								isKeyDown = true;
							}
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
	drawField();
	var gastroCounter = new Array();
	
	// we trigger that new event every X ms, first we drop all the tiles, then we draw the new field
	window.setInterval(function () {dropTiles(); drawField();}, 500);
	// we add a new gastro every second
	window.setInterval(function () {fieldArray[0][Crafty.math.randomInt(0,3)].color = Crafty.math.randomInt(0,3);}, 1000);
	// fieldArray[0][Crafty.math.randomInt(0,3)].color = Crafty.math.randomInt(0,3);
});

Crafty.scene("main");