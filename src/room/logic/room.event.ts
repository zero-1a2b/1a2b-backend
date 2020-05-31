import { NormalEvent, NewServerGameEvent, NewClientGameEvent } from '../../game/logic/game.event';
import { GameConfig } from '../../game/logic/game';


export enum RoomEventType {
    NEW_ROOM,
    CHANGE_SETTINGS,

    PLAYER_JOIN,
    PLAYER_LEFT,
    PLAYER_RENAME,

    PLAYER_READY,
    PLAYER_UNREADY,

    GAME_STARTED,
    GAME_EVENT,
    GAME_FINISHED
}

export interface RoomEvent {

    readonly type: RoomEventType

}


export interface NewRoomEvent extends RoomEvent {

    readonly type: RoomEventType.NEW_ROOM;

    readonly id: string;

}


export type NormalRoomEvent =
  ChangeSettingsEvent
  | PlayerJoinEvent
  | PlayerLeftEvent
  | PlayerReadyEvent
  | PlayerUnreadyEvent
  | PlayerRenameEvent
  | GameStartedEvent
  | RoomGameEvent
  | GameFinishedEvent
  ;

export interface ChangeSettingsEvent extends RoomEvent {

    readonly type: RoomEventType.CHANGE_SETTINGS;

    readonly gameConfig: GameConfig;

}


export interface PlayerJoinEvent extends RoomEvent {

    readonly type: RoomEventType.PLAYER_JOIN;

    readonly name: string;

}

export interface PlayerLeftEvent extends RoomEvent {

    readonly type: RoomEventType.PLAYER_LEFT;

    readonly name: string;

}

export interface PlayerRenameEvent extends RoomEvent {

    readonly type: RoomEventType.PLAYER_RENAME;

    readonly from: string;

    readonly to: string;

}


export interface PlayerReadyEvent extends RoomEvent {

    readonly type: RoomEventType.PLAYER_READY;

    readonly name: string;

}

export interface PlayerUnreadyEvent extends RoomEvent {

    readonly type: RoomEventType.PLAYER_UNREADY;

    readonly name: string;

}

export interface GameStartedEvent extends RoomEvent {

    readonly type: RoomEventType.GAME_STARTED;

    readonly event: NewServerGameEvent | NewClientGameEvent;

}

export interface RoomGameEvent extends RoomEvent {

    readonly type: RoomEventType.GAME_EVENT;

    readonly event: NormalEvent;

}

export interface GameFinishedEvent extends RoomEvent {

    readonly type: RoomEventType.GAME_FINISHED;

}
