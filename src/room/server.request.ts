import { ChatLine } from './logic/room';
import { GameServerRequest } from '../game/server.request';


export enum RoomRequestType {
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  READY = "ready",
  UNREADY = "unready",
  START = "start",
  GAME = "game",
  CHAT = "chat"
}

export interface RoomServerRequest {

  type: RoomRequestType;

}

export interface PlayerConnectRequest extends RoomServerRequest {

  type: RoomRequestType.CONNECT;

  player: string;

}

export interface PlayerDisconnectRequest extends RoomServerRequest {

  type: RoomRequestType.DISCONNECT;

  player: string;

}

export interface PlayerReadyRequest extends RoomServerRequest {

  type: RoomRequestType.READY;

  player: string;

}

export interface PlayerUnreadyRequest extends RoomServerRequest {

  type: RoomRequestType.UNREADY;

  player: string;

}

export interface GameStartRequest extends RoomServerRequest {

  type: RoomRequestType.START;

}

export interface GameRequest extends RoomServerRequest {

  type: RoomRequestType.GAME;

  request: GameServerRequest;

}

export interface ChatRequest extends RoomServerRequest {

  type: RoomRequestType.CHAT;

  msg: ChatLine;

}


