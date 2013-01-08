var winWidth = 600;
var winHeight = 450;

Crafty.init(winWidth,winHeight);
Crafty.background('lightgrey');

// ************************************************************************************
//
// 										TODO
//		Mettre à jour le score de façon progressive, pour bien montrer qu'on gagne des points (10 par 10 toutes les 20ms par exemple)
//
// ************************************************************************************


Crafty.scene("menu", function () {

	Crafty.e("HTML, Mouse")
		.attr({x:200, y:20, w:100, h:20})
		.replace("<p class='menuButton' onClick='Crafty.scene(\"main\");'>play</p>")
		// .bind("Click", function (e) {
			// Crafty.scene("main");
		// })
	;
});

Crafty.scene("main", function () {

	var DEBUG_MODE = false;
	var PAUSE_MODE = false;
	var fieldArray = new Array(); // contains the field with the tiles
	var fieldWidth = 6, fieldHeight = 12; // width and height of the field, in number of tiles
	var offsetTop = 10, offsetLeft = 10; // how many pixels away from the left and top borders of the scene
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
	
	var currentLevel = 1;
	var currentScore = 0;
	// var levelCaps = [500, 1500, 3000, 10000, 30000, 60000, 100000]; // how many points to go to next level
	var levelCaps = [60, 150, 300, 500, 600, 700, 800, 900]; // how many points to go to next level
	var intervalBetweenUpdates = 1000; // the number of ms between each update of the scene
	var newLevelUpdateIntervalDecrease = 100; // each level, we decrease the interval between updates by this nummber of ms
	var numberOfColors = 3; // the number of authorized colors, max is colorsArray.length

	var tileWidth = 52, tileHeight = 32;
	Crafty.sprite("assets/tile.png", {sprTile:[0,0,tileWidth,tileHeight]});
	Crafty.sprite("assets/pad.png", {sprPad:[0,0,tileWidth,tileHeight]});
	
	var comboCounter = 0; // Counts the number of simultaneous matches we did
	var checkXEnded = false, checkYEnded = false; // used to know if we have finished checking for matches on X and Y
	var comboText; // will contain the entity printing the current combo
	
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
								.tile(col*tileWidth+offsetLeft, line*tileHeight+offsetTop, f.color);
							f.moving = 1;
						}
					} else {
						f.id = Crafty.e("tile")
							.tile(col*tileWidth+offsetLeft, line*tileHeight+offsetTop, f.color);
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
			PAUSE_MODE = true;
			// window.clearInterval(moveTilesId);
			// window.clearInterval(addTilesId);
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
						.attr({ x:(col*tileWidth)+1+offsetLeft, y:(line*tileHeight)+10+offsetTop, w:85 })
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
				}
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
		// pos is an {x, y} object indicating where the score animation should take place
		// var s = scoreText.text();
		// for (var i = 10; i <= toAdd; i+=10) {
			// var t = s+(i*comboCounter)
			// window.setTimeout(function () {
				// scoreText.text(t);
			// }, i*20);
		// }
		currentScore += (toAdd*comboCounter);
		scoreText.text(currentScore);
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
		
		comboCheck(comboCounter); // we display combo if it is needed
		// console.log("Won",toAdd,"points");
	}
	
	function comboCheck(comboCounterLocal) {
		if (comboCounterLocal < -1) {
			//when combo counter < 0, it means one of the checks (X or Y) ended, e check if both ended and destroy the combo text after some ms
			if (checkXEnded === true && checkYEnded === true)
				window.setTimeout(function () {
					console.log("DESTROy", comboCounterLocal);
					comboText.destroy();
					comboText[0] = -1;
				}, (comboCounterLocal*-500));			
		} else if (comboCounterLocal > 1) {
			if (typeof comboText === 'undefined') {
				comboText = Crafty.e("DOM, Text")
					.attr({x: ((fieldWidth*tileWidth)/2 - (4.15 * comboCounterLocal*20)/2), y: ((fieldHeight*tileHeight)/2) - (comboCounterLocal*10), nbSteps:50, z:10})
					.text(comboCounterLocal+"x COMBO!")
					.css({
						'font-size':(comboCounterLocal*20)+'px', 
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
						if (this.nbSteps-- > 0) this.y -= 0.7;
					})								
				;
			} else {
				if (comboText[0] === -1) {
					// if this is not our first combo, we still have to create an entity
					comboText = Crafty.e("DOM, Text")
						.attr({x: ((fieldWidth*tileWidth)/2 - (4.15 * comboCounterLocal*20)/2), y: ((fieldHeight*tileHeight)/2) - (comboCounterLocal*10), nbSteps:50, z:10})
						.text(comboCounterLocal+"x COMBO!")
						.css({
							'font-size':(comboCounterLocal*20)+'px', 
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
							if (this.nbSteps-- > 0) this.y -= 0.7;
						})								
					;
				} else {
				// there's aready a combo in progress, we just update it
					window.setTimeout(function () {
						// console.log(comboCounterLocal, Date.now());
						comboText.nbSteps = 50;
						comboText.x = ((fieldWidth*tileWidth)/2 - (4.15 * comboCounterLocal*20)/2);
						comboText.y = ((fieldHeight*tileHeight)/2) - (comboCounterLocal*10);
						comboText.text(comboCounterLocal+"x COMBO!");
						comboText.css({'font-size':(comboCounterLocal*20)+'px'});
					}, (comboCounterLocal*200));
				}
			}
		}
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
								// console.log("Trouvé horiz !", x, y, amount);
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
										// console.log("Fini x!");
										checkXEnded = true;
										comboCheck(comboCounter*-1); // when we pass a negative value, just checks if combo ended
									}
								}
							} else if (x < (fieldWidth-3)) {
								checkBoard(fieldArray[y][x+1].color, x+1, y, "x", 1);
							} else {
								// we test the next line
								if (y < (fieldHeight-1)) {
									checkBoard(fieldArray[y+1][0].color, 0, y+1, "x", 1);
								} else {
									// console.log("Fini x!");
									checkXEnded = true;
									comboCheck(comboCounter*-1); // when we pass a negative value, just checks if combo ended
								}
							}
						} else {
							if (amount > 2) {
								// console.log("Trouvé horiz !", x, y, amount);
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
								// console.log("Fini x!");
								checkXEnded = true;
								comboCheck(comboCounter*-1); // when we pass a negative value, just checks if combo ended
							}
						}
					} else {
						// console.log("Fini x!");
						checkXEnded = true;
						comboCheck(comboCounter*-1); // when we pass a negative value, just checks if combo ended
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
								// console.log("Trouvé vert !", x, y, amount);
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
										// console.log("Fini y!");
										checkYEnded = true;
										comboCheck(comboCounter*-1); // when we pass a negative value, just checks if combo ended
									}
								}
							} else if (y < (fieldHeight-3)) {
								checkBoard(fieldArray[y+1][x].color, x, y+1, "y", 1);
							} else {
								// we test the next column
									if (x < (fieldWidth-1)) {
										checkBoard(fieldArray[0][x+1].color, x+1, 0, "y", 1);
								} else {
									// console.log("Fini y!");
									checkYEnded = true;
									comboCheck(comboCounter*-1); // when we pass a negative value, just checks if combo ended
								}
							}
						} else {
							if (amount > 2) {
								// console.log("Trouvé vert !", x, y, amount);
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
								// console.log("Fini y!");
								checkYEnded = true;
								comboCheck(comboCounter*-1); // when we pass a negative value, just checks if combo ended
							}
						}
					} else {
						// console.log("Fini y!");
						checkYEnded = true;
						comboCheck(comboCounter*-1); // when we pass a negative value, just checks if combo ended
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
				.attr({ x:0+offsetLeft, y:((fieldHeight*tileHeight) + 4 + offsetTop) })
				.bind('KeyDown', function(e) {
					if(e.key == Crafty.keys['LEFT_ARROW']) {
						if (this.x - tileWidth >= offsetLeft) {
							this.x -= tileWidth;
							if (padLoadId != -1)
								Crafty(padLoadId).
									attr({x:this.x, y:(this.y-tileHeight) });
						}
					} else if (e.key == Crafty.keys['RIGHT_ARROW']) {
						if (this.x + tileWidth <= (tileWidth*(fieldWidth-1)+offsetLeft)) {
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
	
	// Crafty.e("2D, DOM, Color")
		// .attr({x: 0+offsetLeft, y: tileHeight+offsetTop, w: (fieldWidth*tileWidth), h: 2 })
		// .color("gray");
		
	Crafty.e("2D, DOM, Color")
		.attr({x: 0+offsetLeft, y: (fieldHeight*tileHeight)+offsetTop, w: (fieldWidth*tileWidth), h: 4 })
		.color("black");
	Crafty.e("pad");
	
	Crafty.e("2D, DOM, Text")
		.attr({ x:450, y:32 })
		.css({
			'font-size':'20px', 
			'font-weight':'bold', 
			'font-family':'Arial, sans-serif', 
			'color': '#000',
			// '-webkit-text-stroke': '1px white',
			'text-shadow': '-2px 2px 2px #fff'
		})
		.text("Score")
	;
	var scoreText = Crafty.e("2D, DOM, Text")
						.attr({ x:450, y:50 })
						.css({
							'font-size':'20px', 
							'font-weight':'bold', 
							'font-family':'Arial, sans-serif', 
							'color': '#190adb',
							// '-webkit-text-stroke': '1px white',
							'text-shadow': '-2px 2px 2px #fff'
						})
						.text(currentScore)
					;
					
	Crafty.e("2D, DOM, Text")
		.attr({ x:450, y:92 })
		.css({
			'font-size':'20px', 
			'font-weight':'bold', 
			'font-family':'Arial, sans-serif', 
			'color': '#000',
			// '-webkit-text-stroke': '1px white',
			'text-shadow': '-2px 2px 2px #fff'
		})
		.text("Level")
	;
	var levelText = Crafty.e("2D, DOM, Text")
						.attr({ x:450, y:112 })
						.css({
							'font-size':'20px', 
							'font-weight':'bold', 
							'font-family':'Arial, sans-serif', 
							'color': '#190adb',
							// '-webkit-text-stroke': '1px white',
							'text-shadow': '-2px 2px 2px #fff'
						})
						.text(currentLevel)
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
	// comboCheck();
	console.log(comboCounter); */
	
	var no_play = 0;
	var moveTilesId = 0, addTilesId = 0;
	var tick = 1;
	
	function gameLoop () {
		moveTilesId = window.setInterval(function () {
			if (!PAUSE_MODE) {
				// we add two tiles every 3 ticks
				if (tick++ >= 3) {
					var authorizedColumns = new Array();
					for (var i=0; i<fullColumns.length; i++) 
						if (fullColumns[i] == 0) authorizedColumns.push(i);
					
					if (authorizedColumns.length > 0) {
						// if the game is not over!
						var rColumn = Crafty.math.randomElementOfArray(authorizedColumns);
						fieldArray[0][rColumn].color = Crafty.math.randomInt(0,numberOfColors-1);
						fieldArray[0][rColumn].moving = 1;
						if (authorizedColumns.length > 1) {
							do {
								var rColumn2 = Crafty.math.randomElementOfArray(authorizedColumns);
							} while (rColumn2 === rColumn);
							fieldArray[0][rColumn2].color = Crafty.math.randomInt(0,numberOfColors-1);
							fieldArray[0][rColumn2].moving = 1;
							// console.log(authorizedColumns, rColumn, rColumn2);
						}
					}
					tick = 1; //reset of the counter
				}
				checkXEnded = false; checkYEnded = false; 
				comboCounter = 0;
				if (currentLevel < levelCaps.length) {
					if (currentScore >= levelCaps[currentLevel-1]) {
						// level change
						currentLevel++;
						levelText.text(currentLevel);
						intervalBetweenUpdates -= newLevelUpdateIntervalDecrease;
						// intervalBetweenTiles -= newLevelTilesIntervalDecrease;
						if (numberOfColors < colorsArray.length) numberOfColors++; //we add one possible color to the mix
						window.clearInterval(moveTilesId);
						// window.clearInterval(addTilesId);
						gameLoop();
					}
				}
			}
			if (!PAUSE_MODE) checkMoving();
			if (!PAUSE_MODE) checkBoard();
			if (!PAUSE_MODE) blinkMatches();
			if (!PAUSE_MODE) dropTiles();
			if (!PAUSE_MODE) drawField();
		}, intervalBetweenUpdates);
	}
	
	if (!no_play) {
		//the first time, we have to whole field for us !
		
		var rColumn = Crafty.math.randomInt(0, fieldWidth-1);
		fieldArray[0][rColumn].color = Crafty.math.randomInt(0,numberOfColors-1);
		fieldArray[0][rColumn].moving = 1;
		do {
			var rColumn2 = Crafty.math.randomInt(0, fieldWidth-1);
		} while (rColumn2 === rColumn);
		fieldArray[0][rColumn2].color = Crafty.math.randomInt(0,numberOfColors-1);
		fieldArray[0][rColumn2].moving = 1;
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