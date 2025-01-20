'use strict';
import './flatCChess.css'

let a = <>
  <h1>Chinese Chess (Dumb)</h1>
  <p>
    This is a functional game of chinese chess (and very DUMB graphic).
    Here's some explanation for the notations:
    <ul>
      <li>
        The positions on the board is represented by a row number (1-10)
        followed by a rank letter (A-I).
      </li>
      <li>
        The pieces are denoted by players team connected with the starting letter of the
        relevant type (Rook, kNight, Cannon, Elephant, Guard, King, Pawn).
      </li>
      <li>
        A move is represented by writing the start position followed by the end position.
        For example, "03B03E" moves player 1's cannon from 03B to the center on that row(03E).
        [ps: Lowercase and uppercase letters can be used interchangeably in move notation.]
      </li>
      <li>
        To make a move, put the notation of your desired move in the input box and press the button.
      </li>
    </ul>
    Have fun!
  </p>
  <section id="game-container"></section>
  {/* for displaying the game */}
  <section id="game">
    <pre id="board"></pre>
    <p id="gameState"></p>
    <p id="moveState"></p>
    <label>
      Next Move:
      <input id="moveInput" type="text" minlength="6" maxlength="6" />
    </label>
    <button id="move">Make the Move</button>
    <button id="recall">Recall last move</button>
    <button id="draw">End with Draw</button>
    <button id="resign">Resign</button>
  </section>
</>

(function() {
  window.addEventListener('load', init);

  function init() {
    populateBoard();

    let pieces = qsa('#pieces div');
    for (let i = 0; i < pieces.length; i++) {
      pieces[i].addEventListener('click', (evt) => {
        // evt.target is the target of the event (selected piece)
        selectPiece(evt.target);
      });
    }
    let positions = qsa("#board > div");
    for (let i = 0; i < positions.length; i++) {
      positions[i].addEventListener('click', (evt) => {
        selectSquare(evt.target);
      });
    }
  }

  // rank: 10th=0-8; 9th=9-17
  // file: 1=8,17,...; 2=7,16,...
  function populateBoard() {
    let board = id('board');
    for (let i = 0; i < 90; i++) {
      let newItem = gen('div');
      let rank = 10 - Math.floor(i / 9);
      let file = 9 - i % 9;
      newItem.id = 'square' + rank + '-' + file;
      board.append(newItem);
    }
  }

  function isRival(pieceA, pieceB) {
    if ((!pieceA.classList.contains("team-1") && !pieceA.classList.contains("team-2")) ||
        (!pieceB.classList.contains("team-1") && !pieceB.classList.contains("team-2"))) {
      throw new Error("One of the pieces has no teams. Cannot determine rival status.");
    }
    let aInOne = pieceA.classList.contains("team-1");
    let bInOne = pieceB.classList.contains("team-1");
    return (aInOne && !bInOne) || (!aInOne && bInOne);
  }

  function selectPiece(target) {
    let selected = qs('.selected');
    if (selected) {
      if (isRival(target, selected)) {
        let coordinate = getCoordinates(target);
        target.classList.add('captured');
        target.classList.replace('file-'+coordinate[1], 'file-0');
        target.classList.replace('rank-'+coordinate[0], 'rank-0');
        moveSelected(coordinate);
      } else if (!target.classList.contains('selected')) {
        // there is selected & not rival:
        // if clicked on selected itself, deselect, otherwise change the selected
        selected.classList.remove('selected');
        target.classList.add('selected');
      } else {
        selected.classList.remove('selected');
      }
    } else {
      target.classList.add('selected');
    }
  }

  function selectSquare(target) {
    let squareCoord = target.id.substring(6).split('-');
    let pieceInPos = qs(`#pieces > .rank-${squareCoord[0]}.file-${squareCoord[1]}`);
    if (!pieceInPos) {
      if (qs('.selected')) {
        moveSelected(squareCoord);
      }
    } else {
      selectPiece(pieceInPos);
    }
  }

  function getCoordinates(piece) {
    let file = 0;
    let rank = 0;
    for (let i = 0; i < piece.classList.length; i++) {
      if (piece.classList[i].startsWith('file-')) {
        file = parseInt(piece.classList[i].substring(5));
      } else if (piece.classList[i].startsWith('rank-')) {
        rank = parseInt(piece.classList[i].substring(5));
      }
    }
    if (file <= 0 || rank <= 0 || file > 9 || rank > 10) {
      throw new Error('Illegal piece position');
    }
    return [rank, file];
  }

  function moveSelected(endPos) {
    let selected = qs('.selected');
    let selectedPos = getCoordinates(selected);
    makeMove(selectedPos, endPos);
  }

  // right now startPos must contain a piece
  function makeMove(startPos, endPos) {
    let startPiece = qs(`#pieces > .rank-${startPos[0]}.file-${startPos[1]}`);

    // no dot no ring: put the dot and ring.
    // dot and ring: remove previous dot and ring and add new.
    if (qs(".markDot")) {
      qs(".markDot").classList.remove("markDot");
    }
    if (qs(".markRing")) {
      qs(".markRing").classList.remove("markRing");
    }
    startPiece.classList.replace('file-'+startPos[1], 'file-'+endPos[1]);
    startPiece.classList.replace('rank-'+startPos[0], 'rank-'+endPos[0]);
    id(`square${startPos[0]}-${startPos[1]}`).classList.add("markDot");
    setTimeout(() => {
      startPiece.classList.remove('selected');
      id(`square${endPos[0]}-${endPos[1]}`).classList.add("markRing");
    }, 200);
  }

  /**
   * Returns the element that has the ID attribute with the specified value.
   * @param {string} idName - element ID
   * @returns {object} DOM object associated with id.
   */
  function id(idName) {
    return document.getElementById(idName);
  }

  /**
   * Returns the first element that matches the given CSS selector.
   * @param {string} selector - CSS query selector.
   * @returns {object} The first DOM object matching the query.
   */
  function qs(selector) {
    return document.querySelector(selector);
  }

  /**
   * Returns the array of elements that match the given CSS selector.
   * @param {string} selector - CSS query selector
   * @returns {object[]} array of DOM objects matching the query.
   */
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }

  /**
   * Returns a new element with the given tag name.
   * @param {string} tagName - HTML tag name for new DOM element.
   * @returns {object} New DOM object for given HTML tag.
   */
  function gen(tagName) {
    return document.createElement(tagName);
  }
})();