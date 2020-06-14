import { ChatLine, Room, RoomConfig } from './logic/room';
import { GameServerRequest } from '../game/server.request';
import { ClientGame } from '../game/logic/client-game';

// base interface //

export enum RoomRequestType {
  CHANGE_SETTINGS = "setting",

  CONNECT = "connect",
  DISCONNECT = "disconnect",

  READY = "ready",
  UNREADY = "unready",

  START = "start",
  GAME = "game",

  CHAT = "chat",

  GET_STATE = "get_state",
  GET_GAME_STATE = "get_game_state"
}

export interface RoomServerRequest {

  type: RoomRequestType;

}


/**
 * represents a request to change settings
 * TODO: enforce room owner privilege to do this
 * @note: security: anyone can do this
 */
export interface ChangeSettingsRequest extends RoomServerRequest {

  type: RoomRequestType.CHANGE_SETTINGS;

  config: RoomConfig;

}

/**
 * represents a player have joined the room (new connection)
 * @note: security: system(INTERNAL_SENDER) only
 */
export interface PlayerConnectRequest extends RoomServerRequest {

  type: RoomRequestType.CONNECT;

  player: string;

}

/**
 * represents a player have left the room (lost connection)
 * @note: security: system(INTERNAL_SENDER) only
 */
export interface PlayerDisconnectRequest extends RoomServerRequest {

  type: RoomRequestType.DISCONNECT;

  player: string;

}

/**
 * represents a player is ready
 * @note: security: the player field must match the sender's
 */
export interface PlayerReadyRequest extends RoomServerRequest {

  type: RoomRequestType.READY;

  player: string;

}

/**
 * represents a player is unready
 * @note: security: the player field must match the sender's
 */
export interface PlayerUnreadyRequest extends RoomServerRequest {

  type: RoomRequestType.UNREADY;

  player: string;

}

/**
 * represents request to start a game
 * @note: security: any player
 */
export interface GameStartRequest extends RoomServerRequest {

  type: RoomRequestType.START;

}

/**
 * delegate to the request of the underlying game
 * @note: security: any player
 */
export interface GameRequest extends RoomServerRequest {

  type: RoomRequestType.GAME;

  request: GameServerRequest;

}

/**
 * the chat request
 * @note: security: sender's name must match the msg.name's value, or INTERNAL_SENDER
 */
export interface ChatRequest extends RoomServerRequest {

  type: RoomRequestType.CHAT;

  msg: ChatLine;

}

/**
 * HACK: dump the state tree of the server, forcing a state sync
 */
export interface GetStateRequest extends RoomServerRequest {

  type: RoomRequestType.GET_STATE;

}

export interface GetStateResponse {

  room: Omit<Room, 'playerReady' | 'handleEvent'> & { playerReady: { [key: string]: boolean } };

  game: ClientGame;

}

/**
 * HACK: dump the state tree of the room, forcing a state sync
 */
export interface GetGameStateRequest extends RoomServerRequest {

  type: RoomRequestType.GET_GAME_STATE;

}
export interface GetGameStateResponse {

  type: RoomRequestType.GET_GAME_STATE,

  game: ClientGame;


}
