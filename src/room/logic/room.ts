import {
  ChangeSettingsEvent,
  GameFinishedEvent,
  GameStartedEvent,
  NewRoomEvent,
  NormalRoomEvent,
  PlayerJoinEvent,
  PlayerLeftEvent,
  PlayerReadyEvent,
  PlayerRenameEvent,
  PlayerUnreadyEvent, RoomClosedEvent,
  RoomEventType,
  RoomGameEvent,
} from './room.event';
import { Game, GameConfig } from '../../game/logic/game';
import { filter, map } from 'lodash';


export enum RoomState {
  IDLE,
  GAMING,
  FINISHED
}


export class Room {

  static fromNewRoomEvent(event: NewRoomEvent): Room {
    return new Room(
      event.id,
      RoomState.IDLE,
      [],
      new Map(),
      Game.DEFAULT_GAME_CONFIG,
    );
  }


  constructor(
    readonly id: string,
    readonly state: RoomState,
    readonly playerIDs: string[],
    readonly playerReady: Map<string, boolean>,
    readonly gameConfig: GameConfig,
  ) {}


  handleEvent(event: NormalRoomEvent): Room {
    switch (event.type) {
      case RoomEventType.CHANGE_SETTINGS:
          return this.handleChangeSettingsEvent(event);
      case RoomEventType.PLAYER_JOIN:
          return this.handlePlayerJoinEvent(event);
      case RoomEventType.PLAYER_LEFT:
          return this.handlePlayerLeftEvent(event);
      case RoomEventType.PLAYER_RENAME:
          return this.handlePlayerRenameEvent(event);
      case RoomEventType.PLAYER_READY:
          return this.handlePlayerReadyEvent(event);
      case RoomEventType.PLAYER_UNREADY:
          return this.handlePlayerUnreadyEvent(event);
      case RoomEventType.GAME_STARTED:
          return this.handleGameStartedEvent(event);
      case RoomEventType.GAME_EVENT:
          return this.handleGameEvent(event);
      case RoomEventType.GAME_FINISHED:
          return this.handleGameFinishedEvent(event);
      case RoomEventType.ROOM_CLOSED:
        return this.handleRoomClosedEvent(event);
    }
  }

  private handleChangeSettingsEvent(e: ChangeSettingsEvent): Room {
    return this.setGameConfig(e.gameConfig);
  }

  private handlePlayerJoinEvent(e: PlayerJoinEvent): Room {
    return this.setPlayerStates(
      [...this.playerIDs, e.name],
      this.playerReady.set(e.name, false),
    );
  }

  private handlePlayerLeftEvent(e: PlayerLeftEvent): Room {
    const result = filter(this.playerIDs, v =>v != e.name);
    this.playerReady.delete(e.name);
    return this.setPlayerStates(
      result,
      this.playerReady
    );
  }

  private handlePlayerRenameEvent(e: PlayerRenameEvent): Room {
    this.playerReady.set(e.to, this.playerReady.get(e.from));
    this.playerReady.delete(e.from);
    return this.setPlayerStates(
      map(this.playerIDs, v => v === e.from ? e.to : v),
      this.playerReady
    );
  }

  private handlePlayerReadyEvent(e: PlayerReadyEvent): Room {
    return this.setPlayerStates(
      this.playerIDs,
      this.playerReady.set(e.name, true)
    );
  }

  private handlePlayerUnreadyEvent(e: PlayerUnreadyEvent): Room {
    return this.setPlayerStates(
      this.playerIDs,
      this.playerReady.set(e.name, false)
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleGameStartedEvent(_e: GameStartedEvent): Room {
    return this.setRoomState(RoomState.GAMING);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleGameEvent(_e: RoomGameEvent): Room {
    //no-op
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleGameFinishedEvent(_e: GameFinishedEvent): Room {
    return this.setRoomState(RoomState.FINISHED);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleRoomClosedEvent(_e: RoomClosedEvent): Room {
    return this.setRoomState(RoomState.FINISHED);
  }

  // mutator to eliminate update boilerplate

  private setRoomState(state: RoomState): Room {
    return new Room(
      this.id,
      state,
      this.playerIDs,
      this.playerReady,
      this.gameConfig,
    );
  }

  private setGameConfig(config: GameConfig): Room {
    return new Room(
      this.id,
      this.state,
      this.playerIDs,
      this.playerReady,
      {...config},
    );
  }

  private setPlayerStates(playerIDs: string[], playerReady: Map<string, boolean>): Room {
    return new Room(
      this.id,
      this.state,
      [...playerIDs],
      new Map(playerReady),
      this.gameConfig,
    );
  }

}
