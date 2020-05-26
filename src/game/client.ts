import { NewClientGameEvent, NormalEvent, EventType, GuessEvent } from './logic/event';
import { GameState } from './server';
import { ClientGame } from './logic/game';

export class GameClient {

    static newGame(event: NewClientGameEvent): GameClient {
        return new GameClient(event);
    }


    public get state(): GameState { return this._state; }
    private _state: GameState;

    public get game(): ClientGame { return this._game; }
    private _game: ClientGame;


    constructor(start: NewClientGameEvent){
        this._state = GameState.READY;
        this._game = ClientGame.fromNewGameEvent(start);
    }


    acceptEvent(e: NormalEvent): void {
        this._game = this._game.handleEvent(e);
        if(this._state === GameState.READY) {
            this._state = GameState.RUNNING;
        }
        if(e.type === EventType.GUESS && (e as GuessEvent).a === this._game.config.answerLength) {
            this._state = GameState.FINISHED;
        }
    }

}
