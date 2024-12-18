class CChess {
    constructor(game) {
        this._game = game;
    }
    getGameElement() {
        return this._gameElement;
    }
    operateBoard() {
        let moveStr = this.interpret();
        if (moveStr !== '') {
            let status = this._game.makeMove(moveStr);
            this.update(status, moveStr);
        }
    }
}
export class DumbCChess extends CChess {
    constructor(game) {
        super(game);
        this._board = gen('pre');
        this._input = gen('input');
        this._input.type = 'text';
        this._input.minLength = 6;
        this._input.maxLength = 6;
        this._recall = gen('button');
        this._recall.textContent = 'Recall last move';
        this._resign = gen('button');
        this._resign.textContent = 'Resign';
        this._draw = gen('button');
        this._draw.textContent = 'End with Draw';
        this._move = gen('button');
        this._move.textContent = 'Make the Move';
        this._gameState = gen('p');
        this._moveState = gen('p');
        this._gameElement = this._buildGameElement();
        this._setup();
    }
    /* The result is like this:
  <section>
    <pre id="board"></pre>
    <p id="gameState"></p>
    <p id="moveState"></p>
    <label>
      Next Move:
      <input id="moveInput" type="text" minlength="6" maxlength="6">
    </label>
    <button id="move">Make the Move</button>
    <button id="recall">Recall last move</button>
    <button id="draw">End with Draw</button>
    <button id="resign">Resign</button>
  </section>
  */
    _buildGameElement() {
        let result = document.createElement('section');
        result.appendChild(this._board);
        result.appendChild(this._gameState);
        result.appendChild(this._moveState);
        let label = document.createElement('label');
        label.textContent = 'Next Move:';
        label.appendChild(this._input);
        result.appendChild(label);
        result.appendChild(this._move);
        result.appendChild(this._recall);
        result.appendChild(this._draw);
        result.appendChild(this._resign);
        return result;
    }
    _setup() {
        // game not over then iterate:
        // update the board and the message
        // make the move (wait for the button). If fail then do it again until successful
        // after the loop: find the winner and put it in message board
        this._board.textContent = this._game.toString();
        this._gameState.textContent = "Current Player: " + this._game.getCurrPlayer();
        // annonymous function is necessary otherwise the meaning of this will not
        // be the object but the button pressed
        this._move.addEventListener('click', this.operateBoard);
        this._recall.addEventListener('click', () => { this.recallMove(); });
        this._draw.addEventListener('click', () => { this.draw(); });
        this._resign.addEventListener('click', () => { this.resign(); });
    }
    interpret() {
        return this._input.value;
    }
    displayFinish(winner) {
        this._gameState.textContent = (winner === 0) ?
            "It is a draw! Refresh the page to play again." :
            `The winner is ${winner}! Refresh the page to play again.`;
        this._input.disabled = true;
        this._move.disabled = true;
        this._recall.disabled = true;
        this._resign.disabled = true;
        this._draw.disabled = true;
    }
    displayCapture() {
        this._moveState.textContent = 'Capture!';
    }
    displayCheck() {
        this._moveState.textContent = 'Check!';
    }
    update(status, moveStr) {
        this._gameState.textContent = "Current Player: " + this._game.getCurrPlayer();
        if (status !== -1 && status !== 0 && status !== 1 && status !== 2) {
            this._moveState.textContent = `Error: Status ${status} is not recognized.`;
        }
        if (status === -1) {
            let displayed = (moveStr === "") ? "empty" : moveStr.toUpperCase();
            this._moveState.textContent = `Move [${displayed}] is not accepted`;
        }
        else {
            this._board.textContent = this._game.toString();
            if (status === 1) {
                this.displayCapture();
            }
            else if (status === 2) {
                this.displayCheck();
            }
            else {
                this._moveState.textContent = '';
            }
        }
        this._input.value = '';
        // check if game ends
        if (this._game.isGameOver()) {
            this.displayFinish(this._game.getWinner());
        }
    }
    recallMove() {
        let status = this._game.recallMove();
        if (status) {
            this._board.textContent = this._game.toString();
            this._gameState.textContent = "Current Player: " + this._game.getCurrPlayer();
            this._moveState.textContent = 'Move recalled!';
        }
        else {
            this._moveState.textContent = 'There is no reverse available.';
        }
    }
    draw() {
        this._game.draw();
        this.displayFinish(this._game.getWinner());
    }
    resign() {
        this._game.resign();
        this.displayFinish(this._game.getWinner());
    }
}
// rank=row, file=column. rank goes from 10 to 1 (top->bottom),
//  file goes from 9 to 1 (left->right)
// TODO: now use row goes from 10 to 1 (top->bottom),
// file goes from A to I (left->right)
// type Coord = {
//   rank: number,
//   file: number
// };
// need to be paired with flatCChess.css
export class FlatCChess extends CChess {
    constructor(game) {
        super(game);
        this._selected = null;
        this._gameElement = this._buildGameElement();
        this._dotMark = null;
        this._ringMark = null;
    }
    // <section>
    //   <div></div>x90, with id square-{row}{col}
    //   <section id="pieces">
    //     add elements based on layout like this:
    //     <div class="team-1 row-07 col-I">兵</div>
    //   </section>
    // </section>
    _buildGameElement() {
        let result = gen('section');
        result.id = 'board';
        result.translate = false;
        // row: 10th=0-8; 9th=9-17
        // col: 65/A=0,9,...; 66/B=1,10,...
        for (let i = 0; i < 90; i++) {
            let currSquare = gen('div');
            let row = 10 - Math.floor(i / 9);
            let col = String.fromCharCode(65 + i % 9);
            currSquare.id = `square-${(row === 10) ? '' : '0'}${row}${col}`;
            currSquare.addEventListener('click', (evt) => {
                if (!(evt.target instanceof HTMLDivElement)) {
                    throw new Error("The square clicked needs to be a div element");
                }
                // TODO: operateBoard();
                this.selectSquare(evt.target);
            });
            result.append(currSquare);
        }
        let pieces = this._createPieces();
        result.appendChild(pieces);
        return result;
    }
    // add elements based on layout
    _createPieces() {
        let pieces = gen('section');
        pieces.id = 'pieces';
        let layout = this._game.getLayout();
        let names = ['車馬炮仕相兵帥', '車馬炮士象卒將']; // red, black
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 9; j++) {
                let pieceNum = layout[i][j];
                if (pieceNum !== 0) {
                    let team = Math.floor(pieceNum / 10);
                    let type = pieceNum % 10;
                    let currPiece = gen('div');
                    currPiece.textContent = names[team - 1].charAt(type - 1);
                    currPiece.classList.add(`team-${team}`);
                    currPiece.classList.add(`col-${String.fromCharCode(65 + j)}`);
                    currPiece.classList.add(`row-${(i === 0) ? '' : '0'}${10 - i}`);
                    currPiece.addEventListener('click', (evt) => {
                        // evt.target is the target of the event (selected piece)
                        if (!(evt.target instanceof HTMLDivElement)) {
                            throw new Error("The piece clicked needs to be a div element");
                        }
                        // TODO: operateBoard();
                        this.selectPiece(evt.target);
                    });
                    pieces.appendChild(currPiece);
                }
            }
        }
        return pieces;
    }
    interpret() {
        return "";
    }
    update(status) {
        console.log('updating the board after the move');
    }
    recallMove() {
        console.log('recall the move...');
    }
    draw() {
        console.log('draw...');
    }
    resign() {
        console.log('resign...');
    }
    displayCheck() {
        console.log('display the check effect...');
    }
    displayCapture() {
        console.log('display the capture effect...');
    }
    displayFinish(winner) {
        console.log('wrapping up... Remove all control');
    }
    displayMoveFail(piece, wrongPos) {
        piece.classList.add('flashing');
        let piecePos = this.getPos(piece);
        let pieceRow = piecePos.substring(0, 2);
        let pieceCol = piecePos.substring(2);
        let wrongRow = wrongPos.substring(0, 2);
        let wrongCol = wrongPos.substring(2);
        piece.classList.replace('row-' + pieceRow, 'row-' + wrongRow);
        piece.classList.replace('col-' + pieceCol, 'col-' + wrongCol);
        setTimeout(() => {
            piece.classList.replace('row-' + wrongRow, 'row-' + pieceRow);
            piece.classList.replace('col-' + wrongCol, 'col-' + pieceCol);
            piece.classList.remove('flashing');
        }, 200);
    }
    getTeam(piece) {
        for (let i = 0; i < piece.classList.length; i++) {
            let currName = piece.classList[i];
            if (currName.startsWith('team-')) {
                let team = parseInt(currName.charAt(5));
                if (isNaN(team)) {
                    throw new Error('Unable to recognize the piece\'s team: ' + currName);
                }
                return parseInt(currName.charAt(5));
            }
        }
        throw new Error('The piece has no teams-related class on it');
    }
    selectPiece(target) {
        if (this._selected) {
            if (this.getTeam(target) !== this.getTeam(this._selected)) { // are rival
                // attempt to move and update according to status
                let startPos = this.getPos(this._selected);
                let endPos = this.getPos(target);
                let moveStr = startPos + endPos;
                let status = this._game.makeMove(moveStr);
                // TODO: NOW RETURN interpreted moveStr
                if (status === -1) {
                    this.displayMoveFail(this._selected, endPos);
                    console.log('fail to move ' + moveStr);
                }
                else {
                    let targetPos = this.getPos(target);
                    target.classList.add('captured');
                    target.classList.replace('col-' + targetPos.substring(2), 'col-X');
                    target.classList.replace('row-' + targetPos.substring(0, 2), 'row-00');
                    let selectedPos = this.getPos(this._selected);
                    this.makeMove(selectedPos, endPos);
                    this._selected = null;
                }
            }
            else if (target !== this._selected) {
                // there is selected & not rival:
                // if clicked on selected itself, deselect, otherwise change the selected
                this._selected.classList.remove('selected');
                target.classList.add('selected');
                this._selected = target;
            }
            else {
                this._selected.classList.remove('selected');
                this._selected = null;
            }
        }
        else {
            target.classList.add('selected');
            this._selected = target;
        }
    }
    selectSquare(target) {
        let squarePos = target.id.substring(7);
        let pieceInPos = qs(`#pieces > .rank-${squarePos.substring(0, 2)}.file-${squarePos.substring(2)}`);
        if (!pieceInPos) {
            if (this._selected) {
                let selectedPos = this.getPos(this._selected);
                let status = this._game.makeMove(selectedPos + squarePos);
                if (status === -1) {
                    console.log(`failed to move ${selectedPos + squarePos}`);
                    this.displayMoveFail(this._selected, squarePos);
                }
                else {
                    let selectedPos = this.getPos(this._selected);
                    this.makeMove(selectedPos, squarePos);
                    this._selected = null;
                }
            }
        }
        else {
            this.selectPiece(pieceInPos);
        }
    }
    getPos(piece) {
        let row = ''; // file
        let col = ''; // rank
        for (let i = 0; i < piece.classList.length; i++) {
            let currName = piece.classList[i];
            if (currName.startsWith('col-')) {
                col = currName.charAt(4);
            }
            else if (currName.startsWith('row-')) {
                row = currName.substring(4);
            }
        }
        let rowNum = parseInt(row);
        if (rowNum * (rowNum - 10) > 0 || !'ABCDEFGHI'.includes(col)) {
            throw new Error('Illegal piece position');
        }
        let coord = row + col;
        return coord;
    }
    // right now startPos must contain a piece
    makeMove(startPos, endPos) {
        let startPiece = qs(`#pieces > .row-${startPos.substring(0, 2)}.col-${startPos.charAt(2)}`);
        if (!startPiece) {
            throw new Error("No piece to move");
        }
        // no dot no ring: put the dot and ring.
        // dot and ring: remove previous dot and ring and add new.
        if (this._dotMark) {
            this._dotMark.classList.remove("markDot");
        }
        if (this._ringMark) {
            this._ringMark.classList.remove("markRing");
        }
        startPiece.classList.replace('col-' + startPos.substring(2), 'col-' + endPos.substring(2));
        startPiece.classList.replace('row-' + startPos.substring(0, 2), 'row-' + endPos.substring(0, 2));
        this._dotMark = id(`square-${startPos}`);
        this._dotMark.classList.add("markDot");
        setTimeout(() => {
            startPiece.classList.remove('selected');
            this._ringMark = id(`square-${endPos}`);
            this._ringMark.classList.add("markRing");
        }, 100);
    }
}
/**
 * Returns the element that has the ID attribute with the specified value,
 *  or null if not found.
 * @param {string} idName - element ID
 * @returns {HTMLElement} DOM object associated with id.
 */
function id(idName) {
    let result = document.getElementById(idName);
    if (!result) {
        throw new Error('Cannot find element with id ' + idName);
    }
    return result;
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
