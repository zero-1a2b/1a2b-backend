import { NewServerGameEvent, EventType, NewClientGameEvent, TimeoutEvent, GuessEvent } from "../../../src/game/logic/event";
import { Game, ServerGame } from '../../../src/game/logic/game';


describe('Game.fromNewGameEvent works', () => {

  it('ServerGameEvent works', () => {
    const event: NewServerGameEvent = {
      type: EventType.NEW_GAME_SERVER,
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
      type: EventType.NEW_GAME_CLIENT,
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
    type: EventType.NEW_GAME_SERVER,
    answer: [1,2,3,4],
    players: ['a','b'],
    config: {
      answerLength: 4,
      playerTimeoutMillis: 1000
    }
  }
  const game: Game = Game.fromNewGameEvent(e)

  it('no winner, no finish', () => {
    expect(game.winner).toEqual(undefined);
    expect(game.isFinished()).toEqual(false);
  });

  it('winner, finished', () => {
    const event2: GuessEvent = {
      type: EventType.GUESS,
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
    type: EventType.NEW_GAME_SERVER,
    answer: [1,2,3,4],
    players: ['a','b'],
    config: {
      answerLength: 4,
      playerTimeoutMillis: 1000
    }
  }
  const game: Game = Game.fromNewGameEvent(e)

  it('handles TimeoutEvent', () => {

    const event: TimeoutEvent = {
      type: EventType.TIMEOUT
    };

    const game2 = game.handleEvent(event);
    
    expect(game2.guesser).toEqual(1);


    const event2: TimeoutEvent = {
      type: EventType.TIMEOUT
    }
    const game3 = game2.handleEvent(event2)

    expect(game3.guesser).toEqual(0);
  });

  it('handles GuessEvent', () => {

    // should switch player after each guess

    const event: GuessEvent = {
      type: EventType.GUESS,
      player: 'a',
      guess: [1,9,9,9],
      a: 1,
      b: 0
    };

    const game2 = game.handleEvent(event);
    
    expect(game2.guesser).toEqual(1);

    const event2: GuessEvent = {
      type: EventType.GUESS,
      player: 'b',
      guess: [1,9,9,9],
      a: 1,
      b: 0
    };

    const game3 = game2.handleEvent(event2);
    
    expect(game3.guesser).toEqual(0);

    //should label win correctly

    const event3: GuessEvent = {
      type: EventType.GUESS,
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


describe('ServerGame.fromNewGameEvent works', () => {

  it('ServerGameEvent works', () => {
    const event: NewServerGameEvent = {
      type: EventType.NEW_GAME_SERVER,
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

describe('ServerGame.makeGuess work', () => {

  const e: NewServerGameEvent = {
    type: EventType.NEW_GAME_SERVER,
    answer: [1,2,3,4],
    players: ['a','b'],
    config: {
      answerLength: 4,
      playerTimeoutMillis: 1000
    }
  }
  const game: ServerGame = ServerGame.fromNewGameEvent(e)

  it('works', () => {
    const event: GuessEvent = game.makeGuess(
      {
        player: 'a',
        guess: [1,7,8,9]
      }
    ) as GuessEvent

    expect(event.type).toEqual(EventType.GUESS);
  });

  it('computes A B correctly', () => {
    let event: GuessEvent = game.makeGuess(
      {
        player: 'a',
        guess: [1,7,8,9]
      }
    ) as GuessEvent

    expect(event.a).toEqual(1);
    expect(event.b).toEqual(0);

    event = game.makeGuess(
      {
        player: 'a',
        guess: [1,3,2,4]
      }
    ) as GuessEvent

    expect(event.a).toEqual(2);
    expect(event.b).toEqual(2);
  });

  it('rejects not your turn', () => {
    const e = game.makeGuess(
      {
        player: 'b',
        guess: [1,7,8,9]
      }
    )

    expect(e).toBeInstanceOf(Error);
  });

  it('rejects invalid length', () => {
    const e = game.makeGuess(
      {
        player: 'a',
        guess: [1,7,8]
      }
    )

    expect(e).toBeInstanceOf(Error);
  });

  it('rejects finished game', () => {
    const e = game.makeGuess(
      {
        player: 'a',
        guess: [1, 2, 3, 4]
      }
    ) as GuessEvent
    const game2 = game.handleEvent(e);

    const e2 = game2.makeGuess(
      {
        player: 'b',
        guess: [1, 2, 3, 4]
      }
    )

    expect(e2).toBeInstanceOf(Error);
  });

});

describe('ServerGame.timeout work', () => {

  const e: NewServerGameEvent = {
    type: EventType.NEW_GAME_SERVER,
    answer: [1,2,3,4],
    players: ['a','b'],
    config: {
      answerLength: 4,
      playerTimeoutMillis: 1000
    }
  }
  const game: ServerGame = ServerGame.fromNewGameEvent(e)

  it('works', () => {
    const event = game.timeout()

    expect(event.type).toEqual(EventType.TIMEOUT)
  });

});