import { RoomServer } from '../../src/room/server';
import { GameEventType } from '../../src/game/logic/game.event';
import {
  GameRequest,
  GameStartRequest,
  PlayerConnectRequest, PlayerDisconnectRequest,
  PlayerReadyRequest,
  RoomRequestType,
} from '../../src/room/logic/room.request';
import { GameStartedEvent, RoomClosedEvent, RoomEventType, RoomGameEvent } from '../../src/room/logic/room.event';
import { GuessRequest, ServerGameRequestType, TimeoutRequest } from '../../src/game/logic/server-game.request';


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
  });

  it('emit client maps correctly', () => {
    let recvClient: GameStartedEvent = null;
    const server = RoomServer.newRoom("123");
    server.clientEvents.subscribe(v=>v.type === RoomEventType.GAME_STARTED ? recvClient = v : null);

    server.handleRequest(connectRequest);
    server.handleRequest(readyRequest);
    server.handleRequest(startRequest);

    expect(recvClient.event.type).toBe(GameEventType.NEW_GAME_CLIENT);
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
  });

});

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


