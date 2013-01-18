var winWidth = 600;
var winHeight = 500;

// Load the Kongregate API
var kongregate;
kongregateAPI.loadAPI(onComplete);

// Callback function
function onComplete(){
	// Set the global kongregate API object
	kongregate = kongregateAPI.getAPI();
	kongregate.stats.submit("test",360);
}
Crafty.init(winWidth,winHeight);
Crafty.background('lightgrey');

Crafty.scene("game", function () {

	// ************************************************************************************
	//
	// 										TODO
	//		Mettre à jour le score de façon progressive, pour bien montrer qu'on gagne des points (10 par 10 toutes les 20ms par exemple)
	//
	// ************************************************************************************

	var DEBUG_MODE = false;
	var PAUSE_MODE = false;
	var LOADED = false;
	var MENU_MODE = true; // when we display the menu, true by default

	var fieldArray = new Array(); // contains the field with the tiles
	var fieldWidth, fieldHeight; // width and height of the field, in number of tiles
	var offsetTop = 10, offsetLeft = 10; // how many pixels away from the left and top borders of the scene

	var fullColumns = new Array(); 

	var moveTilesId = -1; // ID of the setInterval used for the game

	var animTutoIntervalLeft = -1, animTutoIntervalRight = -1, animTutoIntervalDown = -1;

	var currentLevel = 1,
		levelText;
	var currentScore = 0,
		scoreText;
	
	// The original values for the difficulty setting, can be changed via the menu
	var SET_intervalBetweenUpdates = 500,
		SET_numberOfColors = 3,
		SET_linesStart = 2,
		SET_difficulty = "normal";
	
	// var levelCaps = [60, 150, 300, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300]; // how many points to go to next level
	var levelCaps = [500, 1000, 2000, 3500, 5000, 7000, 8000, 9000, 10000, 11000, 12000, 13000]; // how many points to go to next level
	var intervalBetweenUpdates = SET_intervalBetweenUpdates; // the number of ms between each update of the scene
	var newLevelUpdateIntervalDecrease = 50; // each level, we decrease the interval between updates by this nummber of ms
	// var newLevelUpdateIntervalDecrease = 800; // each level, we decrease the interval between updates by this nummber of ms
	var numberOfColors = SET_numberOfColors; // the number of authorized colors, max is maxNumberOfColors
	var maxNumberOfColors = 6; // the maximum number of colors
	var linesStart = SET_linesStart; // the number of lines full of minerals at the start
	
	var winnings = new Array();
	
	for (var i = 0; i < maxNumberOfColors; i++) {
		winnings.push({'color':i, 'number':0, 'earnings':0});
	}

	var tileWidth = 52, tileHeight = 32;
	Crafty.sprite("assets/tiles.png", {
		sprTile0:[0,0,tileWidth,tileHeight],
		sprTile6:[52,0,tileWidth,tileHeight],
		sprTile2:[52*2,0,tileWidth,tileHeight],
		sprTile3:[52*3,0,tileWidth,tileHeight],
		sprTile4:[52*4,0,tileWidth,tileHeight],
		sprTile5:[52*5,0,tileWidth,tileHeight],
		sprTile1:[52*6,0,tileWidth,tileHeight],
		sprPad:[52*7,0,tileWidth,tileHeight]
	});
	
	Crafty.sprite(256, "assets/background.png", { sprBackground:[0,0] });
	Crafty.sprite(64, "assets/soil.png", { sprSoil:[0,0] });
	Crafty.sprite("assets/Title.png", { sprTitle:[0,0,256,128] });

	var comboCounter = 0; // Counts the number of simultaneous matches we did
	var checkXEnded = false, checkYEnded = false; // used to know if we have finished checking for matches on X and Y
	var comboText; // will contain the entity printing the current combo

	function initGame (w, h) {
		PAUSE_MODE = false;
		if (moveTilesId !== -1)
			window.clearInterval(moveTilesId);
		fieldWidth = w; fieldHeight = h; // width and height of the field, in number of tiles
		fieldArray = new Array();
		for (var i=0; i<fieldHeight; i++) {
			fieldArray[i] = new Array();
			for (var j=0; j<fieldWidth; j++)
				// each tile has a color (between 0 and 3), an id (the id of the Crafty entity),
				// and a prorpiety indicating if the tile is moving or not (not moving = touching another tile)
				fieldArray[i][j] = { "color": -1, "id": -1, "moving": 1 };
		}
		fullColumns = new Array();
		for (var j=0; j<fieldWidth; j++) // all the columns are empty when we start
			fullColumns[j] = 0;
		currentLevel = 1;
		currentScore = 0;
		intervalBetweenUpdates = SET_intervalBetweenUpdates; // the number of ms between each update of the scene
		numberOfColors = SET_numberOfColors; // the number of authorized colors
		linesStart = SET_linesStart; // the number of lines full of minerals at the start
	}

	function drawButton(x,y,w,h,text,action,z,textsize) {
		// x,y,w and h are the position, width and height
		// text is the text printed in the button
		// action is what happens when you click
		// z is the z-index of the button
		// textsize is the size of the text
		
		if (typeof textsize === 'undefined') textsize = 30;
		
		Crafty.e("2D, DOM, Color")
			.attr({ x: x, y: y, w: w, h: h, z:z })
			.color("black")
		;
		Crafty.e("2D, DOM, Mouse, Color")
			.attr({ x: x+2, y: y+2, w: w-4, h: h-4, z:z+1 })
			.color("#900")
			.css({'cursor': 'hand'})
			.bind("MouseOver", function (e) {
				this.color("#B00");
			})
			.bind("MouseOut", function (e) {
				this.color("#900");
			})
			.bind("Click", function (e) {
				action();
			})
		;
		Crafty.e("2D, DOM, Text")
			.attr({ x:x, y:y, w: w, h:h, z:z+2 })
			.css({
				'font-size':textsize+'px', 
				'font-weight':'bold',
				'text-align':'center',
				'font-family':'PaperCut, Arial, sans-serif', 
				'color': '#fff'
			})
			.css({'cursor': 'hand'})
			.text(text)
		;
	}
	
	function pauseScreen() {
		Crafty.e("2D, DOM, Color, Mouse")
			.attr({ x: 0, y: 0, w: winWidth, h: winHeight, alpha: 0.7, z: 5 })
			.color("black")
			.bind("Click", function (e) {
				PAUSE_MODE = !PAUSE_MODE;
				this.destroy();
				textPause.destroy();
			})
			.bind('KeyDown', function(e) {
				if(e.key == Crafty.keys['S'] || e.key == Crafty.keys['ESC']) {
					PAUSE_MODE = !PAUSE_MODE;
					this.destroy();
					textPause.destroy();
				}
			})
		;
		var textPause = Crafty.e("2D, DOM, Text")
			.attr({ x:0, y:150, w: winWidth, h:400, z:6 })
			.css({
				'font-size':'30px', 
				'font-weight':'bold',
				'text-align':'center',
				'font-family':'PaperCut, Arial, sans-serif', 
				'color': '#fff',
				// '-webkit-text-stroke': '1px white',
				// 'text-shadow': '-2px 2px 2px #fff'
			})
			.text("PAUSE<br />Press the Esc key or click anywhere to resume play")
		;
	}
	
	function coolTuto() {
		if (animTutoIntervalLeft !== -1) {
			console.log("efface");
			window.clearInterval(animTutoIntervalLeft);
			window.clearInterval(animTutoIntervalRight);
			window.clearInterval(animTutoIntervalDown);
		}
		
		Crafty.e("2D, DOM, Color")
			.attr({ x: 150, y: 300, w: 32, h: 32 })
			.color("red")
			.bind("AnimTutoClearLR", function () {
				if (this.color() === "darkred") this.color("red");
			})
			.bind("AnimTutoLeft", function () {
				this.color((this.color() === "red")?"darkred":"red");
			})
		;
		
		Crafty.e("2D, DOM, Color")
			.attr({ x: 182, y: 300, w: 32, h: 32 })
			.color("red")
			.bind("AnimTutoClearLR", function () {
				if (this.color() === "darkred") this.color("red");
			})
			.bind("AnimTutoRight", function () {
				this.color((this.color() === "red")?"darkred":"red");
			})
		;
		
		Crafty.e("2D, DOM, sprPad")
			.attr({ x: 160, y: 250 })
			.bind("AnimTutoRight", function () {
				this.x = 180;
			})
			.bind("AnimTutoLeft", function () {
				this.x = 130;
			})
		;
		
		Crafty.e("2D, DOM, Color")
			.attr({ x: 350, y: 284, w: 32, h: 32 })
			.color("red")
			.bind("AnimTutoClearDU", function () {
				if (this.color() === "darkred") this.color("red");
			})
			.bind("AnimTutoUp", function () {
				this.color((this.color() === "red")?"darkred":"red");
			})
		;
		
		Crafty.e("2D, DOM, Color")
			.attr({ x: 350, y: 316, w: 32, h: 32 })
			.color("red")
			.bind("AnimTutoClearDU", function () {
				if (this.color() === "darkred") this.color("red");
			})
			.bind("AnimTutoDown", function () {
				this.color((this.color() === "red")?"darkred":"red");
			})
		;
		
		var posPad = 0;
		var t1, t2;
		Crafty.e("2D, DOM, sprPad")
			.attr({ x: 400, y: 250 })
			.bind("AnimTutoDown", function () {
				this.y += 30;
				if (posPad === 0) {
					t1 = Crafty.e("2D, DOM, sprTile1")
							.attr({ x: 400, y: this.y - 32});
					posPad++;
				} else {
					t1.y += 30;
					t2 = Crafty.e("2D, DOM, sprTile2")
							.attr({ x: 400, y: this.y - 64});
				}
			})
			.bind("AnimTutoUp", function () {
				this.y = 250;
				t1.destroy();
				t2.destroy();
				posPad = 0;
			})
		;
		
		Crafty.addEvent(this, window.document, "AnimTutoClearLR", null); // clear Left and Right
		Crafty.addEvent(this, window.document, "AnimTutoClearDU", null); // clear Down and Up
		Crafty.addEvent(this, window.document, "AnimTutoLeft", null);
		Crafty.addEvent(this, window.document, "AnimTutoRight", null);
		Crafty.addEvent(this, window.document, "AnimTutoDown", null);
		Crafty.addEvent(this, window.document, "AnimTutoUp", null);
		
		animTutoIntervalLeft = window.setInterval(function () { 
			Crafty.trigger("AnimTutoLeft");
			window.setTimeout(function () {Crafty.trigger("AnimTutoClearLR"); }, 200);
		}, 1500);
		window.setTimeout(function () {
			animTutoIntervalRight = window.setInterval(function () { 
				Crafty.trigger("AnimTutoRight"); 
				window.setTimeout(function () {Crafty.trigger("AnimTutoClearLR"); }, 200);
			}, 1500);
		}, 750);
		
		Crafty.trigger("AnimTutoDown");
		window.setTimeout(function () {Crafty.trigger("AnimTutoClearDU"); }, 200);
		window.setTimeout(function () {Crafty.trigger("AnimTutoDown"); }, 1200);
		window.setTimeout(function () {Crafty.trigger("AnimTutoClearDU"); }, 1400);
		window.setTimeout(function () {Crafty.trigger("AnimTutoUp"); }, 2400);
		window.setTimeout(function () {Crafty.trigger("AnimTutoClearDU"); }, 2600);
		animTutoIntervalDown = window.setInterval(function () { 
			Crafty.trigger("AnimTutoDown");
			window.setTimeout(function () {Crafty.trigger("AnimTutoClearDU"); }, 200);
			window.setTimeout(function () {Crafty.trigger("AnimTutoDown"); }, 1200);
			window.setTimeout(function () {Crafty.trigger("AnimTutoClearDU"); }, 1400);
			window.setTimeout(function () {Crafty.trigger("AnimTutoUp"); }, 2400);
			window.setTimeout(function () {Crafty.trigger("AnimTutoClearDU"); }, 2600);
		}, 4000);
	}

	function drawField() {
		// we redraw all the tiles if they have changed
		// New_Pos = Old_Pos + (New_Pos - Old_Pos) * (DT / (DT + Damp))
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
			window.clearInterval(moveTilesId);
			if (MENU_MODE) {
				// Crafty.scene("menu");
			} else {
				PAUSE_MODE = true;
				Crafty.e("2D, DOM, Color, Mouse")
					.attr({ x: 0, y: 0, w: winWidth, h: winHeight, alpha: 0.8, z:10 })
					.color("black")
				;
				
				Crafty.e("2D, DOM, Text")
					.attr({ x:0, y:50, w: winWidth, h:400, z:11 })
					.css({
						'font-size':'30px', 
						'font-weight':'bold',
						'text-align':'center',
						'font-family':'PaperCut, Arial, sans-serif', 
						'color': '#fff',
					})
					.text("You win $"+currentScore+"!<br />But you can do better...<br />Click try again if you dare!")
				;

				drawButton(200, 250, 200, 50, "Try again", function () {Crafty.scene("main");}, 11);
			}
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

	function updateScore(toAdd, pos, color) {
		// updates the current score by toAdd
		// pos is an {x, y} object indicating where the score animation should take place
		// var s = scoreText.text();
		// for (var i = 10; i <= toAdd; i+=10) {
			// var t = s+(i*comboCounter)
			// window.setTimeout(function () {
				// scoreText.text(t);
			// }, i*20);
		// }
		if (!MENU_MODE) {
			// we only count the score when we play
			if (color !== 0) { 
				// the dirt doesn't give you any score !
				currentScore += (toAdd*comboCounter);
				scoreText.text("$"+currentScore);
				// console.log(pos);
				// a litte animation to show the score gained
				var nbSteps = 50;
				// if (pos.y + (toAdd*comboCounter) > winHeight) pos.y = winHeight - (toAdd*comboCounter) - 10;
				Crafty.e("DOM, Text")
					// .attr({x: pos.x, y: pos.y})
					.attr({x: Crafty("sprPad").x, y: Crafty("sprPad").y})
					.text(toAdd*comboCounter)
					.css({
						'font-size':(toAdd*comboCounter)+'px', 
						'font-weight':'bold', 
						'font-family':'PaperCut, Arial, sans-serif', 
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
			
				winnings[color].earnings += toAdd*comboCounter;
				winnings.forEach(function (e) {console.log(e);});
				comboCheck(comboCounter); // we display combo if it is needed
				// console.log("Won",toAdd,"points");
			} else {
				Crafty.audio.play("stone");
			}
		}
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
						'font-family':'PaperCut, Arial, sans-serif', 
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
							'font-family':'PaperCut, Arial, sans-serif', 
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
								if (color !== 0) comboCounter++; // dirt doesn't add to the combo counter
								updateScore(10*amount, {x: (x-Math.ceil(amount/2)+1)*tileWidth, y: y*tileHeight}, color);
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
										if (!MENU_MODE) comboCheck(comboCounter*-1); // when we pass a negative value, just checks if combo ended
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
									if (!MENU_MODE) comboCheck(comboCounter*-1); // when we pass a negative value, just checks if combo ended
								}
							}
						} else {
							if (amount > 2) {
								// console.log("Trouvé horiz !", x, y, amount);
								if (color !== 0) comboCounter++; // dirt doesn't add to the combo counter
								updateScore(10*amount, {x: (x-Math.ceil(amount/2)+1)*tileWidth, y: y*tileHeight}, color);
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
								if (!MENU_MODE) comboCheck(comboCounter*-1); // when we pass a negative value, just checks if combo ended
							}
						}
					} else {
						// console.log("Fini x!");
						checkXEnded = true;
						if (!MENU_MODE) comboCheck(comboCounter*-1); // when we pass a negative value, just checks if combo ended
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
								if (color !== 0) comboCounter++; // dirt doesn't add to the combo counter
								updateScore(10*amount, {x: x*tileWidth, y: (y-Math.ceil(amount/2)+1)*tileHeight }, color);
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
										if (!MENU_MODE) comboCheck(comboCounter*-1); // when we pass a negative value, just checks if combo ended
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
									if (!MENU_MODE) comboCheck(comboCounter*-1); // when we pass a negative value, just checks if combo ended
								}
							}
						} else {
							if (amount > 2) {
								// console.log("Trouvé vert !", x, y, amount);
								if (color !== 0) comboCounter++; // dirt doesn't add to the combo counter
								updateScore(10*amount, {x: x*tileWidth, y: (y-Math.ceil(amount/2)+1)*tileHeight }, color);
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
								if (!MENU_MODE) comboCheck(comboCounter*-1); // when we pass a negative value, just checks if combo ended
							}
						}
					} else {
						// console.log("Fini y!");
						checkYEnded = true;
						if (!MENU_MODE) comboCheck(comboCounter*-1); // when we pass a negative value, just checks if combo ended
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
					Crafty(fieldArray[e.x][e.y].id).alpha = 1;
				}, 100);
				window.setTimeout(function () {
					Crafty(fieldArray[e.x][e.y].id).alpha = 0.1;
				}, 150);
				window.setTimeout(function () {
					Crafty(fieldArray[e.x][e.y].id).alpha = 1;
				}, 180);
				window.setTimeout(function () {
					// let's not forget to clear the tile afterwards...
					if (Crafty(fieldArray[e.x][e.y].id).color !== 0) {
						Crafty.e("2D, Canvas, sprTile"+Crafty(fieldArray[e.x][e.y].id).color)
							.attr({ x: e.y*tileWidth, y: e.x*tileHeight, color: Crafty(fieldArray[e.x][e.y].id).color })
							.bind("EnterFrame", function () {
								var speed = 7;
								var dx = Crafty("sprPad").x - this.x;
								var dy = Crafty("sprPad").y - this.y;
								var n = Math.sqrt((dx*dx)+(dy*dy));
								if (n>speed) {
									dx *= (speed/n);
									dy *= (speed/n);
									this.x += dx; this.y += dy;
								} else {
									this.destroy();
								}
							})
						;
					}
					fieldArray[e.x][e.y].color = -1;
				}, 190);
			});
		}
	}

	function shakeColumn (col) {
		// shakes the column to show it's full
		var origPosArray = new Array();
		for (var i = 0; i < fieldHeight; i++)
			origPosArray[i] = { 'x': col*tileWidth+offsetLeft, 'y': i*tileHeight+offsetTop };
			
		
		for (var n=40; n<240; n+=20) {
			window.setTimeout(function () {
				for (var i = 0; i < fieldHeight; i++) {
					Crafty(fieldArray[i][col].id).x = (origPosArray[i].x)+Crafty.math.randomInt(-5,5);
					Crafty(fieldArray[i][col].id).y = (origPosArray[i].y)+Crafty.math.randomInt(-2,2);
				}
			}, n);
		}
		window.setTimeout(function () {
			for (var i = 0; i < fieldHeight; i++) {
				Crafty(fieldArray[i][col].id).x = origPosArray[i].x;
				Crafty(fieldArray[i][col].id).y = origPosArray[i].y;
			}
		}, 300);
		
	}
	
	Crafty.c("tile", {
		init: function () {},
		tile: function (xTile, yTile, colorTile) { // colorTile is a number between 0 and maxNumberOfColors
			var tileId = Crafty.e("2D, Canvas, Tween, sprTile"+colorTile)
				.attr({ x: xTile, y: yTile, color: colorTile })
			;
			return tileId[0];
		}
	});

	Crafty.c("bgBackground", {
		init: function () {
			var bgSize = 256;
			for (var i=0; i<winWidth; i+=bgSize)
				for (var j=0; j<winHeight; j+=bgSize)
					Crafty.e("2D, Canvas, sprBackground")
						.attr({ x:i, y:j, z:0 });
		}
	});
		

	Crafty.scene("menu", function () {
		
		MENU_MODE = true;
		
		if (!LOADED) {
			Crafty.e("2D, DOM, Color")
				.attr({ x: 248, y: winHeight - 100 - 2, w: winWidth - 250 - 50, h: 64, z:1 })
				.color("black")
			;
			var progressBar = Crafty.e("2D, DOM, Mouse, Color")
				.attr({ x: 250, y: winHeight - 100, w: 0, h: 60, z:2 })
				.color("#900")
				.css({'cursor': 'hand'})
				.bind("MouseOver", function (e) {
					this.color("#B00");
				})
				.bind("MouseOut", function (e) {
					this.color("#900");
				})
				.bind("Click", function (e) {
					Crafty.scene("main");
				})
			;
			var loadText = Crafty.e("2D, DOM, Text")
				.attr({ x:250, y:winHeight - 95, w: winWidth-250-50, h:40, z:3 })
				.css({
					'font-size':'40px', 
					'font-weight':'bold',
					'text-align':'center',
					'font-family':'PaperCut, Arial, sans-serif', 
					'color': '#fff'
				})
				.css({'cursor': 'hand'})
				.text("Loading")
			;
			
			Crafty.support.audio = true;
			Crafty.audio.supported["mp3"] = true;
			Crafty.audio.supported["ogg"] = true;
			Crafty.audio.supported["wav"] = true;
			Crafty.load([
					"assets/Title.png", 
					"assets/tiles.png", 
					"assets/soil.png", 
					"assets/background.png", 
					"assets/stone.mp3", 
					"assets/stone.ogg", 
					"assets/stone.wav"
				],
				function() {
					//when loaded
					// console.log(Crafty.assets);
					LOADED = true;
					// Crafty.scene("main"); //go to the menu
					
					loadText.text("PLAY");
					
					initGame(11,15);
					
					Crafty.e("bgBackground");
					
					// for (var i=0; i<fieldHeight; i++) {
						// for (var j=0; j<fieldWidth; j++)
							// fieldArray[i][j] = { "color": Crafty.math.randomInt(0,5), "id": -1 };
					// }
					// drawField();
					
					// Crafty.e("2D, DOM, Color")
						// .attr({x: 0, y: 0, w: winWidth, h: winHeight, alpha: 0.8 })
						// .color("black");
					
					Crafty.e("2D, DOM, sprTitle")
						.attr({ x:(winWidth-256)/2, y: 20 })
					;
					
					Crafty.e("2D, DOM, Text")
						.attr({ x:0, y:170, w: winWidth, h:400 })
						.css({
							'font-size':'22px', 
							'font-weight':'bold',
							'text-align':'center',
							'font-family':'PaperCut, Arial, sans-serif', 
							'color': '#fff',
						})
						.text("You’re Mat, you drive a cool truck and you need money to travel... Go mining!")
					;
					
					coolTuto();
					drawButton(50, winHeight - 102, 180, 64, "Difficulty:<br />"+SET_difficulty, function () {
						Crafty.scene("settings");
					}, 3, 20);
				},

				function(e) {
					// console.log(e.loaded, e.total, e.percent ,e.src);
					
					progressBar.w = (e.percent * (winWidth - 250 - 50 - 4)/100);
					loadText.text("Loading "+e.loaded+"/"+e.total);
				},

				function(e) {
					//uh oh, error loading
					console.log("err",e);
				}
			);
		} else {
			Crafty.e("2D, DOM, Color")
				.attr({ x: 248, y: winHeight - 100 - 2, w: winWidth - 248 - 48, h: 64, z:1 })
				.color("black")
			;
			var progressBar = Crafty.e("2D, DOM, Mouse, Color")
				.attr({ x: 250, y: winHeight - 100, w: winWidth - 250 - 50, h: 60, z:2 })
				.color("#900")
				.bind("MouseOver", function (e) {
					this.color("#B00");
				})
				.bind("MouseOut", function (e) {
					this.color("#900");
				})
				.css({'cursor': 'hand'})
				.bind("Click", function (e) {
					Crafty.scene("main");
				})
			;
			var loadText = Crafty.e("2D, DOM, Text")
				.attr({ x:250, y:winHeight - 95, w: winWidth - 250 - 50, h:40, z:3 })
				.css({
					'font-size':'40px', 
					'font-weight':'bold',
					'text-align':'center',
					'font-family':'PaperCut, Arial, sans-serif', 
					'color': '#fff'
				})
				.css({'cursor': 'hand'})
				.text("PLAY")
			;
			
			initGame(11,15);
			
			Crafty.e("bgBackground");
			
			// for (var i=0; i<fieldHeight; i++) {
				// for (var j=0; j<fieldWidth; j++)
					// fieldArray[i][j] = { "color": Crafty.math.randomInt(0,5), "id": -1 };
			// }
			// drawField();

				
			// Crafty.e("2D, DOM, Color")
				// .attr({x: 0, y: 0, w: winWidth, h: winHeight, alpha: 0.8 })
				// .color("black");
			
			Crafty.e("2D, DOM, sprTitle")
				.attr({ x:(winWidth-256)/2, y: 20 })
			;
			
			Crafty.e("2D, DOM, Text")
				.attr({ x:0, y:170, w: winWidth, h:400 })
				.css({
					'font-size':'22px', 
					'font-weight':'bold',
					'text-align':'center',
					'font-family':'PaperCut, Arial, sans-serif', 
					'color': '#fff',
				})
				.text("You’re Mat, you drive a cool truck and you need money to travel... Go mining!")
			;
			
			coolTuto();
			
			drawButton(50, winHeight - 102, 180, 64, "Difficulty:<br />"+SET_difficulty, function () {
				Crafty.scene("settings");
			}, 3, 20);
		}
		
	});

	Crafty.scene("main", function () {
		
		MENU_MODE = false;

		initGame(7, 12);
		
		Crafty.e("bgBackground");
		
		Crafty.audio.add("stone", [
			"assets/stone.mp3",
			"assets/stone.ogg",
			"assets/stone.wav"
			]);
		
		
		Crafty.c("pad", {
			init: function () {
				var padLoadId = new Array(); // the ID of the tiles on our pad, we begin with an empty pad
				Crafty.e("2D, Canvas, sprPad")
					.attr({ x:0+offsetLeft, y:((fieldHeight*tileHeight) + 4 + offsetTop) })
					.bind('KeyDown', function(e) {
						if(e.key == Crafty.keys['LEFT_ARROW']) {
							if (this.x - tileWidth >= offsetLeft) {
								this.x -= tileWidth;
								// we draw all the tiles
								for (var i=0; i < padLoadId.length; i++)
									Crafty(padLoadId[i]).attr({x:this.x, y:this.y-(tileHeight*(i+1)) });
							}
						} else if (e.key == Crafty.keys['RIGHT_ARROW']) {
							if (this.x + tileWidth <= (tileWidth*(fieldWidth-1)+offsetLeft)) {
								this.x += tileWidth;
								// we draw all the tiles
								for (var i=0; i < padLoadId.length; i++)
									Crafty(padLoadId[i]).attr({x:this.x, y:this.y-(tileHeight*(i+1)) });
							}
						} else if (e.key == Crafty.keys['DOWN_ARROW']) {
							// Loading the pad
							if (!PAUSE_MODE) {
								var col = Math.round(this.x/tileWidth);
								if (fieldArray[(fieldHeight-1)][col].color != -1) {
									if (padLoadId.length < 2) {
										// pad not full, we can load a tile
										this.y += tileHeight;
										if (padLoadId.length === 1) {
											// we already have on tile in the pad
											// we move the first tile
											Crafty(padLoadId[0]).attr({x:this.x, y:this.y-tileHeight});
											// and add the new one
											var newTile = Crafty.e("tile").tile(this.x, this.y-(tileHeight*2), fieldArray[(fieldHeight-1)][col].color);
										} else {
											// empty pad
											var newTile = Crafty.e("tile").tile(this.x, this.y-tileHeight, fieldArray[(fieldHeight-1)][col].color);
										}
										// console.log(this.x, this.y-tileHeight, fieldArray[(fieldHeight-1)][col].color);
										padLoadId.push(newTile);
										pullColumn(col);
										drawField();
									}
									// console.log(padLoadId);
								}
							}
						} else if (e.key == Crafty.keys['UP_ARROW']) {
							// Unloading the pad tile by tile
							/* if (!PAUSE_MODE) {
								var col = Math.round(this.x/tileWidth);
								if (padLoadId.length > 0) {
									// we unload the tile on the pad
									if (fullColumns[col] !== 1) {
										var currentTile = padLoadId.pop();
										pushColumn(col, Crafty(currentTile).color);
										drawField();
										Crafty(currentTile).destroy();
										this.y -= tileHeight;
										if (padLoadId.length === 1) Crafty(padLoadId[0]).attr({x:this.x, y:this.y-tileHeight});
									} else {
										console.log("Column full!");
									}
									// console.log(padLoadId);
								}
							} */
							
							// unloading the whole pad
							if (!PAUSE_MODE) {
								var col = Math.round(this.x/tileWidth);
								if (padLoadId.length > 0) {
									if (padLoadId.length === 1) {
										// just one tile on the pad
										if (fullColumns[col] !== 1) {
											var currentTile = padLoadId.pop();
											pushColumn(col, Crafty(currentTile).color);
											drawField();
											Crafty(currentTile).destroy();
											this.y -= tileHeight;
											if (padLoadId.length === 1) Crafty(padLoadId[0]).attr({x:this.x, y:this.y-tileHeight});
										} else {
											console.log("Column full!");
											shakeColumn(col);
										}
										// console.log(padLoadId);
									} else {
										// two tiles on the pad
										var sum = 0;
										for (var j=0; j<fieldHeight; j++)
											if (fieldArray[j][col].color !== -1)
												sum++;
										if (sum <= fieldHeight-2) {
											// we have room for two tiles
											for (var i=0; i<2; i++) {
												var currentTile = padLoadId.pop();
												pushColumn(col, Crafty(currentTile).color);
												Crafty(currentTile).destroy();
												this.y -= tileHeight;
											}
											drawField();
										} else {
											console.log("Column full!");
											shakeColumn(col);
										}
									}
								}
							}
						} else if (e.key == Crafty.keys['S'] || e.key == Crafty.keys['ESC']) {
							if (!PAUSE_MODE) {
								PAUSE_MODE = !PAUSE_MODE;
								pauseScreen();
							}
						}
					})
				;
			}
		});
		
		var bgSize = 64;
		for (var i=(fieldWidth*tileWidth)+(offsetLeft*2)-bgSize; i>-1*bgSize; i-=bgSize)
			for (var j=(fieldHeight*tileHeight)+offsetTop; j<winHeight; j+=bgSize)
				Crafty.e("2D, Canvas, sprSoil")
					.attr({ x:i, y:j });
		
		Crafty.e("pad");
		
		Crafty.e("2D, DOM, Text")
			.attr({ x:450, y:32, z:1 })
			.css({
				'font-size':'30px', 
				'font-weight':'bold', 
				'font-family':'PaperCut, Arial, sans-serif', 
				'color': '#fff',
				'text-shadow': '-2px 2px 2px #00f'
			})
			.text("Money")
		;
		scoreText = Crafty.e("2D, DOM, Text")
							.attr({ x:450, y:70, w: 150, z:1 })
							.css({
								'font-size':'30px', 
								'font-weight':'bold', 
								'font-family':'PaperCut, Arial, sans-serif', 
								'color': '#190adb',
								'text-shadow': '-2px 2px 2px #fff'
							})
							.text("$"+currentScore)
						;
						
		Crafty.e("2D, DOM, Text")
			.attr({ x:450, y:112, z:1 })
			.css({
				'font-size':'30px', 
				'font-weight':'bold', 
				'font-family':'PaperCut, Arial, sans-serif', 
				'color': '#fff',
				// '-webkit-text-stroke': '1px white',
				'text-shadow': '-2px 2px 2px #00f'
			})
			.text("Level")
		;
		levelText = Crafty.e("2D, DOM, Text")
							.attr({ x:450, y:142, z:1 })
							.css({
								'font-size':'30px', 
								'font-weight':'bold', 
								'font-family':'PaperCut, Arial, sans-serif', 
								'color': '#190adb',
								// '-webkit-text-stroke': '1px white',
								'text-shadow': '-2px 2px 2px #fff'
							})
							.text(currentLevel)
						;
		
		Crafty.e("2D, DOM, Color")
			.attr({ x: (fieldWidth*tileWidth)+(offsetLeft*2), y: 0, w: 300, h: winHeight, z:0, alpha: 0.7 })
			.color("black")
		;
		drawButton(400, 200, 180, 40, "PAUSE", function () {
			PAUSE_MODE = !PAUSE_MODE;
			pauseScreen();
		}, 2);
		drawButton(400, 250, 180, 40, "MENU", function () {
			Crafty.scene("menu");
		}, 2);
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
							if (numberOfColors < maxNumberOfColors) {
								// console.log("ajout coul");
								numberOfColors++; //we add one possible color to the mix
							} else if (intervalBetweenUpdates > 100) {
								// console.log("plus vite");
								intervalBetweenUpdates -= newLevelUpdateIntervalDecrease;
							}
							var nbSteps = 100;
							Crafty.e("DOM, Text")
								.attr({x: 0, y: ((fieldHeight*tileHeight)+offsetTop)/2, w: (fieldWidth*tileWidth)+offsetLeft, h: 100})
								.text("Level "+currentLevel)
								.css({
									'font-size':'70px', 
									'font-weight':'bold', 
									'font-family':'PaperCut, Arial, sans-serif', 
									'color': '#f6ff0e',
									'text-align': 'center',
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

							console.log(currentLevel, intervalBetweenUpdates);
							window.clearInterval(moveTilesId);
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
	
	Crafty.scene("settings", function () {
		Crafty.e("bgBackground");
		Crafty.e("2D, DOM, Text")
			.attr({ x:0, y:10, w: winWidth, z:1 })
			.css({
				'font-size':'30px', 
				'font-weight':'bold', 
				'font-family':'PaperCut, Arial, sans-serif', 
				'color': '#fff',
				'text-align': 'center',
				'text-shadow': '-2px 2px 2px #000'
			})
			.text("Difficulty")
		;
		
		drawButton(50,70,150,50,"Easy",function () {
			SET_difficulty = "easy";
			$( "#sliderColors" ).slider( "value", 2 );
			$( "#colors" ).text( "Starting colors: 2" );
			SET_numberOfColors = 2;
			$( "#sliderSpeed" ).slider( "value", 800 );
			$( "#speed" ).text( "Initial speed: 800" );
			SET_intervalBetweenUpdates = 800;
			$( "#sliderLines" ).slider( "value", 0 );
			$( "#lines" ).text( "Starting lines: 0" );
			SET_linesStart = 0;
		}, 1);
		drawButton(220,70,150,50,"Normal",function () {
			SET_difficulty = "normal";
			$( "#sliderColors" ).slider( "value", 3 );
			$( "#colors" ).text( "Starting colors: 3" );
			SET_numberOfColors = 3;
			$( "#sliderSpeed" ).slider( "value", 500 );
			$( "#speed" ).text( "Initial speed: 500" );
			SET_intervalBetweenUpdates = 500;
			$( "#sliderLines" ).slider( "value", 2 );
			$( "#lines" ).text( "Starting lines: 2" );
			SET_linesStart = 2
		}, 1);
		drawButton(390,70,150,50,"Hard",function () {
			SET_difficulty = "hard";
			$( "#sliderColors" ).slider( "value", 6 );
			$( "#colors" ).text( "Starting colors: 6" );
			SET_numberOfColors = 6;
			$( "#sliderSpeed" ).slider( "value", 300 );
			$( "#speed" ).text( "Initial speed: 300" );
			SET_intervalBetweenUpdates = 300;
			$( "#sliderLines" ).slider( "value", 5 );
			$( "#lines" ).text( "Starting lines: 5" );
			SET_linesStart = 5;
		}, 1);
		
		Crafty.e("HTML")
			.attr({x:20, y:150, w:300, h:20})
			.replace('<div id="colors" class="settings"></div>');
		
		Crafty.e("HTML")
			.attr({x:320, y:160, w:200, h:20})
			.replace('<div id="sliderColors"></div>');
		
		$(function() {
			$( "#sliderColors" ).slider({
				value:3,
				min: 2,
				max: 6,
				step: 1,
				slide: function( event, ui ) {
					$( "#colors" ).text( "Starting colors: "+ ui.value );
					SET_numberOfColors = ui.value;
					SET_difficulty = "custom";
				}
			});
			$( "#colors" ).text( "Starting colors: "+ $( "#sliderColors" ).slider( "value" ) );
		});
		
		Crafty.e("HTML")
			.attr({x:20, y:200, w:300, h:20})
			.replace('<div id="speed" class="settings"></div>');
		
		Crafty.e("HTML")
			.attr({x:320, y:210, w:200, h:20})
			.replace('<div id="sliderSpeed"></div>');
		
		$(function() {
			$( "#sliderSpeed" ).slider({
				value:500,
				min: 100,
				max: 1000,
				step: 50,
				slide: function( event, ui ) {
					$( "#speed" ).text( "Initial speed: "+ ui.value );
					SET_intervalBetweenUpdates = ui.value;
					SET_difficulty = "custom";
				}
			});
			$( "#speed" ).text( "Initial speed: "+ $( "#sliderSpeed" ).slider( "value" ) );
		});
		
		Crafty.e("HTML")
			.attr({x:20, y:250, w:300, h:20})
			.replace('<div id="lines" class="settings"></div>');
		
		Crafty.e("HTML")
			.attr({x:320, y:260, w:200, h:20})
			.replace('<div id="sliderLines"></div>');
		
		$(function() {
			$( "#sliderLines" ).slider({
				value:0,
				min: 0,
				max: 9,
				step: 1,
				slide: function( event, ui ) {
					$( "#lines" ).text( "Starting lines: "+ ui.value );
					SET_linesStart = ui.value;
					SET_difficulty = "custom";
				}
			});
			$( "#lines" ).text( "Starting lines: "+ $( "#sliderLines" ).slider( "value" ) );
		});
		
		drawButton(50, winHeight - 102, 180, 64, "MENU", function () {
			Crafty.scene("menu");
		}, 3, 40);
		
		drawButton(248, winHeight - 102, winWidth - 248 - 48, 64, "PLAY", function () {
			Crafty.scene("main");
		}, 3, 40);
	});
	
	Crafty.scene("menu");
});

Crafty.scene("game");