import { ServerGame } from '../game/logic/server-game';
import { EventEmitter } from '../util/EventEmitter';
import { Room, RoomState } from './logic/room';
import { NewRoomEvent, NormalRoomEvent, RoomEvent, RoomEventType } from './logic/room.event';
import { RoomRequest } from './logic/room.request';


export class RoomServer {

  static newRoom(): RoomServer {
    const e: NewRoomEvent = {
      type: RoomEventType.NEW_ROOM
    }
    return new RoomServer(e);
  }


  public get state(): RoomState { return this._state; }
  private _state: RoomState;

  public readonly events: EventEmitter<RoomEvent>;

  public get room(): Room { return this._room; }
  private _room: Room;

  public get game(): ServerGame { return this._game; }
  private _game: ServerGame | null;

  constructor(event: NewRoomEvent){
    this._state = RoomState.IDLE;

    this.events = new EventEmitter();
    this._room = Room.fromNewRoomEvent(event);

    this._game = null;
  }

  // eventing

  acceptEvent(e: NormalRoomEvent): void {
    this._room = this._room.handleEvent(e);
  }

  private emitEvent(e: NormalRoomEvent): void {
    this.acceptEvent(e);
    this.events.emit(e);
  }

  // operations for handling request

  handleRequest(req: RoomRequest): void {
    const ret = this._room.handleRequest(req);
    if(ret instanceof Error) {
      throw ret;
    }
    this.emitEvent(ret);
  }

}
