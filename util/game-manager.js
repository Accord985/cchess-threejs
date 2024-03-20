/**
 *
 * creates an instance of a game. Decides the rule of the game, and responsible for the status
 *   including the current moving player, winner, and whether the game has ended.
 * GameManager(base) ==> OfficialGM; CasualGM; DoubleStepGM; ThreePlayerGM
 *
 * GameManager:
 * fields: layout, currentPlayer, lastMove, lastCaptured, winner, static types
 *
 * checkPieceAt(): returns the piece at the position. if nothing returns 0
 */
export class GameManager {
  #layout;  // 2D array (10*9) of the game layout.
  #currentPlayer;  // # of the currently moving player. Only 1 or 2 (or 3 if 3 players)
  #lastMove;
  #lastCaptured;
  #winner;  // -1=not ended; 0=draw, not 0 = # of the winner
  static #types = "-RNCGEPK";

  // 12=team1,type2
  // team[-1]=stone's team; team[9]=hostile neutral's team
  // 1=R 2=N 3=C 4=G 5=E 6=P 7=K
  // 1st row = black home; 10th row = red home; 1st column = 九 for red
  constructor() {
    this.#layout = [
      [21,22,25,24,27,24,25,22,21],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 23,0, 0, 0, 0, 0, 23,0],
      [26,0, 26,0, 26,0, 26,0, 26],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [16,0, 16,0, 16,0, 16,0, 16],
      [0, 13,0, 0, 0, 0, 0, 13,0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [11,12,15,14,17,14,15,12,11]
    ];
    this.#lastMove = "";
    this.#lastCaptured = 0;
    this.#currentPlayer = 1;
    this.#winner = -1;
  }

  /**
   * 10 2R 2N 2E ...
   * 09 00
   * 08
   *  ...
   * 01
   *    .A .B .C .D .E .F .G .H .I
   */
  toString() {
    let result = "";
    for (let i = 0; i < 10; i++) {
      result += (i === 0) ? " " : " 0";
      result += (10 - i);
      for (let j = 0; j < 9; j++) {
        let curr = this.#layout[i][j];
        result += " ";
        let team = Math.floor(curr / 10);
        let type = curr % 10;
        result += (team === 0) ? "-" : team;
        result += GameManager.#types.charAt(type);
      }
      result += "\n";
    }
    result += "     A  B  C  D  E  F  G  H  I\n";
    return result;
  }

  isGameOver() {
    return this.#winner !== -1;
  }

  getWinner() {
    if (this.#winner === -1) {
      print("The game has not ended.");
    }
    return this.#winner;
  }

  getNextPlayer() {
    return (this.#currentPlayer === 2) ? 1 : (this.#currentPlayer + 1);
  }

  // pre: move has to be valid (not validated in this method) in "03h03e" format (from 3H to 3E)
  // if it's a check/capture, indicate that with return
  makeMove(moveStr) {
    let move = this.#intepretMove(moveStr);
    if (this.validateMove(move)) {
      this.#lastCaptured = this.#layout[move.er][move.ec];
      this.#layout[move.er][move.ec] = this.#layout[move.sr][move.sc];
      this.#layout[move.sr][move.sc] = 0;
      this.#lastMove = moveStr;
      this.#currentPlayer = this.getNextPlayer();
    } else {
      console.log("Move not accepted.");
    }

  }

  /**
   * sr=start row, sc=start column, er=end row, ec=end column
   * ascii: A=65,B=66,...
   * @param {*} move
   * @returns
   */
  #intepretMove(move) {
    let result = {
      sr: 10 - parseInt(move.substring(0,2)),
      sc: move.charAt(2).toUpperCase().charCodeAt() - 65,
      er: 10 - parseInt(move.substring(3,5)),
      ec: move.charAt(5).toUpperCase().charCodeAt() - 65
    };
    return result;
  }

  recallMove() {
    if (this.#lastMove !== "") {
      let move = this.#intepretMove(this.#lastMove);
      this.#layout[move.sr][move.sc] = this.#layout[move.er][move.ec];
      this.#layout[move.er][move.ec] = this.#lastCaptured;
      this.#lastCaptured = 0;
      this.#lastMove = "";
      this.#currentPlayer = (this.#currentPlayer === 1) ? 2 : (this.#currentPlayer - 1);
    } else {
      console.log("There is no reverse available.");  // cannot reverse more than once/ at the start of the game
    }
  }

  // move has to be 2 valid positions. 01-10,A-I. Any combination
  // return true if validated, false otherwise
  validateMove(move) {
    // validate input.    * a<=x<=b <=> (x-a)(x-b)<=0
    if (move.sr * (move.sr - 9) > 0 || move.er * (move.er - 9) > 0 ||
          move.sc * (move.sc - 8) > 0 || move.ec * (move.ec - 8) > 0) {
      throw new Error(`Illegal Move: Array Notation (${move.sr}, ${move.sc}) to (${move.er}, ${move.ec})`);
    }

    // check start: must be ally [don't care about stone yet]
    if (Math.floor(this.#layout[move.sr][move.sc] / 10) !== this.#currentPlayer) {
      console.log(this.#currentPlayer);
      console.log("You cannot move this piece.")
      return false;
    }

    // check end: must be empty/enemy & different from start
    if (this.#layout[move.er][move.ec] !== 0)

    // check rule:
    //    R: nothing in between
    //    C: end empty: nothing in between; end enemy: 1 piece in between
    //    N: 1x2 & no piece at the block pos
    //    G: within palace of its side (calculated from its pos), 1x1 move
    //    E: stay in its side, 2x2 move, no piece at block pos. Or end enemy king & nothing in between
    //    K: within palace its side, 1x0 move
    //    P: forward 1, or on opponent side (calculated from king pos & its pos) left & right
    return true;
  }

  giveValidPos(pos) {
    // check start: must be ally.
    // check the positions. do it for 4 directions.
    //    R: while up is empty/bound, add & move 1 up. add upper piece (if not out of bound) if enemy.
    //    C: while up is empty/bound, add & move 1 up. move up 1 piece (if not out of bound).
    //       while up is empty/bound, move 1 up. add upper piece (if not out of bound) if enemy.
    //    N: up 1 (if not oob) check if there's any piece. if not, add 2 pos [up2,left&right1] (if not oob)
    //    E: up1,right1 (if not oob) check if there's any piece. if not, add [up2,right2] (if not oob)
    //    G: add up1,right1 (if not oob[palace this side]) if enemy/empty
    //    P: add up1 if enemy/empty. If crossed river add left&right1 if enemy/empty
    //    K: add up1 (if not oob[palace this side]) if enemy/empty
  }
}