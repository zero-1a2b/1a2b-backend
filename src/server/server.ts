import { RoomServer} from '../room/server';
import { NewRoomEvent, RoomEvent, RoomEventType } from '../room/logic/room.event';
import * as Koa from 'koa';
import * as ws from 'ws';
import { PlayerConnectRequest, PlayerDisconnectRequest, RoomRequestType } from '../room/server.request';
import { INTERNAL_SENDER, SenderType } from '../util/sender';

function closeOnErrorDefined(action: string, conn: ws): (e?: Error) => void {
    return function(err?: Error): void {
        if(err!==undefined) {
            console.error(`error while performing ${action}`, err);
            conn.close();
        }
    }
}

export class RootServer {


    private room: RoomServer | null;

    private history: RoomEvent[];

    private playerConnections: Set<ws>;

    private observerConnections: Set<ws>;


    constructor(
        event: NewRoomEvent
    ) {
        this.room = new RoomServer(event);
        //connections
        this.playerConnections = new Set();
        this.observerConnections = new Set();
        //events
        this.history = [];
        this.room.events.subscribe(e=>e.type===RoomEventType.ROOM_CLOSED?(this.onClose()):null);
        this.room.clientEvents.subscribe(e=>this.saveAndDeliverPlayerEvent(e));
        //save the initial event
        this.saveAndDeliverPlayerEvent(event);
    }

    isClosed(): boolean {
        return this.room === null;
    }

    close(): void {
        this.room.close();
    }

    private onClose(): void {
      this.room = null;
      this.playerConnections.forEach(v=>v.close(2020, 'status.room_closing'));
      this.observerConnections.forEach(v=>v.close(2020, 'status.room_closing'));
    }


    onNewPlayerConnection(ctx: Koa.Context): void {
        const conn: PlayerConnectRequest = {
            type: RoomRequestType.CONNECT,
            player: ctx.query.name
        };
        try {
            this.room.handleRequest(conn, INTERNAL_SENDER);
            this.acceptPlayerConnection(ctx.websocket, ctx.query.name);
        } catch (e) {
            const err: Error = e;
            ctx.websocket.close(4000, err.message);
        }
    }

    onNewObserverConnection(ctx: Koa.Context): void {
        this.acceptObserverConnection(ctx.websocket);
    }

    private acceptPlayerConnection(conn: ws, name: string): void {
        conn.addEventListener('message', (event)=>{
            try {
                this.room.handleRequest(JSON.parse(event.data), {type: SenderType.PLAYER, player: name});
                conn.send(JSON.stringify({'code':'success'}));
            } catch(e) {
                const err: Error = e;
                console.log('error handling player request', e);
                conn.send(JSON.stringify({'code':'error', 'message': err.message}));
            }
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        conn.addEventListener('close', (_event)=>{
            const left: PlayerDisconnectRequest = {
                type: RoomRequestType.DISCONNECT,
                player: name
            };
            this.playerConnections.delete(conn);
            this.room.handleRequest(left, INTERNAL_SENDER);
        });
        conn.addEventListener('error', (event)=>{
            const left: PlayerDisconnectRequest = {
                type: RoomRequestType.DISCONNECT,
                player: name
            };
            console.error('error in client conn', event);
            this.playerConnections.delete(conn);
            this.room.handleRequest(left, INTERNAL_SENDER);
        });
        this.history.forEach(e=>conn.send(JSON.stringify(e), closeOnErrorDefined('player-replay', conn)));
        this.playerConnections.add(conn);
    }

    private acceptObserverConnection(conn: ws): void {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        conn.addEventListener('close', (_event)=>{
            this.observerConnections.delete(conn);
        });
        conn.addEventListener('error', (event)=>{
            console.error('error in observer conn', event);
            this.observerConnections.delete(conn);
        });
        this.history.forEach(e=>conn.send(JSON.stringify(e), closeOnErrorDefined('observer-replay', conn)));
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
