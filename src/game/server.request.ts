import { Player } from './logic/player';


export enum ServerGameRequestType {
  GUESS = "guess",
  TIMEOUT = "timeout"
}

export interface GameServerRequest {

  readonly type: ServerGameRequestType

}

export interface GuessRequest extends GameServerRequest {

  readonly type: ServerGameRequestType.GUESS;

  readonly guess: number[];

  readonly player: Player;

}

export interface TimeoutRequest extends GameServerRequest {

  readonly type: ServerGameRequestType.TIMEOUT;

}
