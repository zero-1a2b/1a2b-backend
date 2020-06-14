import { Player } from './player';
import {
  GameEventType,
  NewGameEvent,
  NormalGameEvent,
} from './game.event';


/**
 * the game configuration class
 */
export interface GameConfig {

  /**
   * the time for a player to guess before timeout, in milliseconds
   */
  readonly playerTimeoutMillis: number

  /**
   * the length of the answer, acts like the difficulty
   */
  readonly answerLength: number;

}


/**
 * the client version of game, acts as a follower in state sync.
 */
export class Game {

    static DEFAULT_GAME_CONFIG: GameConfig = {
        answerLength: 4,
        playerTimeoutMillis: 20*1000
    };

    static fromNewGameEvent(e: NewGameEvent): Game {
        switch (e.type) {
            case GameEventType.NEW_GAME_CLIENT: {
                return new Game(e.players, 0, undefined, e.config);
            }
            case GameEventType.NEW_GAME_SERVER: {
                return new Game(e.players, 0, undefined, e.config);
            }
        }
    }


  constructor(
    /**
     * all the players in this game, ordered by the order of guessing
     */
    readonly players: Player[],
    /**
     * index into the players array, indicates who is currently guessing
     */
    readonly guesser: number,
    readonly winner: Player | undefined,
    readonly config: GameConfig,
  ) {}


    isFinished(): boolean {
        return this.winner != undefined;
    }


    handleEvent(e: NormalGameEvent): Game {
        switch (e.type) {
            case GameEventType.TIMEOUT: {
                return new Game(this.players, (this.guesser + 1) % this.players.length, this.winner, this.config)
            }
            case GameEventType.GUESS: {
                return new Game(this.players, (this.guesser + 1) % this.players.length, e.a === this.config.answerLength ? e.player : undefined, this.config)
            }
          default:
            throw new Error("error.unexpected_event_type");
        }
    }

}
