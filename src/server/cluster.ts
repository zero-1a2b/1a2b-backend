import * as Koa from 'koa';
import * as route from 'koa-route';
import { RootServer } from './server';
import { random } from 'lodash';
import { RoomEventType } from '../room/logic/room.event';
import KoaWebsocket, * as websockify from 'koa-websocket';
import { Server } from 'http';


export class RootServers {

    private gcTimer: any | null;

    private koa: KoaWebsocket.App | null;

    private server: Server;

    private rooms: Map<string, RootServer>

    private cors = require('@koa/cors');


    constructor() {
        this.gcTimer = null;
        this.rooms = new Map();
    }

    // lifecycles

    start(): void {
        this.setTimer();
        this.startServer();
    }

    stop(): void {
        this.stopTimer();
        this.stopServer();
    }

    // web inbound logic

    private startServer(): void {
        this.koa = websockify(new Koa());
        this.koa.use(this.cors());
        console.log("starting server listening on 8085");
        this.server = this.koa.listen(8085);
        this.registerRoutes(this.koa);
    }

    private stopServer(): void {
        this.server.close();
    }

    private registerRoutes(app: KoaWebsocket.App): void {
        app.use(route.put('/rooms', ctx=> { this.handleNewRoom(ctx); }));
        app.ws.use(route.all('/rooms/:id/master', (ctx, id)=> { this.newMasterConnection(ctx, id); }));
        app.ws.use(route.all('/rooms/:id/player', (ctx, id)=> { this.newPlayerConnection(ctx, id); }));
        app.ws.use(route.all('/rooms/:id/observe', (ctx, id)=> { this.newObserverConnection(ctx, id); }));
    }

    private handleNewRoom(ctx: Koa.Context): void {
        const { id, key } = this.newRoom();
        ctx.status = 200;
        ctx.body = {
            'code': 'success',
            'id': id,
            'key': key
        };
    }

    private newMasterConnection(ctx: Koa.Context, id: string): void {
        console.debug(`conn: ${ctx.websocket.readyState}`);
        if(!this.rooms.has(id)) {
            console.debug(`foo`);
            ctx.websocket.close(4040, "error.room_not_exists");
            console.debug(`tar`);
        } else {
            console.debug(`bar`);
            this.rooms.get(id).onNewMasterConnection(ctx);
        }
        console.debug(`conn: ${ctx.websocket.readyState}`)
    }

    private newPlayerConnection(ctx: Koa.Context, id: string): void {
        console.debug('new player connected');
        if(!this.rooms.has(id)) {
            ctx.websocket.close(4040, "error.room_not_exists")
        } else {
            this.rooms.get(id).onNewPlayerConnection(ctx);
        }
    }

    private newObserverConnection(ctx: Koa.Context, id: string): void {
        console.debug('new observer connected');
        if(!this.rooms.has(id)) {
            ctx.websocket.close(4040, "error.room_not_exists")
        } else {
            this.rooms.get(id).onNewObserverConnection(ctx);
        }
    }

    // logic

    private newRoom(): { id: string, key: string } {
        let id = 1;
        while(this.rooms.has(id.toString())) {
            id = random(0, 10**5, false);
        }

        const key = random(0, 10**5, false);

        const server = new RootServer(
            {
                type: RoomEventType.NEW_ROOM,
                id: id.toString()
            },
            key.toString()
        );
        this.rooms.set(id.toString(), server);

        return {
            id: id.toString(),
            key: key.toString()
        };
    }

    // timed GC logic

    private setTimer(): void {
        this.gcTimer = setTimeout(()=>{
            this.gc();
            this.gcTimer = null;
            this.setTimer();
        }, 30*1000);
    }

    private stopTimer(): void {
        if(this.gcTimer!==null) {
            clearTimeout(this.gcTimer);
            this.gcTimer = null;
        }
    }

    private gc(): void {
        const toGC = [];
        this.rooms.forEach((v,k)=>{
            if(v.isDone()) {
                toGC.push(k);
            }
        })
        toGC.forEach(v=>{this.rooms.get(v).close();this.rooms.delete(v);});
    }

}
