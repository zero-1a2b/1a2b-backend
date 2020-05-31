import { NewRoomEvent, NormalRoomEvent, RoomEventType } from './logic/room.event';
import { Room, RoomState } from './logic/room';
import { GameClient } from '../game/client';
import { NewClientGameEvent } from '../game/logic/game.event';

class RoomClient {

  public get state(): RoomState { return this._state; }
  private _state: RoomState;

  public get room(): Room { return this._room; }
  private _room: Room;

  public get game(): GameClient { return this._game; }
  private _game: GameClient | null;

  constructor(event: NewRoomEvent){
    this._state = RoomState.IDLE;

    this._room = Room.fromNewRoomEvent(event);

    this._game = null;
  }

  // eventing

  acceptEvent(e: NormalRoomEvent): void {
    switch (e.type) {
      case RoomEventType.CHANGE_SETTINGS:
      case RoomEventType.PLAYER_JOIN:
      case RoomEventType.PLAYER_LEFT:
      case RoomEventType.PLAYER_READY:
      case RoomEventType.PLAYER_UNREADY:
      case RoomEventType.PLAYER_RENAME:
      case RoomEventType.GAME_FINISHED:
        this._room = this._room.handleEvent(e);
        break;
      case RoomEventType.GAME_STARTED:
        this._room = this._room.handleEvent(e);
        this._game = GameClient.newGame(e.event as NewClientGameEvent);
        break;
      case RoomEventType.GAME_EVENT:
        this._room = this._room.handleEvent(e);
        this._game.acceptEvent(e.event);
        break;
    }
  }

}
