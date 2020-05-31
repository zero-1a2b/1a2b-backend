import {
  ChangeSettingsEvent,
  GameFinishedEvent,
  GameStartedEvent,
  NewRoomEvent, NormalRoomEvent,
  PlayerJoinEvent,
  PlayerLeftEvent,
  PlayerReadyEvent,
  PlayerRenameEvent,
  PlayerUnreadyEvent,
  RoomEventType,
  RoomGameEvent,
} from '../../../src/room/logic/room.event';
import { Room, RoomState } from '../../../src/room/logic/room';
import { Game } from '../../../src/game/logic/game';
import { GameEventType } from '../../../src/game/logic/game.event';
import {
  GameRequest,
  GameStartRequest,
  PlayerConnectRequest,
  PlayerDisconnectRequest,
  PlayerReadyRequest, PlayerUnreadyRequest,
  RoomRequestType,
} from '../../../src/room/logic/room.request';
import { ServerGameRequestType } from '../../../src/game/logic/server-game.request';


const room = Room.fromNewRoomEvent(
  {
    type: RoomEventType.NEW_ROOM,
    id: 'test'
  }
);

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
    type: GameEventType.NEW_GAME_CLIENT,
    config: Game.DEFAULT_GAME_CONFIG,
    players: ['test']
  }
};


describe('Room.fromNewRoomEvent works', () => {

  it('works', () => {
    const event: NewRoomEvent = {
      type: RoomEventType.NEW_ROOM,
      id: 'test'
    };

    const room = Room.fromNewRoomEvent(event);

    expect(room.id).toEqual('test');
    expect(room.state).toEqual(RoomState.IDLE);
    expect(room.playerIDs).toEqual([]);
    expect(room.playerReady).toEqual(new Map());
    expect(room.gameConfig).toEqual(Game.DEFAULT_GAME_CONFIG);

  });

});

