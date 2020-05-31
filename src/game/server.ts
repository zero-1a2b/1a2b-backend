import { GameEvent, NewServerGameEvent, NormalEvent } from './logic/game.event';
import { Player } from './logic/player';
import { EventEmitter } from '../util/EventEmitter';
import { newServerGameEvent, ServerGame } from './logic/server-game';
import { ServerGameRequest, ServerGameRequestType } from './logic/server-game.request';
import { GameConfig } from './logic/game';


export enum GameState {
    READY,
    RUNNING,
    FINISHED
}

export class GameServer {

    static newGame(
        players: Player[],
        config: GameConfig,
        extra: {
            answer?: number[],
            players?: Player[]
        } = {}
    ): GameServer {
        return new GameServer(newServerGameEvent(players, config, extra));
    }


    public get state(): GameState { return this._state; }
    private _state: GameState;

    public readonly events: EventEmitter<GameEvent>;

    public get game(): ServerGame { return this._game; }
    private _game: ServerGame;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _timeout: any | undefined;


    constructor(start: NewServerGameEvent){
        this._state = GameState.READY;

        this.events = new EventEmitter();
        this._game = ServerGame.fromNewGameEvent(start);

        this._timeout = undefined;
    }

    // eventing

    acceptEvent(e: NormalEvent): void {
        this._game = this._game.handleEvent(e);
    }

    private emitEvent(e: NormalEvent): void {
        this.acceptEvent(e);
        this.events.emit(e);
    }

    // starting & stopping the game

    start(): void {
        switch(this._state) {
            case GameState.READY: {
                this.startTimeoutTimer();
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
        switch(this._state) {
            case GameState.RUNNING: {
                this.stopTimeoutTimer();
                //done
                this._state = GameState.FINISHED;
            }
                break;
            case GameState.FINISHED:
                //trivially success
                break;
            default:
                throw new Error(`unexpected game state ${this._state}, expecting ${GameState.RUNNING}`);
        }
    }

    // operations for calling

    handleRequest(req: ServerGameRequest): void {
      const ret = this._game.handleRequest(req);
      if(ret instanceof Error) {
        throw ret;
      }

      this.emitEvent(ret);
      this.resetTimeoutTimer();

      this.stopIfGameFinished();
    }

    private stopIfGameFinished(): void {
        if(this.game.isFinished()) {
            this.stop();
        }
    }

    // timer related code

    private resetTimeoutTimer(): void {
        this.stopTimeoutTimer();
        this.startTimeoutTimer();
    }

    private startTimeoutTimer(): void {
        if(this._timeout!=undefined) {
            throw new Error("there is already a timer!");
        }

        this._timeout = setTimeout(()=>{this.handleRequest({ type: ServerGameRequestType.TIMEOUT })}, this.game.config.playerTimeoutMillis);
    }

    private stopTimeoutTimer(): void {
        if(this._timeout==undefined) {
            throw new Error("there is no timer set!");
        }
        clearTimeout(this._timeout);
        this._timeout = undefined
    }

}
