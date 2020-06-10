import { ServerGameRequest } from '../game/logic/server-game.request';
import { ChatLine } from './logic/room';


export enum RoomRequestType {
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  READY = "ready",
  UNREADY = "unready",
  START = "start",
  GAME = "game",
  CHAT = "chat"
}

export interface ServerRequest {

  type: RoomRequestType;

}

export interface PlayerConnectRequest extends ServerRequest {

  type: RoomRequestType.CONNECT;

  player: string;

}

export interface PlayerDisconnectRequest extends ServerRequest {

  type: RoomRequestType.DISCONNECT;

  player: string;

}

export interface PlayerReadyRequest extends ServerRequest {

  type: RoomRequestType.READY;

  player: string;

}

export interface PlayerUnreadyRequest extends ServerRequest {

  type: RoomRequestType.UNREADY;

  player: string;

}

export interface GameStartRequest extends ServerRequest {

  type: RoomRequestType.START;

}

export interface GameRequest extends ServerRequest {

  type: RoomRequestType.GAME;

  request: ServerGameRequest;

}

export interface ChatRequest extends ServerRequest {

  type: RoomRequestType.CHAT;

  msg: ChatLine;

}