describe('Room handles event correctly', () => {

  const gameEvent: RoomGameEvent = {
    type: RoomEventType.GAME_EVENT,
    event: {
      type: GameEventType.TIMEOUT
    }
  };

  const gameFinishedEvent: GameFinishedEvent = {
    type: RoomEventType.GAME_FINISHED
  };

  it('handles changeSettings', () => {

    const changeSettingsEvent: ChangeSettingsEvent = {
      type: RoomEventType.CHANGE_SETTINGS,
      gameConfig: {
        playerTimeoutMillis: 2000,
        answerLength: 5
      }
    };

    const preRoom = room;
    const afterRoom = preRoom.handleEvent(changeSettingsEvent);

    expect(afterRoom.id).toEqual(preRoom.id);
    expect(afterRoom.state).toEqual(preRoom.state);
    expect(afterRoom.playerIDs).toEqual(preRoom.playerIDs);
    expect(afterRoom.playerReady).toEqual(preRoom.playerReady);
    expect(afterRoom.gameConfig).toEqual(
      {
        playerTimeoutMillis: 2000,
        answerLength: 5
      }
    );

  });

  it('handles playerJoin', () => {

    const preRoom = room;
    const afterRoom = preRoom.handleEvent(joinEvent);

    expect(afterRoom.id).toEqual(preRoom.id);
    expect(afterRoom.state).toEqual(preRoom.state);
    expect(afterRoom.playerIDs).toEqual(['test']);
    expect(afterRoom.playerReady).toEqual(new Map().set('test', false));
    expect(afterRoom.gameConfig).toEqual(preRoom.gameConfig);

  });

  it('handles playerLeave', () => {

    const joinEvent2: PlayerJoinEvent = {
      type: RoomEventType.PLAYER_JOIN,
      name: 'test2'
    };

    const leftEvent: PlayerLeftEvent = {
      type: RoomEventType.PLAYER_LEFT,
      name: 'test'
    };

    const preRoom = room.handleEvent(joinEvent).handleEvent(joinEvent2);
    const afterRoom = preRoom.handleEvent(leftEvent);

    expect(afterRoom.id).toEqual(preRoom.id);
    expect(afterRoom.state).toEqual(preRoom.state);
    expect(afterRoom.playerIDs).toEqual(['test2']);
    expect(afterRoom.playerReady).toEqual(new Map().set('test2', false));
    expect(afterRoom.gameConfig).toEqual(preRoom.gameConfig);
  });

  it('handles playerRename', () => {

    const renameEvent: PlayerRenameEvent = {
      type: RoomEventType.PLAYER_RENAME,
      from: 'test',
      to: 'test2'
    };

    const preRoom = room.handleEvent(joinEvent);
    const afterRoom = preRoom.handleEvent(renameEvent);

    expect(afterRoom.id).toEqual(preRoom.id);
    expect(afterRoom.state).toEqual(preRoom.state);
    expect(afterRoom.playerIDs).toEqual(['test2']);
    expect(afterRoom.playerReady).toEqual(new Map().set('test2', false));
    expect(afterRoom.gameConfig).toEqual(preRoom.gameConfig);
  });

  it('handles playerReady', () => {

    const preRoom = room.handleEvent(joinEvent);
    const afterRoom = preRoom.handleEvent(readyEvent);

    expect(afterRoom.id).toEqual(preRoom.id);
    expect(afterRoom.state).toEqual(preRoom.state);
    expect(afterRoom.playerIDs).toEqual(['test']);
    expect(afterRoom.playerReady).toEqual(new Map().set('test', true));
    expect(afterRoom.gameConfig).toEqual(preRoom.gameConfig);
  });

  it('handles playerUnready', () => {

    const unreadyEvent: PlayerUnreadyEvent = {
      type: RoomEventType.PLAYER_UNREADY,
      name: 'test'
    };

    const preRoom = room.handleEvent(joinEvent).handleEvent(readyEvent);
    const afterRoom = preRoom.handleEvent(unreadyEvent);

    expect(afterRoom.id).toEqual(preRoom.id);
    expect(afterRoom.state).toEqual(preRoom.state);
    expect(afterRoom.playerIDs).toEqual(['test']);
    expect(afterRoom.playerReady).toEqual(new Map().set('test', false));
    expect(afterRoom.gameConfig).toEqual(preRoom.gameConfig);

  });

  it('handles gameStarted', () => {

    const preRoom = room.handleEvent(joinEvent).handleEvent(readyEvent);
    const room2 = preRoom.handleEvent(startedEvent);

    expect(room2.id).toEqual(preRoom.id);
    expect(room2.state).toEqual(RoomState.GAMING);
    expect(room2.playerIDs).toEqual(preRoom.playerIDs);
    expect(room2.playerReady).toEqual(preRoom.playerReady);
    expect(room2.gameConfig).toEqual(preRoom.gameConfig);
  });

  it('handles game event', () => {

    const preRoom = room.handleEvent(joinEvent).handleEvent(readyEvent).handleEvent(startedEvent);
    const room2 = preRoom.handleEvent(gameEvent);

    expect(room2.id).toEqual(preRoom.id);
    expect(room2.state).toEqual(preRoom.state);
    expect(room2.playerIDs).toEqual(preRoom.playerIDs);
    expect(room2.playerReady).toEqual(preRoom.playerReady);
    expect(room2.gameConfig).toEqual(preRoom.gameConfig);
  });

  it('handles gameFinished', () => {

    const preRoom = room.handleEvent(joinEvent).handleEvent(readyEvent).handleEvent(startedEvent).handleEvent(gameEvent);
    const room2 = preRoom.handleEvent(gameFinishedEvent);

    expect(room2.id).toEqual(preRoom.id);
    expect(room2.state).toEqual(RoomState.FINISHED);
    expect(room2.playerIDs).toEqual(preRoom.playerIDs);
    expect(room2.playerReady).toEqual(preRoom.playerReady);
    expect(room2.gameConfig).toEqual(preRoom.gameConfig);
  });

});

describe('Room handles PlayerConnect Correctly', () => {

  it('accepts new player on idle state', () => {
    const req: PlayerConnectRequest = {
      type: RoomRequestType.CONNECT,
      player: 'a'
    };

    const preRoom = room;
    const event = preRoom.handleRequest(req) as PlayerJoinEvent;

    expect(event.type).toEqual(RoomEventType.PLAYER_JOIN);
    expect(event.name).toEqual('a');
  });

  it('rejects repeated player on idle state', () => {
    const req: PlayerConnectRequest = {
      type: RoomRequestType.CONNECT,
      player: 'a'
    };

    const preRoom = room.handleEvent(room.handleRequest(req) as NormalRoomEvent);
    const event = preRoom.handleRequest(req);

    expect(event).toBeInstanceOf(Error);
  });

  it('accepts old player on playing state', () => {

    const req: PlayerConnectRequest = {
      type: RoomRequestType.CONNECT,
      player: 'test'
    };

    const preRoom = room.handleEvent(joinEvent).handleEvent(readyEvent).handleEvent(startedEvent);
    const event = preRoom.handleRequest(req);

    //because we dont need to add any player
    expect(event).toBeNull();
  });

  it('rejects new player on playing state', () => {

    const req: PlayerConnectRequest = {
      type: RoomRequestType.CONNECT,
      player: 'a'
    };

    const preRoom = room.handleEvent(joinEvent).handleEvent(readyEvent).handleEvent(startedEvent);
    const event = preRoom.handleRequest(req);

    //because we dont need to add any player
    expect(event).toBeInstanceOf(Error);
  });


});

