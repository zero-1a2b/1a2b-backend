import { EventEmitter } from '../util/EventEmitter';
import { Room, RoomState } from './logic/room';
import {
  ChangeSettingsEvent,
  ChatEvent,
  GameStartedEvent,
  NewRoomEvent,
  NormalRoomEvent,
  PlayerJoinEvent,
  PlayerLeftEvent,
  PlayerReadyEvent,
  PlayerUnreadyEvent,
  RoomEvent,
  RoomEventType,
} from './logic/room.event';
import {
  ChangeSettingsRequest,
  ChatRequest,
  GameRequest,
  GameStartRequest,
  GetGameStateRequest,
  GetGameStateResponse,
  GetStateRequest,
  GetStateResponse,
  PlayerConnectRequest,
  PlayerDisconnectRequest,
  PlayerReadyRequest,
  PlayerUnreadyRequest,
  RoomRequestType,
  RoomServerRequest,
} from './server.request';
import { mapToClient, NewServerGameEvent, NormalGameEvent } from '../game/logic/game.event';
import { GameServer } from '../game/server';
import { mapToClient as mapStateToClient, newServerGameEvent } from '../game/logic/server-game';
import * as perm from '../util/sender';
import { assertTrue, INTERNAL_SENDER, RequestSender, SenderType } from '../util/sender';
import * as _ from 'lodash';
import { GameState } from '../game/game-state';
import { wrap } from '../util/util';


export class RoomServer {

  static newRoom(id: string): RoomServer {
    return new RoomServer({
      type: RoomEventType.NEW_ROOM,
      id: id
    });
  }


  public readonly events: EventEmitter<RoomEvent>;

  public readonly clientEvents: EventEmitter<RoomEvent>;

  public get state(): RoomState { return this.room.state; }

  public get room(): Room { return this._room; }
  private _room: Room;

  public get game(): GameServer { return this._game; }
  private _game: GameServer | null;


  constructor(event: NewRoomEvent){
    this.events = new EventEmitter();
    this.clientEvents = new EventEmitter();

    this._room = Room.fromNewRoomEvent(event);
    this._game = null;
  }

  // eventing - outbound

  acceptEvent(e: NormalRoomEvent): void {
    const cleanupGame = (): void => {
      if(this._game!==null) {
        this._game.stop();
        this._game = null;
      }
    };
    //side-effects
    switch (e.type) {
      case RoomEventType.GAME_STARTED:
        cleanupGame();
        this._game = new GameServer(e.event as NewServerGameEvent);
        this._game.events.subscribe(v => this.onGameEvent(v));
        this._game.start();
        break;
      case RoomEventType.GAME_EVENT:
        this._game.acceptEvent(e.event);
        break;
      case RoomEventType.GAME_FINISHED:
        cleanupGame();
        break;
      case RoomEventType.ROOM_CLOSED:
        cleanupGame();
        break;
      case RoomEventType.CHAT:
      case RoomEventType.CHANGE_SETTINGS:
      case RoomEventType.PLAYER_JOIN:
      case RoomEventType.PLAYER_LEFT:
      case RoomEventType.PLAYER_READY:
      case RoomEventType.PLAYER_UNREADY:
      case RoomEventType.PLAYER_RENAME:
        break;
    }
    this._room = this._room.handleEvent(e);
  }

  private acceptAndSendEvent(e: NormalRoomEvent): void {
    this.acceptEvent(e);
    this.sendEvent(e);
  }

  private sendEvent(e: NormalRoomEvent): void {
    this.events.emit(e);
    this.emitClientEvent(e);
  }

