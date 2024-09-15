/**
 * BW 2024.1.20
 * This file is solely for debugging. It is not related with the application.
 */

'use strict';
import {CasualSandbox} from '../util/compiled/AbstractGame.js';
import {DumbCChess} from '../util/compiled/cchess.js';

(function() {
  window.addEventListener('load', init);

  function id(idName) {
    return document.getElementById(idName);
  }

  async function init() {
    let game = await CasualSandbox.initialize();
    let cchess = new DumbCChess(game);
    id('game-container').appendChild(cchess.getGameElement());
  }
})();