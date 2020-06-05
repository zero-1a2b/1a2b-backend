import { Player } from './player';


export enum ServerGameRequestType {
  GUESS = "guess",
  TIMEOUT = "timeout"
}

export interface ServerGameRequest {

  readonly type: ServerGameRequestType

}

export interface GuessRequest extends ServerGameRequest {

  readonly type: ServerGameRequestType.GUESS;

  readonly guess: number[];

  readonly player: Player;

}

export interface TimeoutRequest extends ServerGameRequest {

  readonly type: ServerGameRequestType.TIMEOUT;

}
