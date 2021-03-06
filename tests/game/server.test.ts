import { GameServer} from '../../src/game/server';
import {
  GameEvent,
  GameEventType,
  GuessEvent,
  NewServerGameEvent,
  NormalGameEvent
} from '../../src/game/logic/game.event';
import { GuessRequest, ServerGameRequestType } from '../../src/game/server.request';
import { RequestSender, SenderType } from '../../src/util/sender';
import { GameState } from '../../src/game/game-state';

const aSender: RequestSender = { type: SenderType.PLAYER, player: 'a'};

const bSender: RequestSender = { type: SenderType.PLAYER, player: 'b'};

function newGameServer(): GameServer {
  return GameServer.newGame(
    ['a', 'b'],
    {
      answerLength: 4,
      playerTimeoutMillis: 1000,
    },
    {
      answer: [1, 2, 3, 4],
      players: ['a', 'b'],
    },
  );
}

function withGameSever(body: (server: GameServer)=>void): void {
  const server = newGameServer();
  server.start();
  body(server);
  server.stop();
}

function eventsCaptured(game: GameServer, body: (server: GameServer, events: Array<NormalGameEvent>)=>void): void {
  const lastEvent = [];
  game.events.subscribe(v=>lastEvent.push(v));
  body(game, lastEvent);
}

function guess(game: GameServer, sender: RequestSender, req: Omit<GuessRequest, 'type'>): void {
  const e: GuessRequest = {
    type: ServerGameRequestType.GUESS,
    ...req,
  };
  game.handleRequest(e, sender);
}

describe('GameServer.newGame works', () => {

  it('works', () => {
    const game = GameServer.newGame(
      ['a', 'b'],
      {
        answerLength: 4,
        playerTimeoutMillis: 1000,
      },
    );
    expect(game.state).toEqual(GameState.READY);
    expect(game.game.players).toContainEqual('a');
    expect(game.game.players).toContainEqual('b');
    expect(game.game.answer).toHaveLength(4);
  });

  it('works with given shuffled player', () => {
    const game = GameServer.newGame(
      ['a', 'b'],
      {
        answerLength: 4,
        playerTimeoutMillis: 1000,
      },
      {
        players: ['a', 'b'],
      },
    );
    expect(game.state).toEqual(GameState.READY);
    expect(game.game.players).toEqual(['a', 'b']);
    expect(game.game.answer).toHaveLength(4);
  });

  it('works with given answer', () => {
    const game = GameServer.newGame(
      ['a', 'b'],
      {
        answerLength: 4,
        playerTimeoutMillis: 1000,
      },
      {
        answer: [1, 2, 3, 4],
      },
    );
    expect(game.state).toEqual(GameState.READY);
    expect(game.game.players).toContainEqual('a');
    expect(game.game.players).toContainEqual('b');
    expect(game.game.answer).toEqual([1, 2, 3, 4]);
  });

  it('rejects given answer wrong length', () => {
    expect(
      () => {
        GameServer.newGame(
          ['a', 'b'],
          {
            answerLength: 4,
            playerTimeoutMillis: 1000,
          },
          {
            answer: [1, 2, 3],
          },
        );
      },
    ).toThrow();
  });

  it('rejects invalid answerLength', () => {
    expect(
      () => {
        GameServer.newGame(
          ['a', 'b'],
          {
            answerLength: 0,
            playerTimeoutMillis: 1000,
          },
        );
      },
    ).toThrow();

    expect(
      () => {
        GameServer.newGame(
          ['a', 'b'],
          {
            answerLength: 10,
            playerTimeoutMillis: 1000,
          },
        );
      },
    ).toThrow();
  });

  it('rejects invalid playerTimeoutMillis', () => {
    expect(
      () => {
        GameServer.newGame(
          ['a', 'b'],
          {
            answerLength: 4,
            playerTimeoutMillis: 0,
          },
        );
      },
    ).toThrow();
  });

  it('rejects empty players', () => {
    expect(
      () => {
        GameServer.newGame(
          [],
          {
            answerLength: 4,
            playerTimeoutMillis: 1000,
          },
        );
      },
    ).toThrow();
  });

});

describe('GameServer constructor works', () => {

  const newGame: NewServerGameEvent = {
    type: GameEventType.NEW_GAME_SERVER,
    players: ['a', 'b'],
    answer: [1, 2, 3, 4],
    config: {
      answerLength: 4,
      playerTimeoutMillis: 1000,
    },
  };

  it('works', () => {
    const game = new GameServer(newGame);
    expect(game.state).toEqual(GameState.READY);
    expect(game.game.players).toEqual(['a', 'b']);
    expect(game.game.answer).toEqual([1, 2, 3, 4]);
    expect(game.game.guesser).toEqual(0);
  });

});

