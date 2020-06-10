import { ServerGameRequest } from '../../game/logic/server-game.request';


export enum RoomRequestType {
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  READY = "ready",
  UNREADY = "unready",
  START = "start",
  GAME = "game",
  CHAT = "chat"
}

export interface RoomRequest {

  type: RoomRequestType;

}

export interface PlayerConnectRequest extends RoomRequest {

  type: RoomRequestType.CONNECT;

  player: string;

}

export interface PlayerDisconnectRequest extends RoomRequest {

  type: RoomRequestType.DISCONNECT;

  player: string;

}

export interface PlayerReadyRequest extends RoomRequest {

  type: RoomRequestType.READY;

  player: string;

}

export interface PlayerUnreadyRequest extends RoomRequest {

  type: RoomRequestType.UNREADY;

  player: string;

}

export interface GameStartRequest extends RoomRequest {

  type: RoomRequestType.START;

}

export interface GameRequest extends RoomRequest {

  type: RoomRequestType.GAME;

  request: ServerGameRequest;

}

export interface ChatRequest extends RoomRequest {

  type: RoomRequestType.CHAT;

  msg: string;

}