  private emitClientEvent(e: NormalRoomEvent): void {
    let result: NormalRoomEvent;
    switch (e.type) {
      case RoomEventType.CHAT:
      case RoomEventType.CHANGE_SETTINGS:
      case RoomEventType.PLAYER_JOIN:
      case RoomEventType.PLAYER_LEFT:
      case RoomEventType.PLAYER_READY:
      case RoomEventType.PLAYER_UNREADY:
      case RoomEventType.PLAYER_RENAME:
      case RoomEventType.GAME_EVENT:
      case RoomEventType.GAME_FINISHED:
      case RoomEventType.ROOM_CLOSED:
        result = e;
        break;
      case RoomEventType.GAME_STARTED:
        result = {
          type: RoomEventType.GAME_STARTED,
          event: mapToClient((e as GameStartedEvent).event as NewServerGameEvent)
        };
        break;
    }
    this.clientEvents.emit(result);
  }

  // eventing - inbound

  private onGameEvent(event: NormalGameEvent): void {
      this.sendEvent({
        type: RoomEventType.GAME_EVENT,
        event: event
      });
      if(this._game.state === GameState.FINISHED) {
        this.sendEvent({
          type: RoomEventType.GAME_FINISHED,
          winner: this.game.game.winner
        });
      }
  }

  // lifecycle

  close(): void {
    this.acceptAndSendEvent({
      type: RoomEventType.ROOM_CLOSED
    });
  }

  // operations for handling request

  canConnect(player: string): boolean {
    try {
      this.handlePlayerConnect({
        type: RoomRequestType.CONNECT,
        player: player
      }, INTERNAL_SENDER);
      return true;
    } catch (e) {
      return false;
    }
  }

