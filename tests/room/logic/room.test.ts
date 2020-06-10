import {
  ChangeSettingsEvent,
  ChatEvent,
  GameFinishedEvent,
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

    expect(afterRoom.playerIDs).toEqual(['test']);
    expect(afterRoom.playerReady).toEqual(new Map().set('test', false));

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

    expect(afterRoom.playerIDs).toEqual(['test2']);
    expect(afterRoom.playerReady).toEqual(new Map().set('test2', false));

  });

  it('handles playerRename', () => {

    const renameEvent: PlayerRenameEvent = {
      type: RoomEventType.PLAYER_RENAME,
      from: 'test',
      to: 'test2'
    };

    const preRoom = room.handleEvent(joinEvent);
    const afterRoom = preRoom.handleEvent(renameEvent);

    expect(afterRoom.playerIDs).toEqual(['test2']);
    expect(afterRoom.playerReady).toEqual(new Map().set('test2', false));

  });

  it('handles playerReady', () => {

    const preRoom = room.handleEvent(joinEvent);
    const afterRoom = preRoom.handleEvent(readyEvent);

    expect(afterRoom.playerIDs).toEqual(['test']);
    expect(afterRoom.playerReady).toEqual(new Map().set('test', true));

  });

  it('handles playerUnready', () => {

    const unreadyEvent: PlayerUnreadyEvent = {
      type: RoomEventType.PLAYER_UNREADY,
      name: 'test'
    };

    const preRoom = room.handleEvent(joinEvent).handleEvent(readyEvent);
    const afterRoom = preRoom.handleEvent(unreadyEvent);

    expect(afterRoom.playerIDs).toEqual(['test']);
    expect(afterRoom.playerReady).toEqual(new Map().set('test', false));

  });

  it('handles gameStarted', () => {

    const preRoom = room.handleEvent(joinEvent).handleEvent(readyEvent);
    const room2 = preRoom.handleEvent(startedEvent);

    expect(room2.state).toEqual(RoomState.GAMING);
  });

  it('handles game event', () => {

    const preRoom = room.handleEvent(joinEvent).handleEvent(readyEvent).handleEvent(startedEvent);
    const room2 = preRoom.handleEvent(gameEvent);

    expect(room2).toEqual(preRoom);
  });

  it('handles gameFinished', () => {

    const preRoom = room.handleEvent(joinEvent).handleEvent(readyEvent).handleEvent(startedEvent).handleEvent(gameEvent);
    const room2 = preRoom.handleEvent(gameFinishedEvent);

    expect(room2.state).toEqual(RoomState.IDLE);
  });

  it('handles chat', () => {
    const chatEvent: ChatEvent = {
      type: RoomEventType.CHAT,
      msg: {
        name: "player",
        msg: "test"
      }
    };

    const preRoom = room.handleEvent(joinEvent).handleEvent(readyEvent).handleEvent(startedEvent).handleEvent(gameEvent);
    const room2 = preRoom.handleEvent(chatEvent);

    expect(room2.chats).toEqual([chatEvent.msg]);
  });

});
