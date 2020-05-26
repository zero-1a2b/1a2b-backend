import { ServerGame, GuessRequest } from "./logic/game";
import { GameEvent, EventType, NewServerGameEvent, NormalEvent, GameConfig } from './logic/event';
import { Player } from './logic/player';
import { shuffle, take } from 'lodash';
import { EventEmitter } from '../util/EventEmitter';


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
        if(!( 0< config.answerLength && config.answerLength<10 )) {
            throw Error(`answer length ${config.answerLength} is not in range [1,9]`);
        }
        if(config.playerTimeoutMillis<=0) {
            throw Error('player timeout must be greater than zero!');
        }
        if(players.length==0) {
            throw Error(`players cannot be empty!`);
        }

        let shuffledNumbers = []
        if(extra.answer!==undefined) {
            if(extra.answer.length != config.answerLength) {
                throw Error("the length of given answer is not equal to config ");
            }
            shuffledNumbers = extra.answer
        } else {
            shuffledNumbers = take(shuffle([1,2,3,4,5,6,7,8,9]), config.answerLength)
        }

        let shuffledPlayers = []
        if(extra.players!==undefined) {
            shuffledPlayers = extra.players
        } else {
            shuffledPlayers = shuffle(players)
        }

        const event: NewServerGameEvent = {
            type: EventType.NEW_GAME_SERVER,
            answer: shuffledNumbers,
            players: shuffledPlayers,
            config: config
        }

        return new GameServer(event);
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

    makeGuess(req: GuessRequest): void {
        const ret = this._game.makeGuess(req)
        if(ret instanceof Error) {
            throw ret;
        }

        this.emitEvent(ret);
        this.resetTimeoutTimer();

        this.stopIfGameFinished();
    }

    private timeoutPlayer(): void {
        this.emitEvent({
            type: EventType.TIMEOUT
        });

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

        this._timeout = setTimeout(()=>{this.timeoutPlayer()}, this.game.config.playerTimeoutMillis);
    }

    private stopTimeoutTimer(): void {
        if(this._timeout==undefined) {
            throw new Error("there is no timer set!");
        }
        clearTimeout(this._timeout);
        this._timeout = undefined
    }

}
