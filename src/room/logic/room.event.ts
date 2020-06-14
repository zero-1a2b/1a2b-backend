import { NormalGameEvent, NewServerGameEvent, NewClientGameEvent } from '../../game/logic/game.event';
import { ChatLine, RoomConfig } from './room';

// base interface //

export enum RoomEventType {
    NEW_ROOM= "new_room",
    ROOM_CLOSED = "room_closed",

    CHANGE_SETTINGS = "change_settings",

    PLAYER_JOIN = "join",
    PLAYER_LEFT = "left",
    PLAYER_RENAME = "rename",

    PLAYER_READY = "ready",
    PLAYER_UNREADY = "unready",

    GAME_STARTED = "game_started",
    GAME_EVENT = "game",
    GAME_FINISHED = "game_finished",

    CHAT = "chat"
}

/**
 * represents a room event, you can only use it to manipulate room state
 */
export interface RoomEvent {

    readonly type: RoomEventType

}

// new room events //

/**
 * represents a new room, is the start of the room stream
 */
export interface NewRoomEvent extends RoomEvent {

    readonly type: RoomEventType.NEW_ROOM;

    readonly id: string;

}

// other events //

export type NormalRoomEvent =
  RoomClosedEvent
  | ChangeSettingsEvent
  | PlayerJoinEvent
  | PlayerLeftEvent
  | PlayerReadyEvent
  | PlayerUnreadyEvent
  | PlayerRenameEvent
  | GameStartedEvent
  | RoomGameEvent
  | GameFinishedEvent
  | ChatEvent
  ;

/**
 * meaning the settings of the game has changed
 */
export interface ChangeSettingsEvent extends RoomEvent {

    readonly type: RoomEventType.CHANGE_SETTINGS;

    readonly config: RoomConfig;

}

/**
 * the tombstone event of a room, used to close it
 */
export interface RoomClosedEvent extends RoomEvent {

  readonly type: RoomEventType.ROOM_CLOSED;

}

/**
 * meaning a player have joined the room
 */
export interface PlayerJoinEvent extends RoomEvent {

    readonly type: RoomEventType.PLAYER_JOIN;

    readonly player: string;

}

/**
 * meaning a player have left the room
 */
export interface PlayerLeftEvent extends RoomEvent {

    readonly type: RoomEventType.PLAYER_LEFT;

    readonly player: string;

}

/**
 * meaning a player have changed its name
 */
export interface PlayerRenameEvent extends RoomEvent {

    readonly type: RoomEventType.PLAYER_RENAME;

    readonly from: string;

    readonly to: string;

}

/**
 * meaning a player have set its ready flag
 */
export interface PlayerReadyEvent extends RoomEvent {

    readonly type: RoomEventType.PLAYER_READY;

    readonly player: string;

}

/**
 * meaning a player have unset its ready flag
 */
export interface PlayerUnreadyEvent extends RoomEvent {

    readonly type: RoomEventType.PLAYER_UNREADY;

    readonly player: string;

}

/**
 * meaning a new game have started
 * @note: for server-side eventing, the event is NewServerGameEvent, NewClientGameEvent is for client
 */
export interface GameStartedEvent extends RoomEvent {

    readonly type: RoomEventType.GAME_STARTED;

    readonly event: NewServerGameEvent | NewClientGameEvent;

}

/**
 * a delegate to the real game event
 */
export interface RoomGameEvent extends RoomEvent {

    readonly type: RoomEventType.GAME_EVENT;

    readonly event: NormalGameEvent;

}

/**
 * representing a game have completed, returning to room page
 */
export interface GameFinishedEvent extends RoomEvent {

    readonly type: RoomEventType.GAME_FINISHED;

    readonly winner: string;

}

/**
 * representing a chat line
 */
export interface ChatEvent extends RoomEvent {

    readonly type: RoomEventType.CHAT;

    readonly msg: ChatLine;

}
