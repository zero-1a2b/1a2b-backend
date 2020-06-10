import { GameEventType, GuessEvent } from '../../src/game/logic/game.event';
import { RoomClient } from '../../src/room/client';
import {
  GameStartedEvent,
  PlayerJoinEvent,
  PlayerReadyEvent,
  RoomEventType,
  RoomGameEvent,
} from '../../src/room/logic/room.event';
import { Game } from '../../src/game/logic/game';
import { RoomState } from '../../src/room/logic/room';


const joinEvent: PlayerJoinEvent = {
  type: RoomEventType.PLAYER_JOIN,
  player: 'test'
};

const readyEvent: PlayerReadyEvent = {
  type: RoomEventType.PLAYER_READY,
  player: 'test'
};

const startedEvent: GameStartedEvent = {
  type: RoomEventType.GAME_STARTED,
  event: {
    type: GameEventType.NEW_GAME_CLIENT,
    config: Game.DEFAULT_GAME_CONFIG,
    players: ['test']
  }
};

const guessEvent: RoomGameEvent = {
  type: RoomEventType.GAME_EVENT,
  event: {
    type: GameEventType.GUESS,
    player: 'test',
    guess: [1,1,1,1]
  } as GuessEvent
};

describe('RoomClient constructor works', () => {

  it('works', () => {
    expect(new RoomClient({
      type: RoomEventType.NEW_ROOM,
      id: "123"
    })).toBeTruthy();
  });

});

describe('GameClient accepting event works', () => {

  it('works', () => {
    const client = new RoomClient({
      type: RoomEventType.NEW_ROOM,
      id: "123"
    });

    client.acceptEvent(joinEvent);
    client.acceptEvent(readyEvent);
    client.acceptEvent(startedEvent);
    client.acceptEvent(guessEvent);

    expect(client.state).toEqual(RoomState.GAMING);
    expect(client.game.game.guesser).toEqual(0);
  });


});
