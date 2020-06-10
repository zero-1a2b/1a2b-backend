import { EventEmitter } from '../util/EventEmitter';
import { Room, RoomState } from './logic/room';
import {
  GameStartedEvent,
  NewRoomEvent,
  NormalRoomEvent,
  PlayerJoinEvent,
  PlayerLeftEvent,
  PlayerReadyEvent,
  PlayerUnreadyEvent,
  RoomEvent,
  RoomEventType,
} from './logic/room.event';
import {
  GameRequest,
  GameStartRequest,
  PlayerConnectRequest,
  PlayerDisconnectRequest,
  PlayerReadyRequest,
  PlayerUnreadyRequest,
  RoomRequest,
  RoomRequestType,
} from './logic/room.request';
import { mapToClient, NewServerGameEvent, NormalEvent } from '../game/logic/game.event';
import { GameServer } from '../game/server';
import { newServerGameEvent } from '../game/logic/server-game';


export class RoomServer {

  static newRoom(id: string): RoomServer {
    return new RoomServer({
      type: RoomEventType.NEW_ROOM,
      id: id
    });
  }


  public get state(): RoomState { return this.room.state; }

  public readonly events: EventEmitter<RoomEvent>;

  public readonly clientEvents: EventEmitter<RoomEvent>;

  public get room(): Room { return this._room; }
  private _room: Room;

  public get game(): GameServer { return this._game; }
  private _game: GameServer | null;


  constructor(event: NewRoomEvent){
    this.events = new EventEmitter();
    this.clientEvents = new EventEmitter();
    this._room = Room.fromNewRoomEvent(event);

    this._game = null;
  }

  // eventing

  acceptEvent(e: NormalRoomEvent): void {
    this._room = this._room.handleEvent(e);
    if(e.type === RoomEventType.GAME_STARTED) {
      if(this._game!==null) {
        this._game.stop();
        this._game = null;
      }
      this._game = new GameServer(e.event as NewServerGameEvent);
      this._game.events.subscribe(v => this.onGameEvent(v));
      this._game.start();
    }
    if(e.type === RoomEventType.GAME_EVENT) {
      this._game.acceptEvent(e.event);
    }
  }

  private acceptAndSendEvent(e: NormalRoomEvent): void {
    this.acceptEvent(e);
    this.sendEvent(e);
  }

  private sendEvent(e: NormalRoomEvent): void {
    this.events.emit(e);
    this.emitClientEvent(e);
  }

  private emitClientEvent(e: NormalRoomEvent): void {
    let result: NormalRoomEvent;
    switch (e.type) {
      case RoomEventType.CHANGE_SETTINGS:
      case RoomEventType.PLAYER_JOIN:
      case RoomEventType.PLAYER_LEFT:
      case RoomEventType.PLAYER_READY:
      case RoomEventType.PLAYER_UNREADY:
      case RoomEventType.PLAYER_RENAME:
      case RoomEventType.GAME_EVENT:
      case RoomEventType.GAME_FINISHED:
      case RoomEventType.ROOM_CLOSED:
        result = e;
        break;
      case RoomEventType.GAME_STARTED:
        result = {
          type: RoomEventType.GAME_STARTED,
          event: mapToClient((e as GameStartedEvent).event as NewServerGameEvent)
        };
        break;
    }
    this.clientEvents.emit(result);
  }

  // lifecycle

  close(): void {
    if(this._game!==null) {
      this._game.stop();
      this._game = null;
    }
    this.acceptAndSendEvent({
      type: RoomEventType.ROOM_CLOSED,
      reason: 'server_terminated'
    });
  }

  // operations for handling request

