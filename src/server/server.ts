import { RoomServer } from "../room/server";
import { RoomEvent, NewRoomEvent, RoomEventType } from '../room/logic/room.event';
import * as Koa from "koa";
import * as ws from 'ws';
import { PlayerConnectRequest, RoomRequestType, PlayerDisconnectRequest } from '../room/logic/room.request';
import { RoomState } from '../room/logic/room';

function closeOnErrorDefined(action: string, conn: ws): (e?: Error) => void {
    return function(err?: Error): void {
        if(err!==undefined) {
            console.error(`error while performing ${action}`, err);
            conn.close();
        }
    }
}

export class RootServer {


    private room: RoomServer;

    private masterHistory: RoomEvent[];

    private playerHistory: RoomEvent[];

    public masterKey: string;

    private masterConnection: ws | null;

    private playerConnections: Set<ws>;

    private observerConnections: Set<ws>;


    constructor(
        event: NewRoomEvent,
        masterKey: string
    ) {
        this.room = new RoomServer(event);
        //connections
        this.masterKey = masterKey;
        this.masterConnection = null;
        this.playerConnections = new Set();
        this.observerConnections = new Set();
        //events
        this.masterHistory = [];
        this.playerHistory = [];
        this.room.events.subscribe(e=>e.type===RoomEventType.ROOM_CLOSED?(this.onClose()):null);
        this.room.events.subscribe(e=>this.saveAndDeliverMasterEvent(e));
        this.room.clientEvents.subscribe(e=>this.saveAndDeliverPlayerEvent(e));
        //save the initial event
        this.saveAndDeliverMasterEvent(event);
        this.saveAndDeliverPlayerEvent(event);
    }

    isDone(): boolean {
        return this.room.state === RoomState.FINISHED;
    }

    close(): void {
        this.room.close();
    }

    private onClose(): void {
      if(this.masterConnection !== null) {
        this.masterConnection.close();
      }
      this.playerConnections.forEach(v=>v.close(2000, 'status.room_closing'));
      this.observerConnections.forEach(v=>v.close(2000, 'status.room_closing'));
    }


    onNewMasterConnection(ctx: Koa.Context): void {
        console.debug('internal/new master connected');
        if(this.masterConnection !== null) {
            //if not null, we ping and reject this request
            this.masterConnection.ping('1a2b-master-alive-ping', true, closeOnErrorDefined('master-ping', this.masterConnection));
            ctx.websocket.close(5000, 'error.already_connected');
        } else {
            //validate key correctness
            const key = ctx.query.key;
            if(key !== this.masterKey) {
                ctx.websocket.close(4030, 'error.incorrect_key');
            } else {
                //accept the connection
                this.acceptMasterConnection(ctx.websocket);
            }
        }
    }

    onNewPlayerConnection(ctx: Koa.Context): void {
        const conn: PlayerConnectRequest = {
            type: RoomRequestType.CONNECT,
            player: ctx.query.name
        };
        try {
            this.room.handleRequest(conn);
            this.acceptPlayerConnection(ctx.websocket, ctx.query.name);
        } catch (e) {
            const err: Error = e;
            ctx.websocket.close(4000, err.message);
        }
    }

    onNewObserverConnection(ctx: Koa.Context): void {
        //accept the connection
        this.acceptObserverConnection(ctx.websocket);
    }


    private acceptMasterConnection(conn: ws): void {
        conn.addEventListener('message', (event)=>{
            try {
                this.room.handleRequest(JSON.parse(event.data));
                conn.send(JSON.stringify({'code':'success'}));
            } catch(e) {
                const err: Error = e;
                console.log('error handling master request', e);
                conn.send(JSON.stringify({'code':'error', 'message': err.message}));
            }
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        conn.addEventListener('close', (_event)=>{
            this.masterConnection = null;
        });
        conn.addEventListener('error', (err)=>{
            console.error('error in master conn', err);
            this.masterConnection = null;
        });
        this.masterHistory.forEach(e=>conn.send(JSON.stringify(e), closeOnErrorDefined('master-replay', conn)));
        this.masterConnection = conn;
    }

    private acceptPlayerConnection(conn: ws, name: string): void {
        conn.addEventListener('message', (event)=>{
            try {
                this.room.handleRequest(JSON.parse(event.data));
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
            this.room.handleRequest(left);
        });
        conn.addEventListener('error', (event)=>{
            const left: PlayerDisconnectRequest = {
                type: RoomRequestType.DISCONNECT,
                player: name
            };
            console.error('error in client conn', event);
            this.playerConnections.delete(conn);
            this.room.handleRequest(left);
        });
        this.playerHistory.forEach(e=>conn.send(JSON.stringify(e), closeOnErrorDefined('player-replay', conn)));
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
        this.playerHistory.forEach(e=>conn.send(JSON.stringify(e), closeOnErrorDefined('observer-replay', conn)));
        this.observerConnections.add(conn);
    }


    private saveAndDeliverMasterEvent(e: RoomEvent): void {
        this.masterHistory.push(e);
        if(this.masterConnection !== null) {
            this.masterConnection.send(JSON.stringify(e), closeOnErrorDefined('master-send', this.masterConnection));
        }
    }

    private saveAndDeliverPlayerEvent(e: RoomEvent): void {
        this.playerHistory.push(e);
        this.playerConnections.forEach(ob => {
            ob.send(JSON.stringify(e), closeOnErrorDefined('player-send', ob));
        });
        this.observerConnections.forEach(ob => {
            ob.send(JSON.stringify(e), closeOnErrorDefined('observer-send', ob));
        });
    }

}
