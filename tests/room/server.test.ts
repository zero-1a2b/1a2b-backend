import { RoomServer } from '../../src/room/server';
import { GameEventType } from '../../src/game/logic/game.event';
import {
  GameRequest,
  GameStartRequest,
  PlayerConnectRequest, PlayerDisconnectRequest,
  PlayerReadyRequest, PlayerUnreadyRequest, RoomRequest,
  RoomRequestType,
} from '../../src/room/logic/room.request';
import {
  GameStartedEvent, NormalRoomEvent, PlayerJoinEvent,
  PlayerReadyEvent,
  RoomClosedEvent,
  RoomEventType,
  RoomGameEvent,
} from '../../src/room/logic/room.event';
import { GuessRequest, ServerGameRequestType, TimeoutRequest } from '../../src/game/logic/server-game.request';
import { Game } from '../../src/game/logic/game';


const connectRequest: PlayerConnectRequest = {
  type: RoomRequestType.CONNECT,
  player: 'test'
};

const readyRequest: PlayerReadyRequest = {
  type: RoomRequestType.READY,
  player: 'test'
};

const connect2Request: PlayerConnectRequest = {
  type: RoomRequestType.CONNECT,
  player: 'test2'
};

const ready2Request: PlayerReadyRequest = {
  type: RoomRequestType.READY,
  player: 'test2'
};

const startRequest: GameStartRequest = {
  type: RoomRequestType.START
};


describe('RoomServer.newRoom', () => {

  it('works', () => {
    expect(RoomServer.newRoom("123")).toBeTruthy();
  });

});

describe('RoomServer constructor', () => {

  it('works', () => {
    expect(new RoomServer({
      type: RoomEventType.NEW_ROOM,
      id: "123"
    })).toBeTruthy();
  });

});

describe('RoomServer lifecycle works', () => {

  it('works', () => {
    let recvClient: RoomClosedEvent = null;
    const server = RoomServer.newRoom("123");
    server.clientEvents.subscribe(v=>v.type === RoomEventType.ROOM_CLOSED ? recvClient = v : null);

    server.close();

    expect(recvClient.type).toBe(RoomEventType.ROOM_CLOSED);
  });

  it('closes game correctly', () => {
    let recvClient: RoomClosedEvent = null;
    const server = RoomServer.newRoom("123");
    server.clientEvents.subscribe(v=>v.type === RoomEventType.ROOM_CLOSED ? recvClient = v : null);

    server.handleRequest(connectRequest);
    server.handleRequest(readyRequest);
    server.handleRequest(startRequest);
    server.close();

    expect(recvClient.type).toBe(RoomEventType.ROOM_CLOSED);
  });

});

describe('RoomServer eventing works', () => {

  it('emit works', () => {
    let recvClient = false;
    let recvServer = false;
    const server = RoomServer.newRoom("123");
    server.events.subscribe(()=>recvServer=true);
    server.clientEvents.subscribe(()=>recvClient=true);

    server.handleRequest(connectRequest);
    server.handleRequest(readyRequest);

    expect(recvClient).toBe(true);
    expect(recvServer).toBe(true);

    server.close();
  });

  it('emit client maps correctly', () => {
    let recvClient: GameStartedEvent = null;
    const server = RoomServer.newRoom("123");
    server.clientEvents.subscribe(v=>v.type === RoomEventType.GAME_STARTED ? recvClient = v : null);

    server.handleRequest(connectRequest);
    server.handleRequest(readyRequest);
    server.handleRequest(startRequest);

    expect(recvClient.event.type).toBe(GameEventType.NEW_GAME_CLIENT);

    server.close();
  });

  it('emit forwards game correctly', () => {
    let recvClient: RoomGameEvent = null;
    const server = RoomServer.newRoom("123");
    server.clientEvents.subscribe(v=>v.type === RoomEventType.GAME_EVENT ? recvClient = v : null);

    server.handleRequest(connectRequest);
    server.handleRequest(readyRequest);
    server.handleRequest(startRequest);
    const r: GuessRequest = {
      type: ServerGameRequestType.GUESS,
      player: 'test',
      guess: [1, 1, 1, 1]
    };
    const req: GameRequest = {
      type: RoomRequestType.GAME,
      request: r
    };
    server.handleRequest(req);

    expect(recvClient.event.type).toBe(GameEventType.GUESS);

    server.close();
  });

  it('accept works', () => {
    const server = RoomServer.newRoom("123");

    server.handleRequest(connectRequest);
    server.handleRequest(readyRequest);
    server.handleRequest(connect2Request);

    server.acceptEvent({
      type: RoomEventType.PLAYER_READY,
      name: 'test2'
    });

    expect(server.room.playerReady.get("test2")).toEqual(true);

    server.close();
  });

  it('accept forwards to game', () => {
    const server = RoomServer.newRoom("123");

    server.handleRequest(connectRequest);
    server.handleRequest(readyRequest);
    server.handleRequest(connect2Request);
    server.handleRequest(ready2Request);
    server.handleRequest(startRequest);

    const r: TimeoutRequest = {
      type: ServerGameRequestType.TIMEOUT
    };
    const req: GameRequest = {
      type: RoomRequestType.GAME,
      request: r
    };
    server.handleRequest(req);

    expect(server.game.game.guesser).toEqual(1);

    server.close();
  });

});