describe('Room handles PlayerDisConnect Correctly', () => {

  it('removes player on idle state', () => {
    const req: PlayerDisconnectRequest = {
      type: RoomRequestType.DISCONNECT,
      player: 'a'
    };

    const preRoom = room;
    const event = preRoom.handleRequest(req) as PlayerLeftEvent;

    expect(event.type).toEqual(RoomEventType.PLAYER_LEFT);
    expect(event.name).toEqual('a');
  });

  it('do nothing on old player on playing state', () => {

    const req: PlayerDisconnectRequest = {
      type: RoomRequestType.DISCONNECT,
      player: 'test'
    };

    const preRoom = room.handleEvent(joinEvent).handleEvent(readyEvent).handleEvent(startedEvent);
    const event = preRoom.handleRequest(req);

    //because we dont need to remove any player, hoping that guy can come back
    expect(event).toBeNull();
  });

});

describe('Room handles PlayerReady Correctly', () => {

  it('works', () => {
    const req: PlayerReadyRequest = {
      type: RoomRequestType.READY,
      player: 'test'
    };

    const preRoom = room.handleEvent(joinEvent);
    const event = preRoom.handleRequest(req) as PlayerReadyEvent;

    expect(event.type).toEqual(RoomEventType.PLAYER_READY);
    expect(event.name).toEqual('test');
  });

  it('rejects not existing player', () => {
    const req: PlayerReadyRequest = {
      type: RoomRequestType.READY,
      player: 'test'
    };

    const preRoom = room;
    const event = preRoom.handleRequest(req);

    //because we dont need to remove any player, hoping that guy can come back
    expect(event).toBeInstanceOf(Error);
  });

  it('rejects already playing game', () => {
    const req: PlayerReadyRequest = {
      type: RoomRequestType.READY,
      player: 'test'
    };

    const preRoom = room.handleEvent(joinEvent).handleEvent(readyEvent).handleEvent(startedEvent);
    const event = preRoom.handleRequest(req);

    //because we dont need to remove any player, hoping that guy can come back
    expect(event).toBeInstanceOf(Error);
  });

});

describe('Room handles PlayerUnready Correctly', () => {

  it('works', () => {
    const req: PlayerUnreadyRequest = {
      type: RoomRequestType.UNREADY,
      player: 'test'
    };

    const preRoom = room.handleEvent(joinEvent);
    const event = preRoom.handleRequest(req) as PlayerUnreadyEvent;

    expect(event.type).toEqual(RoomEventType.PLAYER_UNREADY);
    expect(event.name).toEqual('test');
  });

  it('rejects not existing player', () => {
    const req: PlayerUnreadyRequest = {
      type: RoomRequestType.UNREADY,
      player: 'test'
    };

    const preRoom = room;
    const event = preRoom.handleRequest(req);

    //because we dont need to remove any player, hoping that guy can come back
    expect(event).toBeInstanceOf(Error);
  });

  it('rejects already playing game', () => {
    const req: PlayerUnreadyRequest = {
      type: RoomRequestType.UNREADY,
      player: 'test'
    };

    const preRoom = room.handleEvent(joinEvent).handleEvent(readyEvent).handleEvent(startedEvent);
    const event = preRoom.handleRequest(req);

    //because we dont need to remove any player, hoping that guy can come back
    expect(event).toBeInstanceOf(Error);
  });

});

describe('Room handles GameStarted Correctly', () => {

  it('works', () => {
    const req: GameStartRequest = {
      type: RoomRequestType.START
    };

    const preRoom = room.handleEvent(joinEvent).handleEvent(readyEvent);
    const event = preRoom.handleRequest(req) as GameStartedEvent;

    expect(event.type).toEqual(RoomEventType.GAME_STARTED);
  });

  it('rejects on started game', () => {
    const req: GameStartRequest = {
      type: RoomRequestType.START
    };

    const preRoom = room.handleEvent(joinEvent).handleEvent(readyEvent).handleEvent(startedEvent);
    const event = preRoom.handleRequest(req) as GameStartedEvent;

    expect(event).toBeInstanceOf(Error);
  });

});

describe('Room rejects GameRequest', () => {

  it('works', () => {
    const req: GameRequest = {
      type: RoomRequestType.GAME,
      request: {
        type: ServerGameRequestType.TIMEOUT
      }
    };

    const preRoom = room.handleEvent(joinEvent).handleEvent(readyEvent).handleEvent(startedEvent);

    expect(()=>preRoom.handleRequest(req)).toThrow(Error);
  });

});
