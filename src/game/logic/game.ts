import { Player } from './player';
import {
  GameConfig,
  GameEventType,
  GuessEvent,
  NewClientGameEvent,
  NewGameEvent,
  NewServerGameEvent,
  NormalEvent,
} from './game.event';


export class Game {

    static DEFAULT_GAME_CONFIG: GameConfig = {
        answerLength: 4,
        playerTimeoutMillis: 60*1000
    };

    static fromNewGameEvent(event: NewGameEvent): Game {
        switch (event.type) {
            case GameEventType.NEW_GAME_CLIENT: {
                const e = event as NewClientGameEvent;
                return new Game(
                    e.players,
                    undefined,
                    0,
                    e.config
                );
            }
            case GameEventType.NEW_GAME_SERVER: {
                const e = event as NewServerGameEvent;
                return new Game(
                    e.players,
                    undefined,
                    0,
                    e.config
                );
            }
        }
    }


    constructor(
        readonly players: Player[],
        readonly winner: Player | undefined,
        readonly guesser: number,
        readonly config: GameConfig
    ) {}


    isFinished(): boolean {
        return this.winner != undefined;
    }


    handleEvent(event: NormalEvent): Game {
        switch (event.type) {
            case GameEventType.TIMEOUT: {
                return new Game(
                    this.players,
                    this.winner,
                    (this.guesser+1) % this.players.length,
                    this.config
                )
            }
            case GameEventType.GUESS: {
                const e = event as GuessEvent;
                return new Game(
                    this.players,
                    e.a === this.config.answerLength ? e.player : undefined,
                    (this.guesser+1) % this.players.length,
                    this.config
                )
            }
        }
    }

}

