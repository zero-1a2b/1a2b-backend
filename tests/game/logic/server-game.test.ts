import { GameEventType, NewServerGameEvent } from '../../../src/game/logic/game.event';
import { ServerGame} from '../../../src/game/logic/server-game';


describe('ServerGame.fromNewGameEvent works', () => {

  it('ServerGameEvent works', () => {
    const event: NewServerGameEvent = {
      type: GameEventType.NEW_GAME_SERVER,
      answer: [1,2,3,4],
      players: ['a','b','c'],
      config: {
        answerLength: 4,
        playerTimeoutMillis: 1000
      }
    };

    const game = ServerGame.fromNewGameEvent(event);

    expect(game.config).toEqual(event.config);
    expect(game.players).toEqual(event.players);
    expect(game.guesser).toEqual(0);
    expect(game.winner).toEqual(undefined);

    expect(game.answer).toEqual(event.answer);
    expect(game.answerDigits).toEqual(new Set(event.answer));
  });

});
