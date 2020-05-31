import { Player } from './player';
import { GameConfig } from './game';


export enum GameEventType {
    NEW_GAME_CLIENT,
    NEW_GAME_SERVER,
    TIMEOUT,
    GUESS
}

export interface GameEvent {

    readonly type: GameEventType;

}


export type NewGameEvent = NewClientGameEvent | NewServerGameEvent;

export function isNewGameEvent(e: GameEvent): e is NewGameEvent {
    return e.type === GameEventType.NEW_GAME_CLIENT || e.type === GameEventType.NEW_GAME_SERVER;
}

export interface NewClientGameEvent extends GameEvent {

    readonly type: GameEventType.NEW_GAME_CLIENT;

    readonly players: Player[];

    readonly config: GameConfig;

}

export interface NewServerGameEvent extends GameEvent {

    readonly type: GameEventType.NEW_GAME_SERVER;

    readonly players: Player[];

    readonly config: GameConfig;

    readonly answer: number[];

}

export function mapToClient(server: NewServerGameEvent): NewClientGameEvent {
  return {
    type: GameEventType.NEW_GAME_CLIENT,
    config: server.config,
    players: server.players
  }
}


export type NormalEvent = TimeoutEvent | GuessEvent;

export function isNormalEvent(e: GameEvent): e is NormalEvent {
  return e.type === GameEventType.GUESS || e.type === GameEventType.TIMEOUT;
}

export interface TimeoutEvent extends GameEvent {

    readonly type: GameEventType.TIMEOUT;

}

export interface GuessEvent extends GameEvent {

    readonly type: GameEventType.GUESS;

    readonly player: Player;

    readonly guess: number[];

    readonly a: number;

    readonly b: number;

}
