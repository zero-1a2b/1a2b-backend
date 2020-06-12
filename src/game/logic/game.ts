import { Player } from './player';
import {
  GameEventType,
  NewGameEvent,
  NormalGameEvent,
} from './game.event';


export interface GameConfig {

  readonly playerTimeoutMillis: number

  readonly answerLength: number;

}


export class Game {

    static DEFAULT_GAME_CONFIG: GameConfig = {
        answerLength: 4,
        playerTimeoutMillis: 20*1000
    };

    static fromNewGameEvent(e: NewGameEvent): Game {
        switch (e.type) {
            case GameEventType.NEW_GAME_CLIENT: {
                return new Game(
                    e.players,
                    undefined,
                    0,
                    e.config
                );
            }
            case GameEventType.NEW_GAME_SERVER: {
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


    handleEvent(e: NormalGameEvent): Game {
        switch (e.type) {
            case GameEventType.TIMEOUT: {
                return new Game(
                    this.players,
                    this.winner,
                    (this.guesser+1) % this.players.length,
                    this.config
                )
            }
            case GameEventType.GUESS: {
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

