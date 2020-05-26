import { GameClient } from "../../src/game/client";
import { EventType, GuessEvent } from '../../src/game/logic/event';
import { GameState } from '../../src/game/server';


function newGameClient(): GameClient {
    return GameClient.newGame(
        {
            type: EventType.NEW_GAME_CLIENT,
            players: ['a', 'b'],
            config: {
                answerLength: 4,
                playerTimeoutMillis: 1000
            }
        }
    )
}

describe('GameClient.newGame works', () => {

    it('works', () => {
        const game = GameClient.newGame(
            {
                type: EventType.NEW_GAME_CLIENT,
                players: ['a', 'b'],
                config: {
                    answerLength: 4,
                    playerTimeoutMillis: 1000
                }
            }
        )
        expect(game.state).toEqual(GameState.READY);
        expect(game.game.players).toEqual(['a', 'b']);
        expect(game.game.config).toEqual(
            {
                answerLength: 4,
                playerTimeoutMillis: 1000
            }
        );
    });

});

describe('GameClient constructor works', () => {

    it('works', () => {
        const game = new GameClient(
            {
                type: EventType.NEW_GAME_CLIENT,
                players: ['a', 'b'],
                config: {
                    answerLength: 4,
                    playerTimeoutMillis: 1000
                }
            }
        )
        expect(game.state).toEqual(GameState.READY);
        expect(game.game.players).toEqual(['a', 'b']);
        expect(game.game.config).toEqual(
            {
                answerLength: 4,
                playerTimeoutMillis: 1000
            }
        );
    });

});

describe('GameClient accepting event works', () => {

    it('works', () => {
        const game = newGameClient();
        game.acceptEvent({
            type: EventType.TIMEOUT
        });
        expect(game.state).toEqual(GameState.RUNNING);

        game.acceptEvent({
            type: EventType.GUESS,
            player: 'a',
            guess: [1,2,3,4],
            a: 4,
            b: 0
        } as GuessEvent)
        expect(game.state).toEqual(GameState.FINISHED);

    });

    it('could jump to FINISHED', () => {

        const game2 = newGameClient();
        game2.acceptEvent({
            type: EventType.GUESS,
            player: 'a',
            guess: [1,2,3,4],
            a: 4,
            b: 0
        } as GuessEvent)
        expect(game2.state).toEqual(GameState.FINISHED);
        
    });

});