describe('GameServer lifecycle functions works', () => {

  it('works', () => {
    const game = newGameServer();
    expect(game.state).toBe(GameState.READY);
    game.start();
    expect(game.state).toBe(GameState.RUNNING);
    game.stop();
    expect(game.state).toBe(GameState.FINISHED);
  });

  it('accepts repeated start', () => {
    const game = newGameServer();

    game.start();
    expect(() => game.start()).not.toThrow();

    game.stop();
  });

  it('accepts repeated stop', () => {
    const game = newGameServer();

    game.start();

    game.stop();
    expect(() => game.stop()).not.toThrow();
  });

  it('rejects start after stop', () => {
    const server = newGameServer();
    server.start();
    server.stop();
    expect(() => server.start()).toThrow();
  });

});

describe('GameServer request works', () => {

  it('guess works', () => {
    withGameSever(game => {
      eventsCaptured(game, (game, events) => {

        guess(game, aSender, { player: 'a', guess: [1, 2, 4, 3] });

        expect(game.game.guesser).toBe(1);
        expect(events[events.length-1]).toEqual({
          type: GameEventType.GUESS,
          player: 'a',
          guess: [1, 2, 4, 3],
          a: 2,
          b: 2,
        });

      });
    });
  });

  it('guess wins correctly', () => {
    withGameSever(game => {

      guess(game,  aSender, { player: 'a', guess: [1, 2, 3, 4] });

      expect(game.game.winner).toBe('a');

    });
  });

  it('guess rejects not your turn', () => {
    withGameSever(game=>{
      const req: GuessRequest = {
        type: ServerGameRequestType.GUESS,
        player: 'b',
        guess: [1,7,8,9]
      };

      expect(()=>game.handleRequest(req, bSender)).toThrow();
    });

  });

  it('guess rejects invalid length', () => {
    withGameSever(game=>{
      const req: GuessRequest = {
        type: ServerGameRequestType.GUESS,
        player: 'a',
        guess: [1,7,8]
      };

      expect(()=>game.handleRequest(req, aSender)).toThrow();
    });
  });

  it('guess rejects finished game', () => {
    withGameSever(game=>{
      const req: GuessRequest = {
        type: ServerGameRequestType.GUESS,
        player: 'a',
        guess: [1,2,3,4]
      };
      game.handleRequest(req, aSender);

      const req2: GuessRequest = {
        type: ServerGameRequestType.GUESS,
        player: 'b',
        guess: [1,2,3,4]
      };
      expect(()=>game.handleRequest(req2, aSender)).toThrow();

    });
  });

  it('winning stops the game', () => {
    withGameSever(game=>{

      guess(game,  aSender, { player: 'a', guess: [1, 2, 3, 4], });

      expect(game.state).toBe(GameState.FINISHED);

    });
  });

  it('timeout works', () => {
    jest.useFakeTimers();
    withGameSever(game=>{

      jest.runOnlyPendingTimers();

      expect(game.game.guesser).toBe(1);

    });
  });

});


describe('GameServer eventing works', () => {

  it('eventing works', () => {
    let called: GuessEvent;

    const game = newGameServer();
    game.events.subscribe(v => called = v as GuessEvent);
    game.start();

    guess(game, aSender,{ player: 'a', guess: [1, 2, 4, 3] });

    expect(called.type).toEqual(GameEventType.GUESS);

    game.stop();
  });

});

describe('GameServer simulated playtesting', () => {

  it('works', () => {

    jest.useFakeTimers();

    const game = GameServer.newGame(
      ['a', 'b'],
      {
        answerLength: 4,
        playerTimeoutMillis: 1000,
      },
      {
        answer: [1, 2, 3, 4],
        players: ['a', 'b'],
      },
    );

    let lastEvent: GameEvent;
    game.events.subscribe(v => lastEvent = v);

    game.start();

    guess(game, aSender, { player: 'a', guess: [1, 2, 3, 5] });
    expect(lastEvent).toEqual(
      {
        type: GameEventType.GUESS,
        player: 'a',
        guess: [1, 2, 3, 5],
        a: 3,
        b: 0,
      },
    );

    jest.advanceTimersByTime(1000);
    expect(lastEvent).toEqual(
      {
        type: GameEventType.TIMEOUT,
      },
    );

    guess(game, aSender, { player: 'a', guess: [1, 4, 3, 6] });
    expect(lastEvent).toEqual(
      {
        type: GameEventType.GUESS,
        player: 'a',
        guess: [1, 4, 3, 6],
        a: 2,
        b: 1,
      },
    );

    guess(game, bSender,{ player: 'b', guess: [1, 2, 7, 4] });
    expect(lastEvent).toEqual(
      {
        type: GameEventType.GUESS,
        player: 'b',
        guess: [1, 2, 7, 4],
        a: 3,
        b: 0,
      },
    );

    guess(game, aSender, { player: 'a', guess: [1, 2, 3, 4] });
    expect(lastEvent).toEqual(
      {
        type: GameEventType.GUESS,
        player: 'a',
        guess: [1, 2, 3, 4],
        a: 4,
        b: 0,
      },
    );

    expect(game.game.winner).toEqual('a');

    game.stop();
  });

});
