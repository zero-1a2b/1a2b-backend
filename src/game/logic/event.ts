import { Player } from './player';


export enum EventType {
    NEW_GAME_CLIENT,
    NEW_GAME_SERVER,
    TIMEOUT,
    GUESS
}


export interface GameEvent {

    readonly type: EventType;

};

export interface GameConfig {

    readonly playerTimeoutMillis: number

    readonly answerLength: number;

};

export interface NewGameEvent extends GameEvent {

    readonly type: EventType.NEW_GAME_CLIENT | EventType.NEW_GAME_SERVER;

    readonly players: Player[];

    readonly config: GameConfig;

}

export function isNewGameEvent(e: GameEvent): e is NewGameEvent {
    return e.type === EventType.NEW_GAME_CLIENT || e.type === EventType.NEW_GAME_SERVER;
}

export interface NewClientGameEvent extends NewGameEvent {

    readonly type: EventType.NEW_GAME_CLIENT;

}

export interface NewServerGameEvent extends NewGameEvent {

    readonly type: EventType.NEW_GAME_SERVER;

    readonly answer: number[];

}


export interface NormalEvent extends GameEvent {

    readonly type: EventType.GUESS | EventType.TIMEOUT;

}

export function isNormalEvent(e: GameEvent): e is NormalEvent {
    return !isNewGameEvent(e);
}

export interface TimeoutEvent extends NormalEvent {

    readonly type: EventType.TIMEOUT;

}

export interface GuessEvent extends NormalEvent {

    readonly type: EventType.GUESS;

    readonly player: Player;

    readonly guess: number[];
    
    readonly a: number;
    
    readonly b: number;

}