// request //

const joinEvent: PlayerJoinEvent = {
  type: RoomEventType.PLAYER_JOIN,
  name: 'test'
};

const readyEvent: PlayerReadyEvent = {
  type: RoomEventType.PLAYER_READY,
  name: 'test'
};

const startedEvent: GameStartedEvent = {
  type: RoomEventType.GAME_STARTED,
  event: {
    type: GameEventType.NEW_GAME_SERVER,
    config: Game.DEFAULT_GAME_CONFIG,
    players: ['test'],
    answer: [1,2,3,4]
  }
};


// noinspection JSUnusedLocalSymbols
type testOp = () => { room: RoomServer, events: Array<NormalRoomEvent> };

interface TestRequestTemplate<Request extends RoomRequest> {

  prevEvent: Array<NormalRoomEvent>;

  request: Request;

  assertions: (testOp) => void;

}

function testRequest<Request extends RoomRequest>(template: TestRequestTemplate<Request>): void {
  const room = RoomServer.newRoom("123");
  template.prevEvent.forEach(v=>room.acceptEvent(v));

  template.assertions(()=>{
    const events = [];
    const sub = room.events.subscribe(v=>events.push(v));
    room.handleRequest(template.request);
    sub.unsubscribe();
    return {
      room: room,
      events: events
    };
  });

  room.close();
}


describe('Room handles PlayerConnect Correctly', () => {

  it('accepts new player on idle state', () => {
    testRequest<PlayerConnectRequest>({
      prevEvent: [],
      request: {
        type: RoomRequestType.CONNECT,
        player: 'a'
      },
      assertions: (run) => {
        const { room, events } = run();
        expect(room.room.playerIDs).toEqual(['a']);
        expect(events).toEqual([
          {
            type: RoomEventType.PLAYER_JOIN,
            name: 'a'
          }
        ])
      }
    });
  });

  it('rejects repeated player on idle state', () => {
    testRequest<PlayerConnectRequest>({
      prevEvent: [
        joinEvent
      ],
      request: {
        type: RoomRequestType.CONNECT,
        player: joinEvent.name
      },
      assertions: (run) => {
        expect(run).toThrow();
      }
    });
  });

  it('accepts old player on playing state', () => {
    testRequest<PlayerConnectRequest>({
      prevEvent: [
        joinEvent,
        readyEvent,
        startedEvent
      ],
      request: {
        type: RoomRequestType.CONNECT,
        player: joinEvent.name
      },
      assertions: (run) => {
        expect(run).not.toThrow();
      }
    });
  });

  it('rejects new player on playing state', () => {
    testRequest<PlayerConnectRequest>({
      prevEvent: [
        joinEvent,
        readyEvent,
        startedEvent
      ],
      request: {
        type: RoomRequestType.CONNECT,
        player: 'a'
      },
      assertions: (run) => {
        expect(run).toThrow();
      }
    });
  });

});

describe('Room handles PlayerDisconnect Correctly', () => {

  it('removes player on idle state', () => {
    testRequest<PlayerDisconnectRequest>({
      prevEvent: [
        joinEvent,
      ],
      request: {
        type: RoomRequestType.DISCONNECT,
        player: joinEvent.name
      },
      assertions: (run) => {
        const { room, events } = run();
        expect(room.room.playerIDs).toEqual([]);
        expect(events).toEqual([
          {
            type: RoomEventType.PLAYER_LEFT,
            name: 'test'
          }
        ])
      }
    });
  });

  it('removes old player from room on playing state', () => {
    testRequest<PlayerDisconnectRequest>({
      prevEvent: [
        joinEvent,
        readyEvent,
        startedEvent
      ],
      request: {
        type: RoomRequestType.DISCONNECT,
        player: joinEvent.name
      },
      assertions: (run) => {
        const { room, events } = run();
        expect(room.room.playerIDs).toEqual([]);
        expect(events).toEqual([
          {
            type: RoomEventType.PLAYER_LEFT,
            name: 'test'
          }
        ])
      }
    });
  });

});

