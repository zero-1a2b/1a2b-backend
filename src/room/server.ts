import { EventEmitter } from '../util/EventEmitter';
import { Room, RoomState } from './logic/room';
import {
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
  GameRequest,
  GameStartRequest,
  PlayerConnectRequest,
  PlayerDisconnectRequest,
  PlayerReadyRequest,
  PlayerUnreadyRequest,
  RoomServerRequest,
  RoomRequestType, ChatRequest, GetStateRequest, GetStateResponse,
} from './server.request';
import { mapToClient, NewServerGameEvent, NormalGameEvent } from '../game/logic/game.event';
import { GameServer } from '../game/server';
import { mapToClient as mapStateToClient, newServerGameEvent } from '../game/logic/server-game';
import * as perm from '../util/sender';
import { assertTrue, RequestSender, SenderType } from '../util/sender';
import * as _ from 'lodash';


export class RoomServer {

  static newRoom(id: string): RoomServer {
    return new RoomServer({
      type: RoomEventType.NEW_ROOM,
      id: id
    });
  }


  public get state(): RoomState { return this.room.state; }

  public readonly events: EventEmitter<RoomEvent>;

  public readonly clientEvents: EventEmitter<RoomEvent>;

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

  // eventing

  acceptEvent(e: NormalRoomEvent): void {
    this._room = this._room.handleEvent(e);
    if(e.type === RoomEventType.GAME_STARTED) {
      if(this._game!==null) {
        this._game.stop();
        this._game = null;
      }
      this._game = new GameServer(e.event as NewServerGameEvent);
      this._game.events.subscribe(v => this.onGameEvent(v));
      this._game.start();
    }
    if(e.type === RoomEventType.GAME_EVENT) {
      this._game.acceptEvent(e.event);
    }
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

  // lifecycle

  close(): void {
    if(this._game!==null) {
      this._game.stop();
      this._game = null;
    }
    this.acceptAndSendEvent({
      type: RoomEventType.ROOM_CLOSED
    });
  }

  // operations for handling request

  /**
   * handle request
   * @param req the request
   * @param sender send by who, string for player, null for system internal
   */
  handleRequest(req: RoomServerRequest, sender: RequestSender): object | null {
    let events: Array<NormalRoomEvent>;
    let ret: object | null = null;
    switch (req.type) {
      case RoomRequestType.CONNECT:
        events = this.wrap(this.handlePlayerConnect(req as PlayerConnectRequest, sender));
        break;
      case RoomRequestType.DISCONNECT:
        events = this.wrap(this.handlePlayerDisconnect(req as PlayerDisconnectRequest, sender));
        break;
      case RoomRequestType.READY:
        events = this.wrap(this.handlePlayerReady(req as PlayerReadyRequest, sender));
        break;
      case RoomRequestType.UNREADY:
        events = this.wrap(this.handlePlayerUnready(req as PlayerUnreadyRequest, sender));
        break;
      case RoomRequestType.START: {
        const oret = this.handleGameStart(req as GameStartRequest, sender);
        //side-effects
        if(!(oret instanceof Error)) {
          this._game = new GameServer(oret.event as NewServerGameEvent);
          this._game.events.subscribe(v => this.onGameEvent(v));
          this._game.start();
        }
        events = this.wrap(oret);
        break;
      }
      case RoomRequestType.GAME:
        events = this.wrap(this.handleGameRequest(req as GameRequest, sender));
        break;
      case RoomRequestType.CHAT:
        events = this.wrap(this.handleChatRequest(req as ChatRequest, sender));
        break;
      case RoomRequestType.GET_STATE:
        events = [];
        ret = this.handleGetState(req as GetStateRequest, sender);
        break;
    }
    //apply events
    events.forEach(r=>this.acceptAndSendEvent(r));
    return ret;
  }

  private handlePlayerConnect(req: PlayerConnectRequest, sender: RequestSender): PlayerJoinEvent | null {
    perm.assertInternalSender(sender);

    if(this.room.state === RoomState.IDLE) {
      // still in room state
      if(this.room.playerIDs.findIndex(v=>v===req.player) != -1) {
        throw new Error("error.name_repeated");
      }
      return {
        type: RoomEventType.PLAYER_JOIN,
        player: req.player
      };
    } else {
      //playing state
      if(this.room.playerIDs.findIndex(v=>v===req.player) == -1) {
        throw new Error("error.not_playing_player");
      } else {
        return null;
      }
    }
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
        this.room.gameConfig
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
            type: RoomEventType.GAME_FINISHED
          },
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
        gameConfig: this.room.gameConfig
      },
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

  // noinspection JSMethodCanBeStatic
  private wrap(e: Array<NormalRoomEvent> | NormalRoomEvent | null): Array<NormalRoomEvent> {
    if(e === null) {
      return [];
    } else if(e instanceof Array) {
      return e;
    } else {
      return [e];
    }
  }


  private onGameEvent(event: NormalGameEvent): void {
    this.sendEvent({
      type: RoomEventType.GAME_EVENT,
      event: event
    });
  }

}
