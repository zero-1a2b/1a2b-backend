import { RoomServer } from '../room/server';
import { NewRoomEvent, RoomEvent, RoomEventType } from '../room/logic/room.event';
import * as ws from 'ws';
import { PlayerConnectRequest, PlayerDisconnectRequest, RoomRequestType } from '../room/server.request';
import { INTERNAL_SENDER, SenderType } from '../util/sender';
import { getLogger } from 'log4js';

const log = getLogger('root-server');

function closeOnErrorDefined(action: string, conn: ws): (e?: Error) => void {
  return function(err?: Error): void {
    if (err !== undefined) {
      log.debug(`error while performing ${action}, closing: ${err.name}:${err.message}`);
      conn.close(5000, 'error.unknown');
    }
  };
}

/**
 * represents the 'root' server, in charge of all the event and connection issues
 */
export class RootServer {

  get room(): RoomServer { return this._room; }

  private _room: RoomServer;

  private history: RoomEvent[];

  private playerConnections: Set<ws>;

  private observerConnections: Set<ws>;


  constructor(
    event: NewRoomEvent,
  ) {
    this._room = new RoomServer(event);
    //connections
    this.playerConnections = new Set();
    this.observerConnections = new Set();
    //events
    this.history = [];
    this._room.events.subscribe(e => e.type === RoomEventType.ROOM_CLOSED ? (this.onClose()) : null);
    this._room.clientEvents.subscribe(e => this.saveAndDeliverPlayerEvent(e));
    //save the initial event
    this.saveAndDeliverPlayerEvent(event);
  }

  close(): void {
    this._room.close();
  }

  private onClose(): void {
    console.log('closing connections');
    this.playerConnections.forEach(v => v.close(1007, 'status.room_closing'));
    this.observerConnections.forEach(v => v.close(1007, 'status.room_closing'));
  }

  canConnect(player: string): boolean {
    if(this._room !== null) {
      return this._room.canConnect(player);
    } else {
      return false;
    }
  }

  onNewPlayerConnection(socket: ws, player: string): void {
    const conn: PlayerConnectRequest = {
      type: RoomRequestType.CONNECT,
      player: player,
    };
    try {
      this._room.handleRequest(conn, INTERNAL_SENDER);
      this.acceptPlayerConnection(socket, player);
    } catch (e) {
      const err: Error = e;
      socket.close(4000, err.message);
    }
  }

  onNewObserverConnection(socket: ws): void {
    this.acceptObserverConnection(socket);
  }

  private acceptPlayerConnection(conn: ws, name: string): void {
    conn.addEventListener('message', (event) => {
      try {
        log.debug(`room:[${this._room.room.id}] player:[${name}] processing player request: [${event.data}]`);
        const ret = this._room.handleRequest(JSON.parse(event.data), { type: SenderType.PLAYER, player: name });
        conn.send(JSON.stringify({ 'code': 'success', 'resp': ret }));
      } catch (e) {
        const err: Error = e;
        log.debug(`room:[${this._room.room.id}] player:[${name}] error processing player request: ${err.name}:${err.message}\n${err.stack}`);
        conn.send(JSON.stringify({ 'code': 'error', 'message': err.message }));
      }
    });
    conn.addEventListener('close', () => {
      this.playerConnections.delete(conn);
      const left: PlayerDisconnectRequest = {
        type: RoomRequestType.DISCONNECT,
        player: name,
      };
      this._room.handleRequest(left, INTERNAL_SENDER);
    });
    conn.addEventListener('error', () => {
      this.playerConnections.delete(conn);
      const left: PlayerDisconnectRequest = {
        type: RoomRequestType.DISCONNECT,
        player: name,
      };
      this._room.handleRequest(left, INTERNAL_SENDER);
    });
    log.debug(`room:[${this._room.room.id}] replaying ${this.history.length} events to player[${name}]`);
    this.history.forEach(e => conn.send(JSON.stringify(e), closeOnErrorDefined('player-replay', conn)));
    this.playerConnections.add(conn);
  }

  private acceptObserverConnection(conn: ws): void {
    conn.addEventListener('close', () => {
      this.observerConnections.delete(conn);
    });
    conn.addEventListener('error', () => {
      this.observerConnections.delete(conn);
    });
    log.debug(`room:[${this._room.room.id}] replaying ${this.history.length} events to observer`);
    this.history.forEach(e => conn.send(JSON.stringify(e), closeOnErrorDefined('observer-replay', conn)));
    this.observerConnections.add(conn);
  }

  private saveAndDeliverPlayerEvent(e: RoomEvent): void {
    this.history.push(e);
    this.playerConnections.forEach(ob => {
      ob.send(JSON.stringify(e), closeOnErrorDefined('player-send', ob));
    });
    this.observerConnections.forEach(ob => {
      ob.send(JSON.stringify(e), closeOnErrorDefined('observer-send', ob));
    });
  }

}
