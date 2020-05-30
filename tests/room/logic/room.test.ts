import {
  ChangeSettingsEvent, GameFinishedEvent,
  GameStartedEvent,
  NewRoomEvent,
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
