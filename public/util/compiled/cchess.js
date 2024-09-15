class CChess {
    constructor(game) {
        this._game = game;
    }
    getGameElement() {
        return this._gameElement;
    }
}
export class DumbCChess extends CChess {
    constructor(game) {
        super(game);
        this._board = document.createElement('pre');
        this._input = document.createElement('input');
        this._input.type = 'text';
        this._input.minLength = 6;
        this._input.maxLength = 6;
        this._recall = document.createElement('button');
        this._recall.textContent = 'Recall last move';
        this._resign = document.createElement('button');
        this._resign.textContent = 'Resign';
        this._draw = document.createElement('button');
        this._draw.textContent = 'End with Draw';
        this._move = document.createElement('button');
        this._move.textContent = 'Make the Move';
        this._gameState = document.createElement('p');
        this._moveState = document.createElement('p');
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
        this._move.addEventListener('click', () => {
            let moveStr = this.interpret();
            if (moveStr !== '') {
                let status = this.playMove(moveStr);
                this.updateAfterMove(status, moveStr);
            }
        });
        this._recall.addEventListener('click', () => { this.recallMove(); });
        this._draw.addEventListener('click', () => { this.draw(); });
        this._resign.addEventListener('click', () => { this.resign(); });
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
    interpret() {
        return this._input.value;
    }
    playMove(moveStr) {
        let status = this._game.makeMove(moveStr);
        this._board.textContent = this._game.toString();
        return status;
    }
    updateAfterMove(status, moveStr) {
        this._gameState.textContent = "Current Player: " + this._game.getCurrPlayer();
        if (status === -1) {
            let displayed = (moveStr === "") ? "empty" : moveStr.toUpperCase();
            this._moveState.textContent = `Move [${displayed}] is not accepted`;
        }
        else if (status === 1) {
            this.displayCapture();
        }
        else if (status === 2) {
            this.displayCheck();
        }
        else if (status === 0) {
            this._moveState.textContent = '';
        }
        else {
            this._moveState.textContent = `Error: Status ${status} is not recognized.`;
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
        this._gameElement = this._gen('section');
        this._board = this._gen('section');
    }
    // <section id="board">
    //   <div></div>x90, with id square{rank}-{file}
    //   <section id="pieces">
    //     add elements based on layout like this:
    //     <div class="team-1 file-1 rank-4">兵</div>
    //   </section>
    // </section>
    _buildGameElement() {
    }
    interpret() {
        console.log('interpret the move');
        return "";
    }
    playMove(moveStr) {
        console.log('play move ' + moveStr);
        return 0;
    }
    updateAfterMove(status) {
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
    init() {
        this.populateBoard();
        let pieces = this._qsa('#pieces div');
        for (let i = 0; i < pieces.length; i++) {
            pieces[i].addEventListener('click', (evt) => {
                // evt.target is the target of the event (selected piece)
                if (!(evt.target instanceof HTMLElement)) {
                    throw new Error();
                }
                this.selectPiece(evt.target);
            });
        }
        let positions = this._qsa("#board > div");
        for (let i = 0; i < positions.length; i++) {
            positions[i].addEventListener('click', (evt) => {
                if (!(evt.target instanceof HTMLElement)) {
                    throw new Error();
                }
                this.selectSquare(evt.target);
            });
        }
    }
    // rank: 10th=0-8; 9th=9-17
    // file: 1=8,17,...; 2=7,16,...
    populateBoard() {
        let board = this._board;
        for (let i = 0; i < 90; i++) {
            let newItem = this._gen('div');
            let rank = 10 - Math.floor(i / 9);
            let file = 9 - i % 9;
            newItem.id = 'square' + rank + '-' + file;
            board.append(newItem);
        }
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
        let selected = this._qs('.selected');
        if (selected) {
            if (this.isRival(target, selected)) {
                let targetCoord = this.getCoordinates(target);
                target.classList.add('captured');
                target.classList.replace('file-' + targetCoord.file, 'file-0');
                target.classList.replace('rank-' + targetCoord.rank, 'rank-0');
                this.moveSelected(targetCoord);
            }
            else if (!target.classList.contains('selected')) {
                // there is selected & not rival:
                // if clicked on selected itself, deselect, otherwise change the selected
                selected.classList.remove('selected');
                target.classList.add('selected');
            }
            else {
                selected.classList.remove('selected');
            }
        }
        else {
            target.classList.add('selected');
        }
    }
    selectSquare(target) {
        let coordStr = target.id.substring(6);
        let squareCoord = {
            rank: parseInt(coordStr.substring(0, coordStr.indexOf('-'))),
            file: parseInt(coordStr.substring(coordStr.indexOf('-') + 1))
        };
        let pieceInPos = this._qs(`#pieces > .rank-${squareCoord.rank}.file-${squareCoord.file}`);
        if (!pieceInPos) {
            if (this._qs('.selected')) {
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
        let startPiece = this._qs(`#pieces > .rank-${startPos.rank}.file-${startPos.file}`);
        if (!startPiece) {
            throw new Error("No piece to move");
        }
        // no dot no ring: put the dot and ring.
        // dot and ring: remove previous dot and ring and add new.
        // if (this._qs(".markDot")) {
        //   this._qs(".markDot").classList.remove("markDot");
        // }
        // if (this._qs(".markRing")) {
        //   this._qs(".markRing").classList.remove("markRing");
        // }
        // startPiece.classList.replace('file-'+startPos.file, 'file-'+endPos.file);
        // startPiece.classList.replace('rank-'+startPos.rank, 'rank-'+endPos.rank);
        // id(`square${startPos.rank}-${startPos.file}`).classList.add("markDot");
        // setTimeout(() => {
        //   startPiece.classList.remove('selected');
        //   id(`square${endPos.rank}-${endPos.file}`).classList.add("markRing");
        // }, 200);
    }
    /**
     * Returns the element that has the ID attribute with the specified value,
     *  or null if not found.
     * @param {string} idName - element ID
     * @returns {HTMLElement} DOM object associated with id.
     */
    _id(idName) {
        return document.getElementById(idName);
    }
    /**
     * Returns the first element that matches the given CSS selector.
     * @param {string} selector - CSS query selector.
     * @returns {object} The first DOM object matching the query.
     */
    _qs(selector) {
        return document.querySelector(selector);
    }
    /**
     * Returns the array of elements that match the given CSS selector.
     * @param {string} selector - CSS query selector
     * @returns {object[]} array of DOM objects matching the query.
     */
    _qsa(selector) {
        return document.querySelectorAll(selector);
    }
    /**
     * Returns a new element with the given tag name.
     * @param {string} tagName - HTML tag name for new DOM element.
     * @returns {object} New DOM object for given HTML tag.
     */
    _gen(tagName) {
        return document.createElement(tagName);
    }
}
