import { Player } from './player';
import { GameConfig } from './game';

// base interface //

export enum GameEventType {
    NEW_GAME_CLIENT = "new_game_client",
    NEW_GAME_SERVER = "new_game_server",
    TIMEOUT = "timeout",
    GUESS = "guess"
}

/**
 * represents a game event, you can only use it to manipulate game state
 */
export interface GameEvent {

    readonly type: GameEventType;

}

// new game events //

/**
 * represents a new game, represents the start of the game stream
 */
export type NewGameEvent = NewClientGameEvent | NewServerGameEvent;

export interface NewClientGameEvent extends GameEvent {

    readonly type: GameEventType.NEW_GAME_CLIENT;

    readonly players: Player[];

    readonly config: GameConfig;

}

export interface NewServerGameEvent extends GameEvent {

    readonly type: GameEventType.NEW_GAME_SERVER;

    readonly players: Player[];

    readonly config: GameConfig;

    readonly answer: number[];

}

export function mapToClient(server: NewServerGameEvent): NewClientGameEvent {
  return {
    type: GameEventType.NEW_GAME_CLIENT,
    config: server.config,
    players: server.players
  }
}

// normal game event //

/**
 * all other event's type
 */
export type NormalGameEvent = TimeoutEvent | GuessEvent;

/**
 * meaning the current player's round is out
 */
export interface TimeoutEvent extends GameEvent {

    readonly type: GameEventType.TIMEOUT;

}

/**
 * meaning a player have made a guess
 * @note the game will figure out who wins in this event
 */
export interface GuessEvent extends GameEvent {

    readonly type: GameEventType.GUESS;

    readonly player: Player;

    readonly guess: number[];

    readonly a: number;

    readonly b: number;

}
