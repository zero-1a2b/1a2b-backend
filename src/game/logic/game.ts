import { zip } from 'lodash';
import { Player } from './player';
import { EventType, NewGameEvent, NewClientGameEvent, NewServerGameEvent, NormalEvent, GuessEvent, GameConfig } from './event';
import { TimeoutEvent } from './event';


export class Game {

    static fromNewGameEvent(event: NewGameEvent): Game {
        switch (event.type) {
            case EventType.NEW_GAME_CLIENT: {
                const e = event as NewClientGameEvent;
                return new Game(
                    e.players,
                    undefined,
                    0,
                    e.config
                );
            }
            case EventType.NEW_GAME_SERVER: {
                const e = event as NewServerGameEvent;
                return new Game(
                    e.players,
                    undefined,
                    0,
                    e.config
                );
            }
        }
    }


    constructor(
        readonly players: Player[],
        readonly winner: Player | undefined,
        readonly guesser: number,
        readonly config: GameConfig
    ) {}


    isFinished(): boolean {
        return this.winner != undefined;
    }
    

    handleEvent(event: NormalEvent): Game {
        switch (event.type) {
            case EventType.TIMEOUT: {
                return new Game(
                    this.players,
                    this.winner,
                    (this.guesser+1) % this.players.length,
                    this.config
                )
            }
            case EventType.GUESS: {
                const e = event as GuessEvent
                return new Game(
                    this.players,
                    e.a === this.config.answerLength ? e.player : undefined,
                    (this.guesser+1) % this.players.length,
                    this.config
                )
            }
        }
    }

}


// client-side game states //

export type ClientGame = Game

// server-side game states //

export interface GuessRequest {

    readonly guess: number[];

    readonly player: Player;

}

export class ServerGame {

    static fromNewGameEvent(event: NewServerGameEvent): ServerGame {
        return new ServerGame(
            Game.fromNewGameEvent(event),
            event.answer,
            new Set(event.answer)
        );
    }


    constructor(
        readonly game: Game,
        readonly answer: number[],
        readonly answerDigits: Set<number>
    ) {}


    get players(): Player[] { return this.game.players; }

    get winner(): Player | undefined { return this.game.winner; }

    get guesser(): number { return this.game.guesser; }

    get config(): GameConfig { return this.game.config; }

    isFinished(): boolean { return this.game.isFinished(); }

    timeout(): TimeoutEvent {
        return { type: EventType.TIMEOUT }
    }

    makeGuess(req: GuessRequest): GuessEvent | Error {
        if(this.game.isFinished()) {
            return Error("error.game_already_end");
        }
        if(this.players[this.guesser]!==req.player) {
            return Error("error.not_your_round");
        }

        const checked = this.checkGuess(req.guess);
        
        if(checked instanceof Error) {
            return checked;
        } else {
            return {
                type: EventType.GUESS,
                player: req.player,
                guess: req.guess,
                ...checked
            }
        }
    }

    private checkGuess(guess: number[]): {a:number;b:number} | Error {
        if(guess.length!==this.answer.length) {
            return Error("error.answer_length_mismatch");
        }

        const a = zip(guess, this.answer)
            .filter(v=>v[0]===v[1])
            .length
            ;
    
        const b = zip(guess, this.answer)
            .filter(v=>v[0]!==v[1] && this.answerDigits.has(v[0]))
            .length
            ;
    
        return {a:a, b:b};
    }


    handleEvent(event: NormalEvent): ServerGame {
        return new ServerGame(
            this.game.handleEvent(event),
            this.answer,
            this.answerDigits
        );
    }

}