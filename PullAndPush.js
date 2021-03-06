var winWidth = 600;
var winHeight = 500;

// Load the Kongregate API
var kongregate;
kongregateAPI.loadAPI(onComplete);

// Callback function
function onComplete(){
	// Set the global kongregate API object
	kongregate = kongregateAPI.getAPI();
}
Crafty.init(winWidth,winHeight);
Crafty.background('white');

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
	var SOUND_ON = true;
	var MUSIC_POWER = 0.4; // how loud is the music
	var MUSIC_ON = true;
	var SCORE = true; // if true we upadte the score
	var MENU_MODE = true; // when we display the menu, true by default
	var MAX_LEVEL_DONE = false; // to not repeat the MAX level indication on the progress bar

	var fieldArray = new Array(); // contains the field with the tiles
	var fieldWidth, fieldHeight; // width and height of the field, in number of tiles
	var offsetTop = 10, offsetLeft = 10; // how many pixels away from the left and top borders of the scene

	var fullColumns = new Array(); 

	var moveTilesId = -1; // ID of the setInterval used for the game

	var animTutoIntervalLeft = -1, animTutoIntervalRight = -1, animTutoIntervalDown = -1, animTutoIntervalTiles = -1;

	var currentLevel = 1,
		levelText;
	var currentScore = 0,
		scoreText;
	
	// The original values for the difficulty setting, can be changed via the menu
	var SET_intervalBetweenUpdates = 500,
		SET_numberOfColors = 3,
		SET_linesStart = 2,
		SET_difficulty = "Normal";
	
	// var levelCaps = [60, 150, 300, 400, 500]; // how many points to go to next level
	var levelCaps = [500, 1000, 2000, 3500, 5000, 7000, 9000, 11000, 15000, 20000, 25000, 50000]; // how many points to go to next level
	var intervalBetweenUpdates = SET_intervalBetweenUpdates; // the number of ms between each update of the scene
	var newLevelUpdateIntervalDecrease = 50; // each level, we decrease the interval between updates by this nummber of ms
	// var newLevelUpdateIntervalDecrease = 800; // each level, we decrease the interval between updates by this nummber of ms
	var numberOfColors = SET_numberOfColors; // the number of authorized colors, max is maxNumberOfColors
	var maxNumberOfColors = 6; // the maximum number of colors
	var linesStart = SET_linesStart; // the number of lines full of minerals at the start
	
	var toNextLevelProgressBar = -1;
	
	var winnings = new Array();
	
	for (var i = 0; i < maxNumberOfColors; i++) {
		winnings.push({'color':i, 'number':0, 'earnings':0});
	}

	var tileWidth = 52, tileHeight = 32;

	// the events for the tutorial animation
	Crafty.addEvent(this, window.document, "AnimTutoClearLR", null); // clear Left and Right
	Crafty.addEvent(this, window.document, "AnimTutoClearDU", null); // clear Down and Up
	Crafty.addEvent(this, window.document, "AnimTutoLeft", null);
	Crafty.addEvent(this, window.document, "AnimTutoRight", null);
	Crafty.addEvent(this, window.document, "AnimTutoDown", null);
	Crafty.addEvent(this, window.document, "AnimTutoUp", null);
	
	var comboCounter = 0; // Counts the number of simultaneous matches we did
	var checkXEnded = false, checkYEnded = false; // used to know if we have finished checking for matches on X and Y
	var comboText; // will contain the entity printing the current combo

	function initGame (w, h) {
		PAUSE_MODE = false;
		MAX_LEVEL_DONE = false;
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
		
		winnings.forEach(function (e) {
			e.number = 0;
			e.earnings = 0;
		});
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
		
		Crafty.e("2D, DOM, sprLeftOff")
			.attr({ x: 50, y: 300, w: 32, h: 32 })
			.bind("AnimTutoClearLR", function () {
				if (this.has("sprLeftOn")) this.toggleComponent("sprLeftOn, sprLeftOff");
			})
			.bind("AnimTutoLeft", function () {
				// this.color((this.color() === "red")?"darkred":"red");
				this.toggleComponent("sprLeftOff, sprLeftOn");
			})
		;
		
		Crafty.e("2D, DOM, sprRightOff")
			.attr({ x: 82, y: 300, w: 32, h: 32 })
			.bind("AnimTutoClearLR", function () {
				if (this.has("sprRightOn")) this.toggleComponent("sprRightOn, sprRightOff");
			})
			.bind("AnimTutoRight", function () {
				this.toggleComponent("sprRightOff, sprRightOn");
			})
		;
		
		Crafty.e("2D, DOM, sprPad")
			.attr({ x: 60, y: 250 })
			.bind("AnimTutoRight", function () {
				this.x = 80;
			})
			.bind("AnimTutoLeft", function () {
				this.x = 30;
			})
		;
		
		Crafty.e("2D, DOM, sprUpOff")
			.attr({ x: 160, y: 284, w: 32, h: 32 })
			.bind("AnimTutoClearDU", function () {
				if (this.has("sprUpOn")) this.toggleComponent("sprUpOn, sprUpOff");
			})
			.bind("AnimTutoUp", function () {
				this.toggleComponent("sprUpOn, sprUpOff");
			})
		;
		
		Crafty.e("2D, DOM, sprDownOff")
			.attr({ x: 160, y: 316, w: 32, h: 32 })
			.bind("AnimTutoClearDU", function () {
				if (this.has("sprDownOn")) this.toggleComponent("sprDownOn, sprDownOff");
			})
			.bind("AnimTutoDown", function () {
				this.toggleComponent("sprDownOn, sprDownOff");
			})
		;
		
		var posPad = 0;
		var t1, t2;
		Crafty.e("2D, DOM, sprPad")
			.attr({ x: 210, y: 250 })
			.bind("AnimTutoDown", function () {
				this.y += 30;
				if (posPad === 0) {
					t1 = Crafty.e("2D, DOM, sprTile1")
							.attr({ x: 210, y: this.y - 32});
					posPad++;
				} else {
					t1.y += 30;
					t2 = Crafty.e("2D, DOM, sprTile2")
							.attr({ x: 210, y: this.y - 64});
				}
			})
			.bind("AnimTutoUp", function () {
				this.y = 250;
				t1.destroy();
				t2.destroy();
				posPad = 0;
			})
		;
		
		Crafty.trigger("AnimTutoLeft");
		window.setTimeout(function () {Crafty.trigger("AnimTutoClearLR"); }, 200);
		window.setTimeout(function () {
			Crafty.trigger("AnimTutoRight"); 
			window.setTimeout(function () {Crafty.trigger("AnimTutoClearLR"); }, 200);
		}, 900);
		
		animTutoIntervalLeft = window.setInterval(function () { 
			Crafty.trigger("AnimTutoLeft");
			window.setTimeout(function () {Crafty.trigger("AnimTutoClearLR"); }, 200);
		}, 1800);
		window.setTimeout(function () {
			animTutoIntervalRight = window.setInterval(function () { 
				Crafty.trigger("AnimTutoRight"); 
				window.setTimeout(function () {Crafty.trigger("AnimTutoClearLR"); }, 200);
			}, 1800);
		}, 900);
		
		Crafty.trigger("AnimTutoDown");
		window.setTimeout(function () {Crafty.trigger("AnimTutoClearDU"); }, 200);
		window.setTimeout(function () {Crafty.trigger("AnimTutoDown"); }, 1100);
		window.setTimeout(function () {Crafty.trigger("AnimTutoClearDU"); }, 1300);
		window.setTimeout(function () {Crafty.trigger("AnimTutoUp"); }, 2200);
		window.setTimeout(function () {Crafty.trigger("AnimTutoClearDU"); }, 2400);
		animTutoIntervalDown = window.setInterval(function () { 
			Crafty.trigger("AnimTutoDown");
			window.setTimeout(function () {Crafty.trigger("AnimTutoClearDU"); }, 200);
			window.setTimeout(function () {Crafty.trigger("AnimTutoDown"); }, 1100);
			window.setTimeout(function () {Crafty.trigger("AnimTutoClearDU"); }, 1300);
			window.setTimeout(function () {Crafty.trigger("AnimTutoUp"); }, 2200);
			window.setTimeout(function () {Crafty.trigger("AnimTutoClearDU"); }, 2400);
		}, 3500);
		
		var tileNumber = Crafty.math.randomInt(1, maxNumberOfColors-1);
		var tilesTuto = new Array();
		for (var i=0; i<3; i++)
			tilesTuto.push(Crafty.e("2D, Canvas, sprTile"+tileNumber)
				.attr({ x: 300+(i*tileWidth), y:300 }));
		
		animTutoIntervalTiles = window.setInterval(function () {
			tilesTuto.forEach(function (e) {
				Crafty(e[0]).removeComponent("sprTile"+tileNumber);
			});
			tileNumber = Crafty.math.randomInt(1, maxNumberOfColors-1);
			tilesTuto.forEach(function (e) {
				Crafty(e[0]).addComponent("sprTile"+tileNumber);
			});
		}, 900);
			
		Crafty.e("2D, DOM, Text")
			.attr({ x:440, y:300, w: 150, h:40, z:3 })
			.css({
				'font-size':'30px', 
				'font-weight':'bold',
				'text-align':'center',
				'font-family':'PaperCut, Arial, sans-serif', 
				'color': '#fff'
			})
			.text("= $$$")
		;
		
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
				Crafty.e("2D, DOM, Color")
					.attr({ x: 0, y: 0, w: winWidth, h: winHeight, alpha: 0.8, z:10 })
					.color("black")
				;
				var nbMonths = Math.round(currentScore/2500);
				Crafty.e("2D, DOM, Text")
					.attr({ x:300, y:50, w: winWidth-300, h:400, z:11 })
					.css({
						'font-size':'30px', 
						'font-weight':'bold',
						'text-align':'center',
						'font-family':'PaperCut, Arial, sans-serif', 
						'color': '#fff',
					})
					.text("You win $"+currentScore+"!<br />You can "+((nbMonths === 0)?"barely ":"")+"travel for "+
						((nbMonths === 0)?1:nbMonths)+" month"+((nbMonths>1)?"s":"")+" with that!<br />But I'm sure you want to travel more...")
				;
				
				// console.log(SET_difficulty, currentScore);
				if (typeof kongregate !== 'undefined') kongregate.stats.submit(SET_difficulty, currentScore);
				
				drawButton(150, 350, 300, 70, "Try again", function () {Crafty.scene("main");}, 11, 40);
				drawButton(230, 430, 140, 50, "MENU", function () {Crafty.scene("menu");}, 11);
				
				Crafty.e("2D, DOM, Color")
					.attr({ x: 10, y: 10, w: 280, h: 250, alpha: 0.7, z:12 })
					.color("white")
				;
				
				var yText = 20;
				winnings.forEach(function(e) {
					Crafty.e("2D, DOM, sprTile"+e.color)
						.attr({ x:20, y:yText, z:13 })
					;
					
					Crafty.e("2D, DOM, Text")
						.attr({ x:80, y:yText, w: winWidth, h:40, z:13 })
						.css({
							'font-size':'28px', 
							'font-weight':'bold',
							'font-family':'PaperCut, Arial, sans-serif', 
							'color': '#000',
						})
						.text(" x"+e.number+" = $"+e.earnings)
					;
					yText += 40;
				});

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
		// updates the current score 
		// toAdd is the number of tiles in the match
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
				var nbPoints = toAdd*10+((toAdd>3)?(toAdd%3)*20:0)+((toAdd>4)?(toAdd%4)*30:0)+((toAdd>5)?(toAdd%5)*40:0);
				currentScore += (nbPoints*comboCounter);
				// width of progress bar = 146
				if (currentLevel === 1) {
					var wBar = Math.round((146*currentScore)/levelCaps[currentLevel-1]);
					toNextLevelProgressBar.w = (wBar > 146)?146:wBar;
				} else if ((currentLevel > 1) && (currentLevel < levelCaps.length)) {
					var wBar = Math.round((146*(currentScore-levelCaps[currentLevel-2]))/(levelCaps[currentLevel-1] - levelCaps[currentLevel-2]));
					toNextLevelProgressBar.w = (wBar > 146)?146:wBar;
				}
				
				scoreText.text("$"+currentScore);
				// console.log(pos);
				// a litte animation to show the score gained
				var nbSteps = 50;
				// if (pos.y + (toAdd*comboCounter) > winHeight) pos.y = winHeight - (toAdd*comboCounter) - 10;
				Crafty.e("DOM, Text")
					// .attr({x: pos.x, y: pos.y})
					.attr({x: Crafty("sprPad").x, y: Crafty("sprPad").y})
					.text(nbPoints*comboCounter)
					.css({
						'font-size':(toAdd*10*comboCounter)+'px', 
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
			
				// console.log("Earning color ", color);
				
				if (typeof winnings[color] !== 'undefined') {
					winnings[color].earnings += nbPoints*comboCounter;
					winnings[color].number += toAdd;
				}
				// winnings.forEach(function (e) {console.log(e);});
				if (SOUND_ON) Crafty.audio.play("dollars");
				comboCheck(comboCounter); // we display combo if it is needed
				// console.log("Won",toAdd,"points");
			} else {
				// the dirt doesn't give you any dollars !
				if (SOUND_ON) Crafty.audio.play("stone");
				winnings[color].number += toAdd;
			}
		}
	}

	function comboCheck(comboCounterLocal) {
		if (comboCounterLocal < -1) {
			//when combo counter < 0, it means one of the checks (X or Y) ended, e check if both ended and destroy the combo text after some ms
			if (checkXEnded === true && checkYEnded === true)
				window.setTimeout(function () {
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
								if (SCORE) updateScore(amount, {x: (x-Math.ceil(amount/2)+1)*tileWidth, y: y*tileHeight}, color);
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
								if (SCORE) updateScore(amount, {x: (x-Math.ceil(amount/2)+1)*tileWidth, y: y*tileHeight}, color);
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
								if (SCORE) updateScore(amount, {x: x*tileWidth, y: (y-Math.ceil(amount/2)+1)*tileHeight }, color);
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
								if (SCORE) updateScore(amount, {x: x*tileWidth, y: (y-Math.ceil(amount/2)+1)*tileHeight }, color);
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
		if (SCORE) {
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
		} else {
			for (var i=0; i<fieldWidth; i++) {
				for (var j=0; j<fieldHeight; j++)
					if (fieldArray[j][i].color === -2) {
						fieldArray[j][i].color = -1;
					}
			}
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
		
		if (animTutoIntervalLeft !== -1) {
			window.clearInterval(animTutoIntervalLeft);
			window.clearInterval(animTutoIntervalRight);
			window.clearInterval(animTutoIntervalDown);
			window.clearInterval(animTutoIntervalTiles);
		}
		
		if (!LOADED) {
			var textIntro = Crafty.e("2D, DOM, Text")
				.attr({ x:0, y:100, w: winWidth, h:200 })
				.css({
					'font-size':'30px', 
					'font-weight':'bold',
					'text-align':'center',
					'font-family':'Arial, sans-serif', 
					'color': '#000'
				})
				.text("mntdn games presents<br /><br />Ozzie Miner")
			;
			
			Crafty.e("2D, DOM, Color")
				.attr({ x: 248, y: winHeight - 95 - 2, w: winWidth - 250 - 50, h: 64, z:1 })
				.color("black")
			;
			var progressBar = Crafty.e("2D, DOM, Mouse, Color")
				.attr({ x: 250, y: winHeight - 95, w: 0, h: 60, z:2 })
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
				.attr({ x:250, y:winHeight - 90, w: winWidth-250-50, h:40, z:3 })
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
			Crafty.load([
					"assets/Title.png", 
					"assets/tiles.png", 
					"assets/arrows.png", 
					"assets/soil.png", 
					"assets/music.png", 
					"assets/music_no.png", 
					"assets/loudspeaker.png", 
					"assets/loudspeaker_no.png", 
					"assets/Soil_Transition.png", 
					"assets/background.png", 
					"assets/dollars.mp3", 
					"assets/dollars.ogg", 
					"assets/stone.mp3", 
					"assets/stone.ogg", 
					"assets/music.mp3", 
					"assets/music.ogg", 
				],
				function() {
					//when loaded
					// console.log(Crafty.assets);
					LOADED = true;
					// Crafty.scene("main"); //go to the menu
					textIntro.destroy();
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
					
					Crafty.sprite(32, "assets/arrows.png", {
						sprRightOff:[0,0],
						sprRightOn:[1,0],
						sprLeftOff:[2,0],
						sprLeftOn:[3,0],
						sprUpOff:[4,0],
						sprUpOn:[5,0],
						sprDownOff:[6,0],
						sprDownOn:[7,0]
					});
					
					Crafty.sprite(256, "assets/background.png", { sprBackground:[0,0] });
					Crafty.sprite("assets/Soil_Transition.png", { sprSoilTransition:[0,0,64,32] });
					Crafty.sprite(64, "assets/soil.png", { sprSoil:[0,0] });
					Crafty.sprite("assets/Title.png", { sprTitle:[0,0,256,128] });
					Crafty.sprite(32, "assets/music.png", { sprMusic:[0,0] });
					Crafty.sprite(32, "assets/music_no.png", { sprMusicNo:[0,0] });
					Crafty.sprite(32, "assets/loudspeaker.png", { sprLoudspeaker:[0,0] });
					Crafty.sprite(32, "assets/loudspeaker_no.png", { sprLoudspeakerNo:[0,0] });
					
					Crafty.audio.add("stone", [
						"assets/stone.mp3",
						"assets/stone.ogg",
						]);
						
					Crafty.audio.add("dollars", [
						"assets/dollars.mp3",
						"assets/dollars.ogg",
						]);
					
					Crafty.audio.add("music", [
						"assets/music.mp3",
						"assets/music.ogg",
						]);
						
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
					
					Crafty.e("2D, DOM, Text")
						.attr({ x:0, y:5, w: winWidth, h:200 })
						.css({
							'font-size':'20px', 
							'font-weight':'bold',
							'text-align':'center',
							'font-family':'PaperCut, Arial, sans-serif', 
							'color': '#f2b900'
						})
						.text("mntdn games presents")
					;
					
					Crafty.e("2D, DOM, sprTitle")
						.attr({ x:(winWidth-256)/2, y: 30 })
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
					
					Crafty.e("2D, DOM, Mouse, sprMusic"+((MUSIC_ON === true)?"":"No"))
						.attr({ x: winWidth-32-20, y: 20 })
						.bind("Click", function () {
							this.toggleComponent("sprMusic, sprMusicNo");
							Crafty.audio.togglePause("music");
							MUSIC_ON = !MUSIC_ON;
						})
					;
					Crafty.e("2D, DOM, Mouse, sprLoudspeaker"+((SOUND_ON === true)?"":"No"))
						.attr({ x: winWidth-32-20, y: 62 })
						.bind("Click", function () {
							this.toggleComponent("sprLoudspeaker, sprLoudspeakerNo");							
							SOUND_ON = !SOUND_ON;
						})
					;
					
					coolTuto();
					drawButton(50, winHeight - 122, 180, 64, "Difficulty:<br />"+SET_difficulty, function () {
						Crafty.scene("settings");
					}, 3, 20);
					
					drawButton(50, winHeight - 52, 180, 40, "Credits", function () {
						Crafty.scene("credits");
					}, 3, 20);
					
					Crafty.audio.play("music", -1, MUSIC_POWER);
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
				.attr({ x: 248, y: winHeight - 95 - 2, w: winWidth - 248 - 48, h: 64, z:1 })
				.color("black")
			;
			var progressBar = Crafty.e("2D, DOM, Mouse, Color")
				.attr({ x: 250, y: winHeight - 95, w: winWidth - 250 - 50, h: 60, z:2 })
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
				.attr({ x:250, y:winHeight - 90, w: winWidth - 250 - 50, h:40, z:3 })
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
			// Crafty.audio.play("music", -1);
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
			
			Crafty.e("2D, DOM, Text")
				.attr({ x:0, y:5, w: winWidth, h:200 })
				.css({
					'font-size':'20px', 
					'font-weight':'bold',
					'text-align':'center',
					'font-family':'PaperCut, Arial, sans-serif', 
					'color': '#f2b900'
				})
				.text("mntdn games presents")
			;
					
			Crafty.e("2D, DOM, sprTitle")
				.attr({ x:(winWidth-256)/2, y: 30 })
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
			
			drawButton(50, winHeight - 122, 180, 64, "Difficulty:<br />"+SET_difficulty, function () {
				Crafty.scene("settings");
			}, 3, 20);
			
			drawButton(50, winHeight - 52, 180, 40, "Credits", function () {
				Crafty.scene("credits");
			}, 3, 20);
			
			Crafty.e("2D, DOM, Mouse, sprMusic"+((MUSIC_ON === true)?"":"No"))
				.attr({ x: winWidth-32-20, y: 20 })
				.bind("Click", function () {
					this.toggleComponent("sprMusic, sprMusicNo");
					Crafty.audio.togglePause("music");
					MUSIC_ON = !MUSIC_ON;
				})
			;
			Crafty.e("2D, DOM, Mouse, sprLoudspeaker"+((SOUND_ON === true)?"":"No"))
				.attr({ x: winWidth-32-20, y: 62 })
				.bind("Click", function () {
					this.toggleComponent("sprLoudspeaker, sprLoudspeakerNo");							
					SOUND_ON = !SOUND_ON;
				})
			;
		}
		
	});

	Crafty.scene("main", function () {
		
		MENU_MODE = false;

		if (animTutoIntervalLeft !== -1) {
			window.clearInterval(animTutoIntervalLeft);
			window.clearInterval(animTutoIntervalRight);
			window.clearInterval(animTutoIntervalDown);
			window.clearInterval(animTutoIntervalTiles);
		}
		initGame(7, 12);
		
		Crafty.e("bgBackground");		
		
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
											// console.log("Column full!");
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
											// console.log("Column full!");
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
		
		// we add the tracks on the bottom
		var bgSize = 64;
		// first the transition
		for (var i=(fieldWidth*tileWidth)+(offsetLeft*2)-bgSize; i>-1*bgSize; i-=bgSize)
				Crafty.e("2D, Canvas, sprSoilTransition")
					.attr({ x:i, y:(fieldHeight*tileHeight)+offsetTop });
					
		// then the tracks
		for (var i=(fieldWidth*tileWidth)+(offsetLeft*2)-bgSize; i>-1*bgSize; i-=bgSize)
			for (var j=(fieldHeight*tileHeight)+offsetTop+32; j<winHeight; j+=bgSize)
				Crafty.e("2D, Canvas, sprSoil")
					.attr({ x:i, y:j });
		
		Crafty.e("pad");
		
		Crafty.e("2D, DOM, Text")
			.attr({ x:420, y:32, z:1 })
			.css({
				'font-size':'30px', 
				'font-weight':'bold', 
				'font-family':'PaperCut, Arial, sans-serif', 
				'color': '#fff',
				'text-shadow': '-2px 2px 2px #f2b900'
			})
			.text("Money")
		;
		scoreText = Crafty.e("2D, DOM, Text")
							.attr({ x:420, y:70, w: 150, z:1 })
							.css({
								'font-size':'30px', 
								'font-weight':'bold', 
								'font-family':'PaperCut, Arial, sans-serif', 
								'color': '#f2b900',
								// 'text-shadow': '-2px 2px 2px #fff'
							})
							.text("$"+currentScore)
						;
						
		Crafty.e("2D, DOM, Text")
			.attr({ x:420, y:112, z:1 })
			.css({
				'font-size':'30px', 
				'font-weight':'bold', 
				'font-family':'PaperCut, Arial, sans-serif', 
				'color': '#fff',
				// '-webkit-text-stroke': '1px white',
				'text-shadow': '-2px 2px 2px #f2b900'
			})
			.text("Level")
		;
		levelText = Crafty.e("2D, DOM, Text")
							.attr({ x:520, y:112, z:1 })
							.css({
								'font-size':'30px', 
								'font-weight':'bold', 
								'font-family':'PaperCut, Arial, sans-serif', 
								'color': '#f2b900',
								// '-webkit-text-stroke': '1px white',
								// 'text-shadow': '-2px 2px 2px #fff'
							})
							.text(currentLevel)
						;
		
		Crafty.e("2D, DOM, Color")
			.attr({ x: (fieldWidth*tileWidth)+(offsetLeft*2), y: 0, w: 300, h: winHeight, z:0, alpha: 0.7 })
			.color("black")
		;
		
		Crafty.e("2D, DOM, Color")
			.attr({ x: 420, y: 160, w: 150, h: 20, z:2 })
			.color("f2b900")
			.css({ 'background': 'none repeat scroll 0% 0% #f2b900' })
		;
		toNextLevelProgressBar = Crafty.e("2D, DOM, Color")
			.attr({ x: 422, y: 162, w: 0, h: 16, z:3 })
			.color("black")
		;
		
		drawButton(400, 250, 180, 40, "PAUSE", function () {
			PAUSE_MODE = !PAUSE_MODE;
			pauseScreen();
		}, 2);
		
		drawButton(400, 300, 180, 40, "MENU", function () {
			PAUSE_MODE = true;
			
			var veil = Crafty.e("2D, DOM, Color, Mouse")
				.attr({ x: 0, y: 0, w: winWidth, h: winHeight, alpha: 0.7, z: 5 })
				.color("black")
				.bind("Click", function () {
				})
			;
			
			var sureText = Crafty.e("2D, DOM, Text")
				.attr({ x:0, y:100, w: winWidth, h:400, z:6 })
				.css({
					'font-size':'30px', 
					'font-weight':'bold',
					'text-align':'center',
					'font-family':'PaperCut, Arial, sans-serif', 
					'color': '#fff',
					// '-webkit-text-stroke': '1px white',
					// 'text-shadow': '-2px 2px 2px #fff'
				})
				.text("This will end your current game.<br />Are you sure?")
			;
			
			var sureTextYes = Crafty.e("2D, DOM, Text, Mouse")
				.attr({ x:200, y:240, w: 90, h:40, z:6 })
				.css({
					'font-size':'30px', 
					'font-weight':'bold',
					'text-align':'right',
					'font-family':'PaperCut, Arial, sans-serif', 
					'color': '#fff',
					// '-webkit-text-stroke': '1px white',
					// 'text-shadow': '-2px 2px 2px #fff'
				})
				.text("YES")
				.bind("MouseOver", function () {
					this.css({'font-size':'40px', 'cursor':'hand'});
				})
				.bind("MouseOut", function () {
					this.css({'font-size':'30px'});
				})
				.bind("Click", function () {
					Crafty.scene("menu");
				})
			;
			
			Crafty.e("2D, DOM, Text, Mouse")
				.attr({ x:310, y:240, w: 100, h:40, z:6 })
				.css({
					'font-size':'30px', 
					'font-weight':'bold',
					'text-align':'left',
					'font-family':'PaperCut, Arial, sans-serif', 
					'color': '#fff',
					// '-webkit-text-stroke': '1px white',
					// 'text-shadow': '-2px 2px 2px #fff'
				})
				.text("NO")
				.bind("MouseOver", function () {
					this.css({'font-size':'40px', 'cursor':'hand'});
				})
				.bind("MouseOut", function () {
					this.css({'font-size':'30px'});
				})
				.bind("Click", function () {
					this.destroy();
					veil.destroy();
					sureText.destroy();
					sureTextYes.destroy();
					PAUSE_MODE = false;
				})
			;
			
		}, 2);
		
		Crafty.e("2D, DOM, Mouse, sprMusic"+((MUSIC_ON === true)?"":"No"))
			.attr({ x: winWidth-102-20, y: 370, z:2 })
			.bind("Click", function () {
				this.toggleComponent("sprMusic, sprMusicNo");
				Crafty.audio.togglePause("music");
				MUSIC_ON = !MUSIC_ON;
			})
		;
		Crafty.e("2D, DOM, Mouse, sprLoudspeaker"+((SOUND_ON === true)?"":"No"))
			.attr({ x: winWidth-102-20, y: 412, z:2 })
			.bind("Click", function () {
				this.toggleComponent("sprLoudspeaker, sprLoudspeakerNo");							
				SOUND_ON = !SOUND_ON;
			})
		;
		
		for (var i=fieldHeight-linesStart; i<fieldHeight; i++) {
			for (var j=0; j<fieldWidth; j++)
				fieldArray[i][j] = { "color": Crafty.math.randomInt(0,numberOfColors-1), "id": -1 };
				// fieldArray[i][j] = { "color": (j==1)?-1:1, "id": -1 };
		}
		drawField();
		SCORE = false;
		checkBoard();
		blinkMatches();
		SCORE = true;
		// comboCheck();
		// console.log(comboCounter);
		
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
							toNextLevelProgressBar.w = 0;
							
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

							// console.log(currentLevel, intervalBetweenUpdates);
							window.clearInterval(moveTilesId);
							gameLoop();
						}
					} else if (!MAX_LEVEL_DONE) {
						// level max
						toNextLevelProgressBar.w = 0;
						Crafty.e("DOM, Text")
							.attr({x: 477, y: 160, z:3})
							.text("MAX")
							.css({
								'font-size':'18px', 
								'font-weight':'bold', 
								'font-family':'PaperCut, Arial, sans-serif', 
								'color': '#FFF'
							})
						;
						MAX_LEVEL_DONE = true;
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
		if (animTutoIntervalLeft !== -1) {
			window.clearInterval(animTutoIntervalLeft);
			window.clearInterval(animTutoIntervalRight);
			window.clearInterval(animTutoIntervalDown);
			window.clearInterval(animTutoIntervalTiles);
		}
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
			SET_difficulty = "Easy";
			$( "#sliderColors" ).slider( "value", 2 );
			$( "#colors" ).text( "Starting colors: 2" );
			SET_numberOfColors = 2;
			$( "#sliderSpeed" ).slider( "value", 2 );
			$( "#speed" ).text( "Initial speed: 2" );
			SET_intervalBetweenUpdates = 800;
			$( "#sliderLines" ).slider( "value", 0 );
			$( "#lines" ).text( "Starting lines: 0" );
			SET_linesStart = 0;
		}, 1);
		drawButton(220,70,150,50,"Normal",function () {
			SET_difficulty = "Normal";
			$( "#sliderColors" ).slider( "value", 3 );
			$( "#colors" ).text( "Starting colors: 3" );
			SET_numberOfColors = 3;
			$( "#sliderSpeed" ).slider( "value", 5 );
			$( "#speed" ).text( "Initial speed: 5" );
			SET_intervalBetweenUpdates = 500;
			$( "#sliderLines" ).slider( "value", 2 );
			$( "#lines" ).text( "Starting lines: 2" );
			SET_linesStart = 2
		}, 1);
		drawButton(390,70,150,50,"Hard",function () {
			SET_difficulty = "Hard";
			$( "#sliderColors" ).slider( "value", 6 );
			$( "#colors" ).text( "Starting colors: 6" );
			SET_numberOfColors = 6;
			$( "#sliderSpeed" ).slider( "value", 7 );
			$( "#speed" ).text( "Initial speed: 7" );
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
				value:SET_numberOfColors,
				min: 2,
				max: 6,
				step: 1,
				slide: function( event, ui ) {
					$( "#colors" ).text( "Starting colors: "+ ui.value );
					SET_numberOfColors = ui.value;
					SET_difficulty = "Custom";
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
				value:(10-(SET_intervalBetweenUpdates/100)),
				min: 1,
				max: 9,
				step: 1,
				slide: function( event, ui ) {
					$( "#speed" ).text( "Initial speed: "+ ui.value );
					SET_intervalBetweenUpdates = 1000-(ui.value*100);
					SET_difficulty = "Custom";
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
				value:SET_linesStart,
				min: 0,
				max: 9,
				step: 1,
				slide: function( event, ui ) {
					$( "#lines" ).text( "Starting lines: "+ ui.value );
					SET_linesStart = ui.value;
					SET_difficulty = "Custom";
				}
			});
			$( "#lines" ).text( "Starting lines: "+ $( "#sliderLines" ).slider( "value" ) );
		});
		
		drawButton(50, winHeight - 97, 180, 64, "MENU", function () {
			Crafty.scene("menu");
		}, 3, 40);
		
		drawButton(248, winHeight - 97, winWidth - 248 - 48, 64, "PLAY", function () {
			Crafty.scene("main");
		}, 3, 40);
	});	
	
	Crafty.scene("credits", function () {
		if (animTutoIntervalLeft !== -1) {
			window.clearInterval(animTutoIntervalLeft);
			window.clearInterval(animTutoIntervalRight);
			window.clearInterval(animTutoIntervalDown);
			window.clearInterval(animTutoIntervalTiles);
		}
		Crafty.e("bgBackground");
		Crafty.e("2D, DOM, Text")
			.attr({ x:0, y:30, w: winWidth, z:1 })
			.css({
				'font-size':'30px', 
				'font-weight':'bold', 
				'font-family':'PaperCut, Arial, sans-serif', 
				'color': '#fff',
				'text-align': 'center',
				'text-shadow': '-2px 2px 2px #000'
			})
			.text("Code, design, music<br />Matthieu Montaudouin")
		;
		
		Crafty.e("2D, DOM, Text")
			.attr({ x:0, y:150, w: winWidth, z:1 })
			.css({
				'font-size':'30px', 
				'font-weight':'bold', 
				'font-family':'PaperCut, Arial, sans-serif', 
				'color': '#fff',
				'text-align': 'center',
				'text-shadow': '-2px 2px 2px #000'
			})
			.text("Art<br />Gaëtan Montaudouin")
		;
		
		Crafty.e("2D, DOM, Text, Mouse")
			.attr({ x:0, y:300, w: winWidth, z:1 })
			.css({
				'font-size':'30px', 
				'font-weight':'bold', 
				'font-family':'PaperCut, Arial, sans-serif', 
				'color': '#fff',
				'text-align': 'center',
				'text-shadow': '-2px 2px 2px #000'
			})
			.text("Made with CraftyJS")
		;
				
		drawButton(50, winHeight - 97, 180, 64, "MENU", function () {
			Crafty.scene("menu");
		}, 3, 40);
		
		drawButton(248, winHeight - 97, winWidth - 248 - 48, 64, "PLAY", function () {
			Crafty.scene("main");
		}, 3, 40);
	});
	
	Crafty.scene("menu");
});

Crafty.scene("game");