  handleRequest(req: RoomServerRequest, sender: RequestSender): object | null {
    let events: Array<NormalRoomEvent>;
    let ret: object | null = null;
    switch (req.type) {
      case RoomRequestType.CHANGE_SETTINGS:
        events = wrap(this.handleChangeSettings(req as ChangeSettingsRequest, sender));
        break;
      case RoomRequestType.CONNECT:
        events = wrap(this.handlePlayerConnect(req as PlayerConnectRequest, sender));
        break;
      case RoomRequestType.DISCONNECT:
        events = wrap(this.handlePlayerDisconnect(req as PlayerDisconnectRequest, sender));
        break;
      case RoomRequestType.READY:
        events = wrap(this.handlePlayerReady(req as PlayerReadyRequest, sender));
        break;
      case RoomRequestType.UNREADY:
        events = wrap(this.handlePlayerUnready(req as PlayerUnreadyRequest, sender));
        break;
      case RoomRequestType.START:
        events = wrap(this.handleGameStart(req as GameStartRequest, sender));
        break;
      case RoomRequestType.GAME:
        events = wrap(this.handleGameRequest(req as GameRequest, sender));
        break;
      case RoomRequestType.CHAT:
        events = wrap(this.handleChatRequest(req as ChatRequest, sender));
        break;
      case RoomRequestType.GET_STATE:
        events = [];
        ret = this.handleGetState(req as GetStateRequest, sender);
        break;
      case RoomRequestType.GET_GAME_STATE:
        events = [];
        ret = this.handleGetGameState(req as GetGameStateRequest, sender);
        break;
    }
    //apply events
    events.forEach(r=>this.acceptAndSendEvent(r));
    return ret;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleChangeSettings(req: ChangeSettingsRequest, _sender: RequestSender): ChangeSettingsEvent {
    if (this.state!==RoomState.IDLE) {
      throw new Error("error.game_already_started");
    }
    return {
      type: RoomEventType.CHANGE_SETTINGS,
      config: req.config
    };
  }

  private handlePlayerConnect(req: PlayerConnectRequest, sender: RequestSender): PlayerJoinEvent | null {
    perm.assertInternalSender(sender);

    if(this.room.playerIDs.length >= this.room.config.maxPlayers) {
      throw new Error("error.room_full");
    }

    if(this.room.state === RoomState.IDLE) {
      // still in room state
      if(this.room.playerIDs.findIndex(v=>v===req.player) != -1) {
        throw new Error("error.name_repeated");
      }
    } else {
      //playing state
      if(this.game.game.players.findIndex(v=>v===req.player) == -1) {
        throw new Error("error.not_playing_player");
      }
    }

    return {
      type: RoomEventType.PLAYER_JOIN,
      player: req.player
    };
  }

  private handlePlayerDisconnect(req: PlayerDisconnectRequest, sender: RequestSender): PlayerLeftEvent | null {
    perm.assertInternalSender(sender);
    //trivially success
    if(this.room.playerIDs.find(v=>v===req.player) === undefined) {
      return null;
    }
    return {
      type: RoomEventType.PLAYER_LEFT,
      player: req.player
    };
  }

  private handlePlayerReady(req: PlayerReadyRequest, sender: RequestSender): PlayerReadyEvent {
    perm.assertTrue(sender.type === SenderType.PLAYER && req.player === sender.player);

    if(this.room.state !== RoomState.IDLE) {
      throw new Error("error.game_already_started");
    } else {
      if(this.room.playerIDs.findIndex(v=>v===req.player) === -1) {
        throw new Error("error.player_not_exists");
      }
      return {
        type: RoomEventType.PLAYER_READY,
        player: req.player
      };
    }
  }

  private handlePlayerUnready(req: PlayerUnreadyRequest, sender: RequestSender): PlayerUnreadyEvent {
    perm.assertTrue(sender.type === SenderType.PLAYER && req.player === sender.player);

    if(this.room.state !== RoomState.IDLE) {
      throw new Error("error.game_already_started");
    } else {
      if(this.room.playerIDs.findIndex(v=>v===req.player) === -1) {
        throw new Error("error.player_not_exists");
      }
      return {
        type: RoomEventType.PLAYER_UNREADY,
        player: req.player
      };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleGameStart(_req: GameStartRequest, sender: RequestSender): GameStartedEvent {
    assertTrue(sender!=undefined); //anyone can start the game

    if(this.room.state != RoomState.IDLE) {
      throw new Error("error.already_started");
    }

    const allReady = _.reduce([...this.room.playerReady.values()], (acc,val)=>acc&&val, true);
    if(!allReady) {
      throw new Error("error.not_all_prepared");
    }

    return {
      type: RoomEventType.GAME_STARTED,
      event: newServerGameEvent(
        this.room.playerIDs,
        this.room.config.game
      )
    };
  }

  private handleGameRequest(req: GameRequest, sender: RequestSender): Array<NormalRoomEvent> {
    if(this._game === null) {
      throw new Error("error.game_not_started");
    } else {
      this._game.handleRequest(req.request, sender);
      if(this._game.game.winner !== undefined) {
        return [
          {
            type: RoomEventType.ROOM_CLOSED
          }
        ];
      } else {
        return [];
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleGetState(_req: GetStateRequest, _sender: RequestSender): GetStateResponse {
    const ready = {};
    this.room.playerReady.forEach((value, key) => ready[key]=value);
    return {
      room: {
        id: this.room.id,
        state: this.room.state,
        playerIDs: this.room.playerIDs,
        playerReady: ready,
        chats: this.room.chats,
        config: this.room.config
      },
      game: this.game !== null ? mapStateToClient(this.game.game) : null
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleGetGameState(_req: GetGameStateRequest, _sender: RequestSender): GetGameStateResponse {
    const ready = {};
    this.room.playerReady.forEach((value, key) => ready[key]=value);
    return {
      type: RoomRequestType.GET_GAME_STATE,
      game: this.game !== null ? mapStateToClient(this.game.game) : null
    }
  }

  // noinspection JSMethodCanBeStatic
  private handleChatRequest(req: ChatRequest, sender: RequestSender): ChatEvent {
    perm.assertTrue(
      perm.isInternalSender(sender)
      || (perm.isPlayerSender(sender) && sender.player === req.msg.name)
    );

    return {
      type: RoomEventType.CHAT,
      msg: req.msg
    };
  }

}
