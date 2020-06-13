import {
  GameEvent,
  GameEventType,
  GuessEvent,
  NewServerGameEvent,
  NormalGameEvent,
  TimeoutEvent,
} from './logic/game.event';
import { Player } from './logic/player';
import { EventEmitter } from '../util/EventEmitter';
import { newServerGameEvent, ServerGame } from './logic/server-game';
import { GameServerRequest, GuessRequest, ServerGameRequestType, TimeoutRequest } from './server.request';
import { GameConfig } from './logic/game';
import { zip } from 'lodash';
import { assertInternalSender, assertTrue, INTERNAL_SENDER, isPlayerSender, RequestSender } from '../util/sender';
import { GameState } from './game-state';
import { RepeatedTimer } from '../util/timer';


export class GameServer {

  static newGame(
    players: Player[],
    config: GameConfig,
    extra: {
      answer?: number[],
      players?: Player[]
    } = {},
  ): GameServer {
    return new GameServer(newServerGameEvent(players, config, extra));
  }


  public readonly events: EventEmitter<GameEvent>;

  private _state: GameState;
  public get state(): GameState {
    return this._state;
  }

  private _game: ServerGame;
  public get game(): ServerGame {
    return this._game;
  }

  private _timeout: RepeatedTimer;


  constructor(start: NewServerGameEvent) {
    this.events = new EventEmitter();

    this._state = GameState.READY;
    this._game = ServerGame.fromNewGameEvent(start);

    this._timeout = new RepeatedTimer(
      this.game.config.playerTimeoutMillis,
      true,
      ()=>this.handleRequest({ type: ServerGameRequestType.TIMEOUT }, INTERNAL_SENDER)
    );
  }

  // eventing

  acceptEvent(e: NormalGameEvent): void {
    switch (e.type) {
      case GameEventType.TIMEOUT:
        this._timeout.reset();
        break;
      case GameEventType.GUESS:
        this._timeout.reset();
        break;
    }

    this._game = this._game.handleEvent(e);

    if (this.game.isFinished()) {
      this.stop();
    }
  }

  private emitEvent(e: NormalGameEvent): void {
    this.acceptEvent(e);
    this.events.emit(e);
  }

  // starting & stopping the game

  start(): void {
    switch (this._state) {
      case GameState.READY: {
        this._timeout.start();
        //done
        this._state = GameState.RUNNING;
      }
        break;
      case GameState.RUNNING:
        //trivially success
        break;
      default:
        throw new Error(`unexpected game state ${this._state}, expecting ${GameState.READY}`);
    }
  }

  stop(): void {
    switch (this._state) {
      case GameState.RUNNING: {
        this._timeout.stop();
        this._state = GameState.FINISHED;
      }
        break;
      case GameState.READY:
        this._state = GameState.FINISHED;
        break;
      case GameState.FINISHED:
        //trivially success
        break;
    }
  }

  // operations for request handling

  handleRequest(req: GameServerRequest, sender: RequestSender): void {
    let ret: Array<NormalGameEvent>;
    switch (req.type) {
      case ServerGameRequestType.GUESS: {
        ret = this.wrap(this.guess(req as GuessRequest, sender));
        break;
      }
      case ServerGameRequestType.TIMEOUT: {
        ret = this.wrap(this.timeout(req as TimeoutRequest, sender));
        break;
      }
    }

    ret.forEach(v=>this.emitEvent(v));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private timeout(_req: TimeoutRequest, sender: RequestSender): TimeoutEvent {
    assertInternalSender(sender);
    return { type: GameEventType.TIMEOUT };
  }

  private guess(req: GuessRequest, sender: RequestSender): GuessEvent {
    assertTrue(isPlayerSender(sender) && sender.player === req.player);

    if (this.game.isFinished()) {
      throw Error('error.game_already_end');
    }
    if (this.game.players[this.game.guesser] !== req.player) {
      throw Error('error.not_your_round');
    }

    const checked = this.checkGuess(req.guess);

    return {
      type: GameEventType.GUESS,
      player: req.player,
      guess: req.guess,
      ...checked,
    };
  }

  private checkGuess(guess: number[]): { a: number; b: number } {
    if (guess.length !== this.game.answer.length) {
      throw Error('error.answer_length_mismatch');
    }

    const a = zip(guess, this.game.answer)
      .filter(v => v[0] === v[1])
      .length
    ;

    const b = zip(guess, this.game.answer)
      .filter(v => v[0] !== v[1] && this.game.answerDigits.has(v[0]))
      .length
    ;

    return { a: a, b: b };
  }

  private wrap(e: Array<NormalGameEvent> | NormalGameEvent | null): Array<NormalGameEvent> {
    if(e === null) {
      return [];
    } else if(e instanceof Array) {
      return e;
    } else {
      return [e];
    }
  }

}
