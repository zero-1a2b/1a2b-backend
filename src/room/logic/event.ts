import { GameConfig, NormalEvent, NewServerGameEvent, NewClientGameEvent } from '../../game/logic/game.event';

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

export interface NormalRoomEvent extends RoomEvent {

    readonly type:
        RoomEventType.CHANGE_SETTINGS
        | RoomEventType.PLAYER_JOIN
        | RoomEventType.PLAYER_LEFT
        | RoomEventType.PLAYER_RENAME
        | RoomEventType.PLAYER_READY
        | RoomEventType.PLAYER_UNREADY
        | RoomEventType.GAME_STARTED
        | RoomEventType.GAME_EVENT
        | RoomEventType.GAME_FINISHED

}

export interface ChangeSettingsEvent extends NormalRoomEvent {

    readonly type: RoomEventType.CHANGE_SETTINGS;

    readonly gameConfig: GameConfig;

}


export interface PlayerJoinEvent extends NormalRoomEvent {

    readonly type: RoomEventType.PLAYER_JOIN;

    readonly name: string;

}

export interface PlayerLeftEvent extends NormalRoomEvent {

    readonly type: RoomEventType.PLAYER_LEFT;

    readonly name: string;

}

export interface PlayerRenameEvent extends NormalRoomEvent {

    readonly type: RoomEventType.PLAYER_RENAME;

    readonly from: string;

    readonly to: string;

}


export interface PlayerReadyEvent extends NormalRoomEvent {

    readonly type: RoomEventType.PLAYER_READY;

    readonly name: string;

}

export interface PlayerUnreadyEvent extends NormalRoomEvent {

    readonly type: RoomEventType.PLAYER_UNREADY;

    readonly name: string;

}

export interface GameStartedEvent extends NormalRoomEvent {

    readonly type: RoomEventType.GAME_STARTED;

    readonly event: NewServerGameEvent | NewClientGameEvent;

}

export interface RoomGameEvent extends NormalRoomEvent {

    readonly type: RoomEventType.GAME_EVENT;

    readonly event: NormalEvent;

}

export interface GameFinishedEvent extends NormalRoomEvent {

    readonly type: RoomEventType.GAME_FINISHED;

}
