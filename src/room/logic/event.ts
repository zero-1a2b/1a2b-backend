import { GameConfig, NormalEvent, NewServerGameEvent, NewClientGameEvent } from '../../game/logic/event';

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

    readonly player: string;

}

export interface PlayerUnreadyEvent extends RoomEvent {

    readonly type: RoomEventType.PLAYER_UNREADY;

    readonly player: string;

}

export interface GameStartedEvent extends RoomEvent {

    readonly type: RoomEventType.GAME_STARTED;

    readonly event: NewServerGameEvent | NewClientGameEvent;

}

export interface GameEvent extends RoomEvent {

    readonly type: RoomEventType.GAME_EVENT;

    readonly event: NormalEvent;

}

export interface GameFinishedEvent extends RoomEvent {

    readonly type: RoomEventType.GAME_FINISHED;

    readonly player: string;

}