/**
 *
 * combines game-manager, board, piece, control together.
 */
import {AbstractGame, CasualSandbox} from "./AbstractGame";

abstract class CChess {
  _game: CasualSandbox;
  abstract _gameElement: HTMLElement;
  constructor(game: CasualSandbox) {
    this._game = game;
  }
  abstract interpret(): string;
  getGameElement(): HTMLElement {
    return this._gameElement;
  }
  operateBoard() {
    let moveStr = this.interpret();
    if (moveStr !== '') {
      let status = this._game.makeMove(moveStr);
      this.update(status, moveStr);
    }
  }
  abstract update(status: number, moveStr: string): void;
  abstract recallMove(): void;
  abstract draw(): void;
  abstract resign(): void;
  abstract displayCheck(): void;
  abstract displayCapture(): void;
  abstract displayFinish(winner: number): void;
}

export class DumbCChess extends CChess {
  _gameElement: HTMLElement;
  // _game: CasualSandbox;
  _board: HTMLPreElement;
  _input: HTMLInputElement;
  _recall: HTMLButtonElement;
  _resign: HTMLButtonElement;
  _draw: HTMLButtonElement;
  _move: HTMLButtonElement;
  _gameState: HTMLParagraphElement;
  _moveState: HTMLParagraphElement;

