/**
 * BW 2024.1.20
 * This file is solely for debugging. It is not related with the application.
 */

// TODO: move this feature out into App.tsx
// TODO: and then delete this.

'use strict';
import {CasualSandbox} from './util/AbstractGame.ts';
import {DumbCChess, FlatCChess} from './util/cchess.ts';

(function() {
  window.addEventListener('load', init);

  function id(idName) {
    return document.getElementById(idName);
  }

  function init() {
    let game = CasualSandbox.initialize();
    let cchess = new FlatCChess(game);
    id('game-container').appendChild(cchess.getGameElement());
    cchess.displayCheck();
  }
})();