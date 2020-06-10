import { EventEmitter } from '../util/EventEmitter';
import { Room, RoomState } from './logic/room';
import { GameStartedEvent, NewRoomEvent, NormalRoomEvent, RoomEvent, RoomEventType } from './logic/room.event';
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
    //special handling
    switch (req.type) {
      case RoomRequestType.GAME:
        if(this._game === null) {
          throw new Error("error.game_not_started");
        } else {
          this._game.handleRequest((req as GameRequest).request);
          //TODO: move this to game logic
          if(this._game.game.winner !== undefined) {
            this.acceptAndSendEvent({
              type: RoomEventType.GAME_FINISHED
            });
            this.acceptAndSendEvent({
              type: RoomEventType.ROOM_CLOSED,
              reason: 'game_finished'
            });
          }
        }
        break;
      case RoomRequestType.CONNECT:
      case RoomRequestType.DISCONNECT:
      case RoomRequestType.READY:
      case RoomRequestType.UNREADY:
      case RoomRequestType.START:
        //let internal state deal with it
        return this.internalStateHandleRequest(req);
    }
  }

  private internalStateHandleRequest(req: RoomRequest): void {
    const ret = this.handleGameRequest(req);
    if (ret instanceof Error) {
      throw ret;
    } else {
      //side-effects
      ret.forEach(ret => {
        switch (ret.type) {
          case RoomEventType.GAME_STARTED:
            this._game = new GameServer(ret.event as NewServerGameEvent);
            this._game.events.subscribe(v => this.onGameEvent(v));
            this._game.start();
            break;
          case RoomEventType.GAME_EVENT:
            this._game.acceptEvent(ret.event);
            break;
          case RoomEventType.ROOM_CLOSED:
            //not possible for server
            break;
          case RoomEventType.GAME_FINISHED:
          case RoomEventType.CHANGE_SETTINGS:
          case RoomEventType.PLAYER_JOIN:
          case RoomEventType.PLAYER_LEFT:
          case RoomEventType.PLAYER_READY:
          case RoomEventType.PLAYER_UNREADY:
          case RoomEventType.PLAYER_RENAME:
            //have no side-effect, ignore
            break;
        }
        this.acceptAndSendEvent(ret);
      });
    }
  }

  private handleGameRequest(req: RoomRequest): Array<NormalRoomEvent> | Error {
    switch (req.type) {
      case RoomRequestType.CONNECT:
        return this.handlePlayerConnect(req as PlayerConnectRequest);
      case RoomRequestType.DISCONNECT:
        return this.handlePlayerDisconnect(req as PlayerDisconnectRequest);
      case RoomRequestType.READY:
        return this.handlePlayerReady(req as PlayerReadyRequest);
      case RoomRequestType.UNREADY:
        return this.handlePlayerUnready(req as PlayerUnreadyRequest);
      case RoomRequestType.START:
        return this.handleGameStart(req as GameStartRequest);
      case RoomRequestType.CHAT:
        return new Error("TODO");
      case RoomRequestType.GAME:
        return new Error("the game's own state does not handle game's request!");
    }
  }

  private handlePlayerConnect(req: PlayerConnectRequest): Array<NormalRoomEvent> | Error {
    if(this.room.state === RoomState.IDLE) {
      // still in room state
      if(this.room.playerIDs.findIndex(v=>v===req.player) != -1) {
        return new Error("error.name_repeated");
      }
      return [{
        type: RoomEventType.PLAYER_JOIN,
        name: req.player
      }];
    } else {
      //playing state
      if(this.room.playerIDs.findIndex(v=>v===req.player) == -1) {
        return new Error("error.not_playing_player");
      } else {
        return [];
      }
    }
  }

  private handlePlayerDisconnect(req: PlayerDisconnectRequest): Array<NormalRoomEvent> | Error {
    //trivially success
    if(this.room.playerIDs.find(v=>v===req.player) === undefined) {
      throw [];
    }
    return [{
      type: RoomEventType.PLAYER_LEFT,
      name: req.player
    }];
  }

  private handlePlayerReady(req: PlayerReadyRequest): Array<NormalRoomEvent> | Error {
    if(this.room.state !== RoomState.IDLE) {
      return new Error("error.game_already_started");
    } else {
      if(this.room.playerIDs.findIndex(v=>v===req.player) === -1) {
        return new Error("error.player_not_exists");
      }
      return [{
        type: RoomEventType.PLAYER_READY,
        name: req.player
      }];
    }
  }

  private handlePlayerUnready(req: PlayerUnreadyRequest): Array<NormalRoomEvent> | Error {
    if(this.room.state !== RoomState.IDLE) {
      return new Error("error.game_already_started");
    } else {
      if(this.room.playerIDs.findIndex(v=>v===req.player) === -1) {
        return new Error("error.player_not_exists");
      }
      return [{
        type: RoomEventType.PLAYER_UNREADY,
        name: req.player
      }];
    }
  }

  private handleGameStart(req: GameStartRequest): Array<NormalRoomEvent> | Error {
    //FIXME: this is to please typescript
    req.type;
    if(this.room.state != RoomState.IDLE) {
      return new Error("error.already_started");
    }
    return [{
      type: RoomEventType.GAME_STARTED,
      event: newServerGameEvent(
        this.room.playerIDs,
        this.room.gameConfig
      )
    }];
  }

  private onGameEvent(event: NormalEvent): void {
    this.sendEvent({
      type: RoomEventType.GAME_EVENT,
      event: event
    });
  }

}
