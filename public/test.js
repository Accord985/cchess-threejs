/**
 * BW 2024.1.20
 * This file is solely for debugging. It is not related with the application.
 */

'use strict';
import {AbstractGame} from '../util/AbstractGame.js';

(function() {
  window.addEventListener('load', init);

  async function init() {
    let game = await AbstractGame.initialize();
    let gameCopy = game;
    console.log(game.toString());
    gameCopy.recallMove();
    game.makeMove("03H03e");
    console.log(gameCopy.toString());
    game.makeMove("10H08G");
    console.log(game.toString());
    game.recallMove();
    console.log(game.toString());
    gameCopy.recallMove();
    game.makeMove("10B08C");
    console.log(game.toString());
  }
})();