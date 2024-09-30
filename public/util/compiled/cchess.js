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
    //   <div></div>x90, with id square{rank}-{file}
    //   <section id="pieces">
    //     add elements based on layout like this:
    //     <div class="team-1 file-1 rank-4">兵</div>
    //   </section>
    // </section>
    _buildGameElement() {
        let result = gen('section');
        result.id = 'board';
        result.translate = false;
        // rank: 10th=0-8; 9th=9-17
        // file: 1=8,17,...; 2=7,16,...
        for (let i = 0; i < 90; i++) {
            let currSquare = gen('div');
            let rank = 10 - Math.floor(i / 9);
            let file = 9 - i % 9;
            currSquare.id = `square${rank}-${file}`;
            currSquare.addEventListener('click', (evt) => {
                if (!(evt.target instanceof HTMLDivElement)) {
                    throw new Error("How is this not a div??");
                }
                this.selectSquare(evt.target);
            });
            result.append(currSquare);
        }
        let pieces = gen('section');
        pieces.id = 'pieces';
        // add elements based on layout
        let layout = this._game.getLayout();
        let redTypes = '車馬炮仕相兵帥';
        let blackTypes = '車馬炮士象卒將';
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 9; j++) {
                let pieceNum = layout[i][j];
                if (pieceNum !== 0) {
                    let team = Math.floor(pieceNum / 10);
                    let type = pieceNum % 10 - 1;
                    let currPiece = gen('div');
                    currPiece.textContent = (team === 1) ?
                        redTypes.charAt(type) : blackTypes.charAt(type);
                    currPiece.classList.add(`team-${team}`);
                    currPiece.classList.add(`file-${9 - j}`);
                    currPiece.classList.add(`rank-${10 - i}`);
                    currPiece.addEventListener('click', (evt) => {
                        // evt.target is the target of the event (selected piece)
                        if (!(evt.target instanceof HTMLDivElement)) {
                            throw new Error("How did you click this?");
                        }
                        this.selectPiece(evt.target);
                    });
                    pieces.appendChild(currPiece);
                }
            }
        }
        result.appendChild(pieces);
        return result;
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
    displayMoveFail() {
    }
    isRival(pieceA, pieceB) {
        if ((!pieceA.classList.contains("team-1") && !pieceA.classList.contains("team-2")) ||
            (!pieceB.classList.contains("team-1") && !pieceB.classList.contains("team-2"))) {
            throw new Error("One of the pieces has no teams. Cannot determine rival status.");
        }
        let aInOne = pieceA.classList.contains("team-1");
        let bInOne = pieceB.classList.contains("team-1");
        return (aInOne && !bInOne) || (!aInOne && bInOne);
    }
    selectPiece(target) {
        if (this._selected) {
            if (this.isRival(target, this._selected)) {
                // attempt to move and update according to status
                let startCoord = this.getCoordinates(this._selected);
                let srow = ((startCoord.rank < 10) ? '0' : '') + startCoord.rank;
                let scol = 'ABCDEFGHI'.charAt(9 - startCoord.file);
                let endCoord = this.getCoordinates(target);
                let erow = ((endCoord.rank < 10) ? '0' : '') + endCoord.rank;
                let ecol = 'ABCDEFGHI'.charAt(9 - endCoord.file);
                let moveStr = srow + scol + erow + ecol; // TODO: change format of move
                // TODO: NOW RETURN interpreted moveStr
                // let targetCoord = this.getCoordinates(target);
                // target.classList.add('captured');
                // target.classList.replace('file-'+targetCoord.file, 'file-0');
                // target.classList.replace('rank-'+targetCoord.rank, 'rank-0');
                // this.moveSelected(targetCoord);
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
        let coordStr = target.id.substring(6);
        let squareCoord = {
            rank: parseInt(coordStr.substring(0, coordStr.indexOf('-'))),
            file: parseInt(coordStr.substring(coordStr.indexOf('-') + 1))
        };
        let pieceInPos = qs(`#pieces > .rank-${squareCoord.rank}.file-${squareCoord.file}`);
        if (!pieceInPos) {
            if (qs('.selected')) {
                this.moveSelected(squareCoord);
            }
        }
        else {
            this.selectPiece(pieceInPos);
        }
    }
    getCoordinates(piece) {
        let fl = 0; // file
        let rk = 0; // rank
        for (let i = 0; i < piece.classList.length; i++) {
            if (piece.classList[i].startsWith('file-')) {
                fl = parseInt(piece.classList[i].substring(5));
            }
            else if (piece.classList[i].startsWith('rank-')) {
                rk = parseInt(piece.classList[i].substring(5));
            }
        }
        if (fl <= 0 || rk <= 0 || fl > 9 || rk > 10) {
            throw new Error('Illegal piece position');
        }
        let coord = { rank: rk, file: fl };
        return coord;
    }
    moveSelected(endPos) {
        if (!this._selected) {
            throw new Error("No selected piece to move");
        }
        let selectedPos = this.getCoordinates(this._selected);
        this.makeMove(selectedPos, endPos);
    }
    // right now startPos must contain a piece
    makeMove(startPos, endPos) {
        let startPiece = qs(`#pieces > .rank-${startPos.rank}.file-${startPos.file}`);
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
        startPiece.classList.replace('file-' + startPos.file, 'file-' + endPos.file);
        startPiece.classList.replace('rank-' + startPos.rank, 'rank-' + endPos.rank);
        this._selected = null; // TODO: why selected in here?
        this._dotMark = id(`square${startPos.rank}-${startPos.file}`);
        this._dotMark.classList.add("markDot");
        setTimeout(() => {
            startPiece.classList.remove('selected');
            this._ringMark = id(`square${endPos.rank}-${endPos.file}`);
            this._ringMark.classList.add("markRing");
        }, 200);
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