  handleRequest(req: RoomRequest): void {
    let ret: Array<NormalRoomEvent> | Error;
    switch (req.type) {
      case RoomRequestType.CONNECT:
        ret = this.wrap(this.handlePlayerConnect(req as PlayerConnectRequest));
        break;
      case RoomRequestType.DISCONNECT:
        ret = this.wrap(this.handlePlayerDisconnect(req as PlayerDisconnectRequest));
        break;
      case RoomRequestType.READY:
        ret = this.wrap(this.handlePlayerReady(req as PlayerReadyRequest));
        break;
      case RoomRequestType.UNREADY:
        ret = this.wrap(this.handlePlayerUnready(req as PlayerUnreadyRequest));
        break;
      case RoomRequestType.START: {
        const oret = this.handleGameStart(req as GameStartRequest);
        //side-effects
        if(!(oret instanceof Error)) {
          this._game = new GameServer(oret.event as NewServerGameEvent);
          this._game.events.subscribe(v => this.onGameEvent(v));
          this._game.start();
        }
        ret = this.wrap(oret);
        break;
      }
      case RoomRequestType.GAME:
        ret = [];
        if(this._game === null) {
          ret = new Error("error.game_not_started");
        } else {
          this._game.handleRequest((req as GameRequest).request);
          if(this._game.game.winner !== undefined) {
            ret = [
              {
                type: RoomEventType.GAME_FINISHED
              },
              {
                type: RoomEventType.ROOM_CLOSED,
                reason: 'game_finished'
              }
            ];
          }
        }
        break;
      case RoomRequestType.CHAT:
        ret = new Error("TODO");
        break;
    }
    //throw on fail, apply event on done
    if (ret instanceof Error) {
      throw ret;
    } else {
      ret.forEach(ret=>this.acceptAndSendEvent(ret));
    }
  }

  private handlePlayerConnect(req: PlayerConnectRequest): PlayerJoinEvent | Error | null {
    if(this.room.state === RoomState.IDLE) {
      // still in room state
      if(this.room.playerIDs.findIndex(v=>v===req.player) != -1) {
        return new Error("error.name_repeated");
      }
      return {
        type: RoomEventType.PLAYER_JOIN,
        name: req.player
      };
    } else {
      //playing state
      if(this.room.playerIDs.findIndex(v=>v===req.player) == -1) {
        return new Error("error.not_playing_player");
      } else {
        return null;
      }
    }
  }

  private handlePlayerDisconnect(req: PlayerDisconnectRequest): PlayerLeftEvent | Error | null {
    //trivially success
    if(this.room.playerIDs.find(v=>v===req.player) === undefined) {
      return null;
    }
    return {
      type: RoomEventType.PLAYER_LEFT,
      name: req.player
    };
  }

  private handlePlayerReady(req: PlayerReadyRequest): PlayerReadyEvent | Error {
    if(this.room.state !== RoomState.IDLE) {
      return new Error("error.game_already_started");
    } else {
      if(this.room.playerIDs.findIndex(v=>v===req.player) === -1) {
        return new Error("error.player_not_exists");
      }
      return {
        type: RoomEventType.PLAYER_READY,
        name: req.player
      };
    }
  }

  private handlePlayerUnready(req: PlayerUnreadyRequest): PlayerUnreadyEvent | Error {
    if(this.room.state !== RoomState.IDLE) {
      return new Error("error.game_already_started");
    } else {
      if(this.room.playerIDs.findIndex(v=>v===req.player) === -1) {
        return new Error("error.player_not_exists");
      }
      return {
        type: RoomEventType.PLAYER_UNREADY,
        name: req.player
      };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleGameStart(_req: GameStartRequest): GameStartedEvent | Error {
    if(this.room.state != RoomState.IDLE) {
      return new Error("error.already_started");
    }
    return {
      type: RoomEventType.GAME_STARTED,
      event: newServerGameEvent(
        this.room.playerIDs,
        this.room.gameConfig
      )
    };
  }

  private wrap(e: NormalRoomEvent | Error | null): Array<NormalRoomEvent> | Error {
    if(e instanceof Error) {
      return e;
    } else if(e === null) {
      return [];
    } else {
      return [e];
    }
  }


  private onGameEvent(event: NormalEvent): void {
    this.sendEvent({
      type: RoomEventType.GAME_EVENT,
      event: event
    });
  }

}
