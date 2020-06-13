import { NewClientGameEvent, NormalGameEvent } from './logic/game.event';
import { ClientGame } from './logic/client-game';
import { GameState } from './game-state';


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


    acceptEvent(e: NormalGameEvent): void {
        this._game = this._game.handleEvent(e);
        //side-effects
        if(this._state === GameState.READY) {
            this._state = GameState.RUNNING;
        }
        if(this._game.isFinished()) {
            this._state = GameState.FINISHED;
        }
    }

}
