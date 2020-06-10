import { RoomServer } from '../room/server';
import { NewRoomEvent, RoomEvent, RoomEventType } from '../room/logic/room.event';
import * as ws from 'ws';
import { PlayerConnectRequest, PlayerDisconnectRequest, RoomRequestType } from '../room/server.request';
import { INTERNAL_SENDER, SenderType } from '../util/sender';
import { getLogger } from 'log4js';

const log = getLogger('history-root');

function closeOnErrorDefined(action: string, conn: ws): (e?: Error) => void {
  return function(err?: Error): void {
    if (err !== undefined) {
      log.debug(`error while performing ${action}, closing: ${err.name}:${err.message}`);
      conn.close(5000, 'error.unknown');
    }
  };
}

export class RootServer {


  private room: RoomServer | null;

  private history: RoomEvent[];

  private playerConnections: Set<ws>;

  private observerConnections: Set<ws>;


  constructor(
    event: NewRoomEvent,
  ) {
    this.room = new RoomServer(event);
    //connections
    this.playerConnections = new Set();
    this.observerConnections = new Set();
    //events
    this.history = [];
    this.room.events.subscribe(e => e.type === RoomEventType.ROOM_CLOSED ? (this.onClose()) : null);
    this.room.clientEvents.subscribe(e => this.saveAndDeliverPlayerEvent(e));
    //save the initial event
    this.saveAndDeliverPlayerEvent(event);
  }

  isClosed(): boolean {
    return this.room === null;
  }

  close(): void {
    this.room.close();
  }

  /**
   * this function is a hack:
   *  close -> ask RoomServer to close -> close this shell
   */
  private onClose(): void {
    this.room = null;
    this.playerConnections.forEach(v => v.close(2020, 'status.room_closing'));
    this.observerConnections.forEach(v => v.close(2020, 'status.room_closing'));
  }


  onNewPlayerConnection(socket: ws, player: string): void {
    const conn: PlayerConnectRequest = {
      type: RoomRequestType.CONNECT,
      player: player,
    };
    try {
      this.room.handleRequest(conn, INTERNAL_SENDER);
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
        log.debug(`room:[${this.room.room.id}] player:[${name}] processing player request: [${event.data}]`);
        const ret = this.room.handleRequest(JSON.parse(event.data), { type: SenderType.PLAYER, player: name });
        conn.send(JSON.stringify({ 'code': 'success', 'resp': ret }));
      } catch (e) {
        const err: Error = e;
        log.debug(`room:[${this.room.room.id}] player:[${name}] error processing player request: ${err.name}:${err.message}\n${err.stack}`);
        conn.send(JSON.stringify({ 'code': 'error', 'message': err.message }));
      }
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    conn.addEventListener('close', (_event) => {
      this.playerConnections.delete(conn);
      const left: PlayerDisconnectRequest = {
        type: RoomRequestType.DISCONNECT,
        player: name,
      };
      this.room.handleRequest(left, INTERNAL_SENDER);
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    conn.addEventListener('error', (_event) => {
      this.playerConnections.delete(conn);
      const left: PlayerDisconnectRequest = {
        type: RoomRequestType.DISCONNECT,
        player: name,
      };
      this.room.handleRequest(left, INTERNAL_SENDER);
    });
    log.debug(`room:[${this.room.room.id}] replaying ${this.history.length} events to player[${name}]`);
    this.history.forEach(e => conn.send(JSON.stringify(e), closeOnErrorDefined('player-replay', conn)));
    this.playerConnections.add(conn);
  }

  private acceptObserverConnection(conn: ws): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    conn.addEventListener('close', (_event) => {
      this.observerConnections.delete(conn);
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    conn.addEventListener('error', (_event) => {
      this.observerConnections.delete(conn);
    });
    log.debug(`room:[${this.room.room.id}] replaying ${this.history.length} events to observer`);
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
