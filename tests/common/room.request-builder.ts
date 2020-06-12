import {
  ChatRequest,
  GameRequest,
  GameStartRequest,
  PlayerConnectRequest,
  PlayerDisconnectRequest,
  PlayerReadyRequest,
  RoomRequestType,
} from '../../src/room/server.request';
import { GuessRequest, ServerGameRequestType } from '../../src/game/server.request';


export function connect(name: string): PlayerConnectRequest {
  return {
    type: RoomRequestType.CONNECT,
    player: name,
  };
}

export function disconnect(name: string): PlayerDisconnectRequest {
  return {
    type: RoomRequestType.DISCONNECT,
    player: name,
  };
}

export function ready(name: string): PlayerReadyRequest {
  return {
    type: RoomRequestType.READY,
    player: name,
  };
}

export function unready(name: string): PlayerReadyRequest {
  return {
    type: RoomRequestType.READY,
    player: name,
  };
}

export function gameStart(): GameStartRequest {
  return {
    type: RoomRequestType.START,
  };
}

export function guess(player: string, guess: number[]): GameRequest {
  return {
    type: RoomRequestType.GAME,
    request: {
      type: ServerGameRequestType.GUESS,
      player: player,
      guess: guess,
    } as GuessRequest,
  };
}

export function chat(player: string, msg: string): ChatRequest {
  return {
    type: RoomRequestType.CHAT,
    msg: {
      name: player,
      msg: msg,
    },
  };
}