describe('Room handles PlayerReady Correctly', () => {

  it('works', () => {
    testRequest<PlayerReadyRequest>({
      prevEvent: [
        joinEvent
      ],
      request: {
        type: RoomRequestType.READY,
        player: joinEvent.name
      },
      assertions: (run) => {
        const { room, events } = run();
        expect(room.room.playerReady).toEqual(new Map([['test', true]]));
        expect(events).toEqual([
          {
            type: RoomEventType.PLAYER_READY,
            name: joinEvent.name
          }
        ])
      }
    });
  });

  it('rejects not existing player', () => {
    testRequest<PlayerReadyRequest>({
      prevEvent: [
        joinEvent
      ],
      request: {
        type: RoomRequestType.READY,
        player: 'test0'
      },
      assertions: (run) => {
        expect(run).toThrow();
      }
    });
  });

  it('rejects already playing game', () => {
    testRequest<PlayerReadyRequest>({
      prevEvent: [
        joinEvent,
        readyEvent,
        startedEvent
      ],
      request: {
        type: RoomRequestType.READY,
        player: 'test0'
      },
      assertions: (run) => {
        expect(run).toThrow();
      }
    });
  });

});

describe('Room handles PlayerUnready Correctly', () => {

  it('works', () => {
    testRequest<PlayerUnreadyRequest>({
      prevEvent: [
        joinEvent,
        readyEvent
      ],
      request: {
        type: RoomRequestType.UNREADY,
        player: joinEvent.name
      },
      assertions: (run) => {
        const { room, events } = run();
        expect(room.room.playerReady).toEqual(new Map([['test', false]]));
        expect(events).toEqual([
          {
            type: RoomEventType.PLAYER_UNREADY,
            name: joinEvent.name
          }
        ])
      }
    });
  });

  it('rejects not existing player', () => {
    testRequest<PlayerUnreadyRequest>({
      prevEvent: [],
      request: {
        type: RoomRequestType.UNREADY,
        player: 'test0'
      },
      assertions: (run) => {
        expect(run).toThrow();
      }
    });
  });

  it('rejects already playing game', () => {
    testRequest<PlayerUnreadyRequest>({
      prevEvent: [
        joinEvent,
        readyEvent,
        startedEvent
      ],
      request: {
        type: RoomRequestType.UNREADY,
        player: 'test'
      },
      assertions: (run) => {
        expect(run).toThrow();
      }
    });
  });

});

describe('Room handles GameStarted Correctly', () => {

  it('works', () => {
    testRequest<GameStartRequest>({
      prevEvent: [
        joinEvent,
        readyEvent
      ],
      request: {
        type: RoomRequestType.START
      },
      assertions: (run) => {
        const { room, events } = run();
        expect(room.game).not.toBeNull();
        expect(events[0].type).toEqual(RoomEventType.GAME_STARTED);
      }
    });
  });

  it('rejects on started game', () => {
    testRequest<GameStartRequest>({
      prevEvent: [
        joinEvent,
        readyEvent,
        startedEvent
      ],
      request: {
        type: RoomRequestType.START
      },
      assertions: (run) => {
        expect(run).toThrow();
      }
    });
  });

});

describe('Room handles GameRequest', () => {

  it('works', () => {
    testRequest<GameRequest>({
      prevEvent: [
        joinEvent,
        readyEvent,
        startedEvent
      ],
      request: {
        type: RoomRequestType.GAME,
        request: {
          type: ServerGameRequestType.TIMEOUT
        }
      },
      assertions: (run) => {
        expect(run).not.toThrow();
      }
    });
  });

});

// integration //

describe('simulated play through', () => {

  function connect(name: string): PlayerConnectRequest {
    return {
      type: RoomRequestType.CONNECT,
      player: name
    }
  }

  function disconnect(name: string): PlayerDisconnectRequest {
    return {
      type: RoomRequestType.DISCONNECT,
      player: name
    }
  }

  function ready(name: string): PlayerReadyRequest {
    return {
      type: RoomRequestType.READY,
      player: name
    };
  }

  function unready(name: string): PlayerReadyRequest {
    return {
      type: RoomRequestType.READY,
      player: name
    };
  }

  function gameStart(): GameStartRequest {
    return {
      type: RoomRequestType.START
    }
  }

  function guess(player: string, guess: number[]): GameRequest {
    return {
      type: RoomRequestType.GAME,
      request: {
        type: ServerGameRequestType.GUESS,
        player: player,
        guess: guess
      } as GuessRequest
    }
  }

  it('complex case', () => {
    const server = RoomServer.newRoom("123");

    server.handleRequest(connect('test'));
    server.handleRequest(ready('test'));
    server.handleRequest(unready('test'));
    server.handleRequest(ready('test'));

    server.handleRequest(connect('test2'));
    server.handleRequest(disconnect('test2'));
    server.handleRequest(connect('test2'));

    server.handleRequest(gameStart());

    const playerA = server.game.game.players[0];
    const playerB = server.game.game.players[1];

    server.handleRequest(
      guess(
        playerA,
        [...server.game.game.answer].map((v,idx)=>idx===3?-v:v)
      )
    );

    server.handleRequest(
      guess(
        playerB,
        [...server.game.game.answer]
      )
    );

    expect(server.game.game.winner).toEqual(playerB);
  });

});


