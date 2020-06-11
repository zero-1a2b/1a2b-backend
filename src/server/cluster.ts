import * as Koa from 'koa';
import * as route from 'koa-route';
import { RootServer } from './server';
import { random } from 'lodash';
import { RoomEventType } from '../room/logic/room.event';
import KoaWebsocket, * as websockify from 'koa-websocket';
import { Server } from 'http';
import { getLogger } from "log4js";
import { AddressInfo } from 'net';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cors = require("@koa/cors");

const log = getLogger('root-servers');

export interface RootServersConfig {

  readonly port: number;

}

export class RootServers {

  static DEFAULT_CONFIG: RootServersConfig = {
    port: 8085,
  };


  private config: RootServersConfig;

  private rooms: Map<string, RootServer>;

  private koaServer: Server | null;

  private gcTimer: any | null;


  constructor(config?: RootServersConfig) {
    this.config = config === undefined ? RootServers.DEFAULT_CONFIG : config;
    this.rooms = new Map();
    this.koaServer = null;
    this.gcTimer = null;
  }

  // lifecycles

  start(): void {
    if (this.gcTimer === null) {
      this.setTimer();
    }
    if (this.koaServer === null) {
      this.startServer();
    }
    log.info(`server started`);
  }

  stop(): void {
    if (this.gcTimer !== null) {
      this.stopTimer();
    }
    if (this.koaServer !== null) {
      this.stopServer();
    }
    this.rooms.forEach((v)=>v.close());
    log.info(`server stopped`);
  }

  // web inbound logic

  private startServer(): void {
    const koa = websockify(new Koa());

    const koaOptions = {
      credentials: true,
    };
    koa.use(cors(koaOptions));

    this.registerRoutes(koa);

    this.koaServer = koa.listen(this.config.port);

    const address: string | AddressInfo = this.koaServer.address();
    const addrString = address instanceof String ? address : `${(address as AddressInfo).address}:${(address as AddressInfo).port}`;
    log.info(`started web endpoint on ${addrString}:`);
  }

  private stopServer(): void {
    this.koaServer.close();
  }

  private registerRoutes(app: KoaWebsocket.App): void {
    app.use(route.put('/rooms', ctx => {
      this.handleNewRoom(ctx);
    }));
    app.use(route.get('/rooms/:id/config', (ctx, id) => {
      this.handleGetRoomConfig(ctx, id);
    }));
    app.use(route.get('/rooms/:id/player/joinable', (ctx, id) => {
      this.handleCanConnect(ctx, id);
    }));
    app.ws.use(route.all('/rooms/:id/player', (ctx, id) => {
      this.newPlayerConnection(ctx, id);
    }));
    app.ws.use(route.all('/rooms/:id/observe', (ctx, id) => {
      this.newObserverConnection(ctx, id);
    }));
  }

  private handleGetRoomConfig(ctx: Koa.Context, id: string): void {
    try {
      if (!this.rooms.has(id)) {
        ctx.throw(404);
      } else {
        ctx.body = this.rooms.get(id).room.room.config;
      }
    } catch (e) {
      ctx.throw(e);
    }
  }

  private handleCanConnect(ctx: Koa.Context, id: string): void {
    try {
      const name = ctx.query.name;
      if(!(typeof name === 'string')) {
        ctx.throw(400, 'error.name_not_provided');
      }
      if (!this.rooms.has(id)) {
        ctx.throw(404, 'error.room_not_exists');
      } else {
        ctx.response.body = this.rooms.get(id).canConnect(name);
      }
    } catch (e) {
      ctx.throw(e);
    }
  }

  private handleNewRoom(ctx: Koa.Context): void {
    const { id } = this.newRoom();
    log.debug(`new room allocated: ${id}`);
    ctx.status = 200;
    ctx.body = {
      'code': 'success',
      'id': id
    };
  }

  private newPlayerConnection(ctx: Koa.Context, id: string): void {
    try {
      const name = ctx.query.name;

      log.debug(`new player connection for room:[${id}] name:[${name}]`);
      ctx.websocket.on('close',(code, reason)=>{
        log.debug(`player connection for room:[${id}] name:[${name}] closed: ${code}:${reason}`)
      });
      ctx.websocket.on('error',(error)=>{
        log.debug(`player connection for room:[${id}] name:[${name}] errored: ${error}`)
      });

      if(!(typeof name === 'string')) {
        ctx.websocket.close(4000, 'error.name_not_provided');
      }
      if (!this.rooms.has(id)) {
        ctx.websocket.close(4040, 'error.room_not_exists');
      } else {
        this.rooms.get(id).onNewPlayerConnection(ctx.websocket, ctx.query.name);
      }
    } catch (e) {
      ctx.throw(e);
    }
  }

  private newObserverConnection(ctx: Koa.Context, id: string): void {
    try {
      log.debug(`new observer connection for room:[${id}]`);
      ctx.websocket.on('close',(code, reason)=>{
        log.debug(`observer connection for room:[${id}] name:[${ctx.query.name}] closed: ${code}:${reason}`)
      });
      ctx.websocket.on('error',(error)=>{
        log.debug(`observer connection for room:[${id}] name:[${ctx.query.name}] errored: ${error}`)
      });
      if (!this.rooms.has(id)) {
        ctx.websocket.close(4040, 'error.room_not_exists');
      } else {
        this.rooms.get(id).onNewObserverConnection(ctx.websocket);
      }
    } catch (e) {
      ctx.throw(e);
    }
  }

  // logic

  private newRoom(): { id: string, key: string } {
    let id = 1;
    while (this.rooms.has(id.toString())) {
      id = random(0, 10 ** 5, false);
    }

    const key = random(0, 10 ** 5, false);

    const server = new RootServer(
      {
        type: RoomEventType.NEW_ROOM,
        id: id.toString(),
      },
    );
    this.rooms.set(id.toString(), server);

    return {
      id: id.toString(),
      key: key.toString(),
    };
  }

  // timed GC logic

  private setTimer(): void {
    this.gcTimer = setTimeout(() => {
      this.gc();
      this.gcTimer = null;
      this.setTimer();
    }, 30 * 1000);
  }

  private stopTimer(): void {
    if (this.gcTimer !== null) {
      clearTimeout(this.gcTimer);
      this.gcTimer = null;
    }
  }

  private gc(): void {
    log.info(`executing room GC`);
    const toGC = [];
    this.rooms.forEach((v, k) => {
      if (v.isClosed()) {
        toGC.push(k);
      }
    });
    toGC.forEach(v => {
      this.rooms.get(v).close();
      this.rooms.delete(v);
    });
    log.info(`GC deleted ${toGC.length} rooms`);
    log.debug(`GC room id:${toGC}`);
  }

}