  constructor(game: CasualSandbox) {
    super(game);
    this._board = gen('pre') as HTMLPreElement;
    this._input = gen('input') as HTMLInputElement;
    this._input.type = 'text';
    this._input.minLength = 6;
    this._input.maxLength = 6;
    this._recall = gen('button') as HTMLButtonElement;
    this._recall.textContent = 'Recall last move';
    this._resign = gen('button') as HTMLButtonElement;
    this._resign.textContent = 'Resign';
    this._draw = gen('button') as HTMLButtonElement;
    this._draw.textContent = 'End with Draw';
    this._move = gen('button') as HTMLButtonElement;
    this._move.textContent = 'Make the Move';
    this._gameState = gen('p') as HTMLParagraphElement;
    this._moveState = gen('p') as HTMLParagraphElement;
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
  private _buildGameElement(): HTMLElement {
    let result: HTMLElement = document.createElement('section');
    result.appendChild(this._board);
    result.appendChild(this._gameState);
    result.appendChild(this._moveState);
    let label = document.createElement('label');
    label.textContent = 'Next Move:'
    label.appendChild(this._input);
    result.appendChild(label);
    result.appendChild(this._move);
    result.appendChild(this._recall);
    result.appendChild(this._draw);
    result.appendChild(this._resign);
    return result;
  }

  private _setup(): void {
    // game not over then iterate:
    // update the board and the message
    // make the move (wait for the button). If fail then do it again until successful
    // after the loop: find the winner and put it in message board
    this._board.textContent = this._game.toString();
    this._gameState.textContent = "Current Player: " + this._game.getCurrPlayer();
    // annonymous function is necessary otherwise the meaning of this will not
    // be the object but the button pressed
    this._move.addEventListener('click', this.operateBoard);
    this._recall.addEventListener('click', () => {this.recallMove();});
    this._draw.addEventListener('click', () => {this.draw();});
    this._resign.addEventListener('click', () => {this.resign();});
  }

  interpret(): string {
      return this._input.value;
  }

  displayFinish(winner: number): void {
    this._gameState.textContent = (winner === 0) ?
        "It is a draw! Refresh the page to play again." :
        `The winner is ${winner}! Refresh the page to play again.`;
    this._input.disabled = true;
    this._move.disabled = true;
    this._recall.disabled = true;
    this._resign.disabled = true;
    this._draw.disabled = true;
  }

  displayCapture(): void {
    this._moveState.textContent = 'Capture!';
  }

  displayCheck(): void {
    this._moveState.textContent = 'Check!';
  }

  update(status: number, moveStr: string): void {
    this._gameState.textContent = "Current Player: " + this._game.getCurrPlayer();
    if (status !== -1 && status !== 0 && status !== 1 && status !== 2) {
      this._moveState.textContent = `Error: Status ${status} is not recognized.`;
    }
    if (status === -1) {
      let displayed = (moveStr === "") ? "empty" : moveStr.toUpperCase();
      this._moveState.textContent = `Move [${displayed}] is not accepted`;
    } else {
      this._board.textContent = this._game.toString();
      if (status === 1) {
        this.displayCapture();
      } else if (status === 2) {
        this.displayCheck();
      } else {this._moveState.textContent = '';}
    }
    this._input.value = '';
    // check if game ends
    if (this._game.isGameOver()) {
      this.displayFinish(this._game.getWinner());
    }
  }

  recallMove(): void {
    let status = this._game.recallMove();
    if (status) {
      this._board.textContent = this._game.toString();
      this._gameState.textContent = "Current Player: " + this._game.getCurrPlayer();
      this._moveState.textContent = 'Move recalled!';
    } else {
      this._moveState.textContent = 'There is no reverse available.';
    }
  }

  draw(): void {
    this._game.draw();
    this.displayFinish(this._game.getWinner());
  }

  resign(): void {
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
  _selected: HTMLDivElement | null;
  // _game: CasualSandbox;
  _gameElement: HTMLElement;
  _dotMark: HTMLDivElement | null;
  _ringMark: HTMLDivElement | null;

  constructor(game: CasualSandbox) {
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
  private _buildGameElement(): HTMLElement {
    let result: HTMLElement = gen('section');
    result.id = 'board';
    result.translate = false;
    // row: 10th=0-8; 9th=9-17
    // col: 65/A=0,9,...; 66/B=1,10,...
    for (let i = 0; i < 90; i++) {
      let currSquare = gen('div');
      let row = 10 - Math.floor(i / 9);
      let col = String.fromCharCode(65 + i % 9);
      currSquare.id = `square-${(row === 10) ? '' : '0'}${row}${col}`;
      currSquare.addEventListener('click', (evt: Event) => {
        if (!(evt.target instanceof HTMLDivElement)) {
          throw new Error("The square clicked needs to be a div element");
        }
        this.selectSquare(evt.target);
      });
      result.append(currSquare);
    }
    let pieces = gen('section');
    pieces.id = 'pieces';
    // add elements based on layout
    let layout: number[][] = this._game.getLayout();
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
          currPiece.classList.add(`col-${String.fromCharCode(65 + j)}`);
          currPiece.classList.add(`row-${(i === 0) ? '' : '0'}${10 - i}`);
          currPiece.addEventListener('click', (evt:Event) => {
            // evt.target is the target of the event (selected piece)
            if (!(evt.target instanceof HTMLDivElement)) {
              throw new Error("The piece clicked needs to be a div element");
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

  interpret(): string {
    return "";
  }

  update(status: number): void {
    console.log('updating the board after the move')
  }

  recallMove(): void {
    console.log('recall the move...');
  }

  draw(): void {
    console.log('draw...');
  }

  resign(): void {
    console.log('resign...');
  }

  displayCheck(): void {
    console.log('display the check effect...');
  }

  displayCapture(): void {
    console.log('display the capture effect...');
  }

  displayFinish(winner: number): void {
    console.log('wrapping up... Remove all control')
  }

  displayMoveFail(): void {

  }

  isRival(pieceA: HTMLDivElement, pieceB: HTMLDivElement): boolean {
    if ((!pieceA.classList.contains("team-1") && !pieceA.classList.contains("team-2")) ||
        (!pieceB.classList.contains("team-1") && !pieceB.classList.contains("team-2"))) {
      throw new Error("One of the pieces has no teams. Cannot determine rival status.");
    }
    let aInOne: boolean = pieceA.classList.contains("team-1");
    let bInOne: boolean = pieceB.classList.contains("team-1");
    return (aInOne && !bInOne) || (!aInOne && bInOne);
  }

  selectPiece(target: HTMLDivElement) {
    if (this._selected) {
      if (this.isRival(target, this._selected)) {
        // attempt to move and update according to status
        let startPos = this.getPos(this._selected);
        let endPos = this.getPos(target);
        let moveStr = startPos + endPos;
        let status = this._game.makeMove(moveStr);
        // TODO: NOW RETURN interpreted moveStr
        if (status === -1) {
          console.log('fail to move '+moveStr);
        } else {
          let targetPos = this.getPos(target);
          target.classList.add('captured');
          target.classList.replace('col-'+targetPos.substring(2), 'col-X');
          target.classList.replace('row-'+targetPos.substring(0,2), 'row-00');
          this.moveSelected(targetPos);
        }
      } else if (target !== this._selected) {
        // there is selected & not rival:
        // if clicked on selected itself, deselect, otherwise change the selected
        this._selected.classList.remove('selected');
        target.classList.add('selected');
        this._selected = target;
      } else {
        this._selected.classList.remove('selected');
        this._selected = null;
      }
    } else {
      target.classList.add('selected');
      this._selected = target;
    }
  }

  selectSquare(target: HTMLDivElement) {
    let squarePos: string = target.id.substring(7);
    let pieceInPos = qs(`#pieces > .rank-${squarePos.substring(0,2)}.file-${squarePos.substring(2)}`) as HTMLDivElement;
    if (!pieceInPos) {
      if (qs('.selected')) {
        let selectedPos = this.getPos(qs('.selected') as HTMLDivElement);
        let status = this._game.makeMove(selectedPos+squarePos);
        if (status === -1) {
          console.log(`failed to move ${selectedPos + squarePos}`);
        } else {
          this.moveSelected(squarePos);
        }
      }
    } else {
      this.selectPiece(pieceInPos);
    }
  }

  getPos(piece: HTMLDivElement): string {
    let row = '';  // file
    let col = '';  // rank
    for (let i = 0; i < piece.classList.length; i++) {
      let currName = piece.classList[i];
      if (currName.startsWith('col-')) {
        col = currName.charAt(4);
      } else if (currName.startsWith('row-')) {
        row = currName.substring(4);
      }
    }
    let rowNum = parseInt(row);
    if (rowNum * (rowNum - 10) > 0 || !'ABCDEFGHI'.includes(col)) {
      throw new Error('Illegal piece position');
    }
    let coord: string = row + col;
    return coord;
  }

  // remove this useless method
  moveSelected(endPos: string) {
    if (!this._selected) {
      throw new Error("No selected piece to move");
    }
    let selectedPos = this.getPos(this._selected);
    this.makeMove(selectedPos, endPos);
    this._selected = null;
  }

  // right now startPos must contain a piece
  makeMove(startPos: string, endPos: string) {
    let startPiece = qs(`#pieces > .row-${startPos.substring(0,2)}.col-${startPos.charAt(2)}`);
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
    startPiece.classList.replace('col-'+startPos.substring(2), 'col-'+endPos.substring(2));
    startPiece.classList.replace('row-'+startPos.substring(0,2), 'row-'+endPos.substring(0,2));
    this._dotMark = id(`square-${startPos}`) as HTMLDivElement;
    this._dotMark.classList.add("markDot");
    setTimeout(() => {
      startPiece.classList.remove('selected');
      this._ringMark = id(`square-${endPos}`) as HTMLDivElement;
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
function id(idName: string): HTMLElement {
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
function qs(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

/**
 * Returns the array of elements that match the given CSS selector.
 * @param {string} selector - CSS query selector
 * @returns {object[]} array of DOM objects matching the query.
 */
function qsa(selector: string): NodeListOf<HTMLElement> {
  return document.querySelectorAll(selector);
}

/**
 * Returns a new element with the given tag name.
 * @param {string} tagName - HTML tag name for new DOM element.
 * @returns {object} New DOM object for given HTML tag.
 */
function gen(tagName: string): HTMLElement {
  return document.createElement(tagName);
}