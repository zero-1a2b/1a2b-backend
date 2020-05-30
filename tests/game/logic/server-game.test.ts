import { GameEventType, GuessEvent, NewServerGameEvent, TimeoutEvent } from '../../../src/game/logic/event';
import { GuessRequest, ServerGame, ServerGameRequestType, TimeoutRequest } from '../../../src/game/logic/server-game';


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

describe('ServerGame.makeGuess work', () => {

  const e: NewServerGameEvent = {
    type: GameEventType.NEW_GAME_SERVER,
    answer: [1,2,3,4],
    players: ['a','b'],
    config: {
      answerLength: 4,
      playerTimeoutMillis: 1000
    }
  };
  const game: ServerGame = ServerGame.fromNewGameEvent(e);

  it('works', () => {
    const req: GuessRequest = {
      type: ServerGameRequestType.GUESS,
      player: 'a',
      guess: [1,7,8,9]
    };
    const event: GuessEvent = game.handleRequest(req) as GuessEvent;

    expect(event.type).toEqual(GameEventType.GUESS);
  });

  it('computes A B correctly', () => {
    let req: GuessRequest = {
      type: ServerGameRequestType.GUESS,
      player: 'a',
      guess: [1,7,8,9]
    };
    let event: GuessEvent = game.handleRequest(req) as GuessEvent;

    expect(event.a).toEqual(1);
    expect(event.b).toEqual(0);

    req = {
      type: ServerGameRequestType.GUESS,
      player: 'a',
      guess: [1,3,2,4]
    };
    event = game.handleRequest(req) as GuessEvent;

    expect(event.a).toEqual(2);
    expect(event.b).toEqual(2);
  });

  it('rejects not your turn', () => {
    const req: GuessRequest = {
      type: ServerGameRequestType.GUESS,
      player: 'b',
      guess: [1,7,8,9]
    };
    const e = game.handleRequest(req);

    expect(e).toBeInstanceOf(Error);
  });

  it('rejects invalid length', () => {
    const req: GuessRequest = {
      type: ServerGameRequestType.GUESS,
      player: 'a',
      guess: [1,7,8]
    };
    const e = game.handleRequest(req);

    expect(e).toBeInstanceOf(Error);
  });

  it('rejects finished game', () => {
    const req: GuessRequest = {
      type: ServerGameRequestType.GUESS,
      player: 'a',
      guess: [1,2,3,4]
    };
    const game2 = game.handleEvent(game.handleRequest(req) as GuessEvent);

    const req2: GuessRequest = {
      type: ServerGameRequestType.GUESS,
      player: 'b',
      guess: [1,2,3,4]
    };
    const e2 = game2.handleRequest(req2);

    expect(e2).toBeInstanceOf(Error);
  });

});

describe('ServerGame.timeout work', () => {

  const e: NewServerGameEvent = {
    type: GameEventType.NEW_GAME_SERVER,
    answer: [1,2,3,4],
    players: ['a','b'],
    config: {
      answerLength: 4,
      playerTimeoutMillis: 1000
    }
  };
  const game: ServerGame = ServerGame.fromNewGameEvent(e);

  it('works', () => {
    const req: TimeoutRequest = {
      type: ServerGameRequestType.TIMEOUT
    };
    const event = game.handleRequest(req) as TimeoutEvent;

    expect(event.type).toEqual(GameEventType.TIMEOUT)
  });

});
