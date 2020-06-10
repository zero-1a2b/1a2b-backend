import { NewServerGameEvent, GameEventType, NewClientGameEvent, TimeoutEvent, GuessEvent } from "../../../src/game/logic/game.event";
import { Game } from '../../../src/game/logic/game';


describe('Game.fromNewGameEvent works', () => {

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

    const game = Game.fromNewGameEvent(event);

    expect(game.config).toEqual(event.config);
    expect(game.players).toEqual(event.players);
    expect(game.guesser).toEqual(0);
    expect(game.winner).toEqual(undefined);
  });

  it('ClientGameEvent works', () => {
    const event: NewClientGameEvent = {
      type: GameEventType.NEW_GAME_CLIENT,
      players: ['a','b','c'],
      config: {
        answerLength: 4,
        playerTimeoutMillis: 1000
      }
    };

    const game = Game.fromNewGameEvent(event);

    expect(game.config).toEqual(event.config);
    expect(game.players).toEqual(event.players);
    expect(game.guesser).toEqual(0);
    expect(game.winner).toEqual(undefined);
  });

});

describe('Game.isFinished works', () => {

  const e: NewServerGameEvent = {
    type: GameEventType.NEW_GAME_SERVER,
    answer: [1,2,3,4],
    players: ['a','b'],
    config: {
      answerLength: 4,
      playerTimeoutMillis: 1000
    }
  };
  const game: Game = Game.fromNewGameEvent(e);

  it('no winner, no finish', () => {
    expect(game.winner).toEqual(undefined);
    expect(game.isFinished()).toEqual(false);
  });

  it('winner, finished', () => {
    const event2: GuessEvent = {
      type: GameEventType.GUESS,
      player: 'a',
      guess: [1,2,3,4],
      a: 4,
      b: 0
    };

    const game2 = game.handleEvent(event2);

    expect(game2.winner).not.toBeUndefined();
    expect(game2.isFinished()).toEqual(true);
  });

});

describe('Game.handleEvent works', () => {

  const e: NewServerGameEvent = {
    type: GameEventType.NEW_GAME_SERVER,
    answer: [1,2,3,4],
    players: ['a','b'],
    config: {
      answerLength: 4,
      playerTimeoutMillis: 1000
    }
  };
  const game: Game = Game.fromNewGameEvent(e);

  it('handles TimeoutEvent', () => {

    const event: TimeoutEvent = {
      type: GameEventType.TIMEOUT
    };

    const game2 = game.handleEvent(event);

    expect(game2.guesser).toEqual(1);


    const event2: TimeoutEvent = {
      type: GameEventType.TIMEOUT
    };
    const game3 = game2.handleEvent(event2);

    expect(game3.guesser).toEqual(0);
  });

  it('handles GuessEvent', () => {

    // should switch player after each guess

    const event: GuessEvent = {
      type: GameEventType.GUESS,
      player: 'a',
      guess: [1,9,9,9],
      a: 1,
      b: 0
    };

    const game2 = game.handleEvent(event);

    expect(game2.guesser).toEqual(1);

    const event2: GuessEvent = {
      type: GameEventType.GUESS,
      player: 'b',
      guess: [1,9,9,9],
      a: 1,
      b: 0
    };

    const game3 = game2.handleEvent(event2);

    expect(game3.guesser).toEqual(0);

    //should label win correctly

    const event3: GuessEvent = {
      type: GameEventType.GUESS,
      player: 'a',
      guess: [1,2,3,4],
      a: 4,
      b: 0
    };

    const game4 = game3.handleEvent(event3);

    expect(game4.guesser).toEqual(1);
    expect(game4.winner).toEqual('a');

  });

});
