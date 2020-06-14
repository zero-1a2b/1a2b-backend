import { Player } from './logic/player';

// base interface //

export enum ServerGameRequestType {
  GUESS = "guess",
  TIMEOUT = "timeout"
}

export interface GameServerRequest {

  readonly type: ServerGameRequestType

}


/**
 * represents a player's guess
 * @note security: the player must match the sender's player name
 */
export interface GuessRequest extends GameServerRequest {

  readonly type: ServerGameRequestType.GUESS;

  readonly guess: number[];

  readonly player: Player;

}

/**
 * represents a player's guess
 * @note security: only SYSTEM(INTERNAL_SENDER) can send this request
 */
export interface TimeoutRequest extends GameServerRequest {

  readonly type: ServerGameRequestType.TIMEOUT;

}
