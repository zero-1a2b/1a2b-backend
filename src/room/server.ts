import { EventEmitter } from '../util/EventEmitter';
import { Room, RoomState } from './logic/room';
import { GameStartedEvent, NewRoomEvent, NormalRoomEvent, RoomEvent, RoomEventType } from './logic/room.event';
import { GameRequest, RoomRequest, RoomRequestType } from './logic/room.request';
import { mapToClient, NewServerGameEvent, NormalEvent } from '../game/logic/game.event';
import { GameServer } from '../game/server';


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
    const ret = this._room.handleRequest(req);
    if(ret instanceof Error) {
      throw ret;
    } else if (ret === null) {
      //no-op
      return;
    } else {
      //side-effects
      switch (ret.type) {
        case RoomEventType.GAME_STARTED:
          this._game = new GameServer(ret.event as NewServerGameEvent);
          this._game.events.subscribe(v=>this.onGameEvent(v));
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
    }
    this.acceptAndSendEvent(ret);
  }

  private onGameEvent(event: NormalEvent): void {
    this.sendEvent({
      type: RoomEventType.GAME_EVENT,
      event: event
    });
  }

}
