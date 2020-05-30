import { GameEventType, GuessEvent, NewServerGameEvent, NormalEvent, TimeoutEvent } from './event';
import { zip } from 'lodash';
import { Player } from './player';
import { Game } from './game';


export enum ServerGameRequestType {
  GUESS,
  TIMEOUT
}

export interface ServerGameRequest {

  readonly type: ServerGameRequestType

}

export interface GuessRequest extends ServerGameRequest {

  readonly type: ServerGameRequestType.GUESS;

  readonly guess: number[];

  readonly player: Player;

}

export interface TimeoutRequest extends ServerGameRequest {

  readonly type: ServerGameRequestType.TIMEOUT;

}


export class ServerGame extends Game {

  static fromNewGameEvent(event: NewServerGameEvent): ServerGame {
    return new ServerGame(
      Game.fromNewGameEvent(event),
      event.answer,
      new Set(event.answer),
    );
  }


  constructor(
    game: Game,
    readonly answer: number[],
    readonly answerDigits: Set<number>,
  ) {
    super(game.players, game.winner, game.guesser, game.config);
  }


  handleRequest(req: ServerGameRequest): NormalEvent | Error {
    switch(req.type) {
      case ServerGameRequestType.GUESS:
        return this.guess(req as GuessRequest);
      case ServerGameRequestType.TIMEOUT:
        return this.timeout(req as TimeoutRequest);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private timeout(_req: TimeoutRequest): TimeoutEvent {
    return { type: GameEventType.TIMEOUT };
  }

  private guess(req: GuessRequest): GuessEvent | Error {
    if (this.isFinished()) {
      return Error('error.game_already_end');
    }
    if (this.players[this.guesser] !== req.player) {
      return Error('error.not_your_round');
    }

    const checked = this.checkGuess(req.guess);

    if (checked instanceof Error) {
      return checked;
    } else {
      return {
        type: GameEventType.GUESS,
        player: req.player,
        guess: req.guess,
        ...checked,
      };
    }
  }

  private checkGuess(guess: number[]): { a: number; b: number } | Error {
    if (guess.length !== this.answer.length) {
      return Error('error.answer_length_mismatch');
    }

    const a = zip(guess, this.answer)
      .filter(v => v[0] === v[1])
      .length
    ;

    const b = zip(guess, this.answer)
      .filter(v => v[0] !== v[1] && this.answerDigits.has(v[0]))
      .length
    ;

    return { a: a, b: b };
  }


  handleEvent(event: NormalEvent): ServerGame {
    return new ServerGame(
      super.handleEvent(event),
      this.answer,
      this.answerDigits,
    );
  }

}
