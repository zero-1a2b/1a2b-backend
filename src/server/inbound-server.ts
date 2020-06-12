import * as Koa from 'koa';
import * as route from 'koa-route';
import KoaWebsocket, * as websockify from 'koa-websocket';
import { Server } from 'http';
import { getLogger } from "log4js";
import { AddressInfo } from 'net';
import { EventEmitter } from '../util/EventEmitter';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cors = require("@koa/cors");
import * as ws from 'ws';
import { RootServer } from './server';
import { RootServers } from './cluster';


const log = getLogger('root-servers');


export interface InboundConfig {

  readonly port: number;

}

export class RootServersInbound {

  static DEFAULT_CONFIG: InboundConfig = {
    port: 8085,
  };


  private config: InboundConfig;

  private koaServer: Server | null;


  constructor(
    private readonly server: RootServers,
    config?: InboundConfig
  ) {
    this.config = config === undefined ? RootServersInbound.DEFAULT_CONFIG : config;
    this.koaServer = null;
  }

  // eventing

  readonly newPlayerConnection = new EventEmitter<{ conn: ws; room: RootServer; }>();

  // lifecycles

  start(): void {
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

  stop(): void {
    this.koaServer.close();
  }


  private registerRoutes(app: KoaWebsocket.App): void {
    //new room
    app.use(route.put('/rooms', ctx => { this.handleNewRoom(ctx); }));
    //room metadata
    app.use(route.get('/rooms/:id/config', (ctx, id) => { this.handleGetRoomConfig(ctx, id); }));
    app.use(route.get('/rooms/:id/player/joinable', (ctx, id) => { this.handleCanConnect(ctx, id); }));
    //room inbound
    app.ws.use(route.all('/rooms/:id/player', (ctx, id) => { this.handleNewPlayerConnection(ctx, id); }));
    app.ws.use(route.all('/rooms/:id/observe', (ctx, id) => { this.newObserverConnection(ctx, id); }));
  }


  private handleGetRoomConfig(ctx: Koa.Context, id: string): void {
    try {
      const room = this.server.getRoom(id);
      if (room === null) {
        ctx.throw(404);
      } else {
        ctx.body = room.room.room.config;
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

      const room = this.server.getRoom(id);
      if (room === null) {
        ctx.throw(404, 'error.room_not_exists');
      } else {
        ctx.response.body = room.canConnect(name);
      }
    } catch (e) {
      ctx.throw(e);
    }
  }

  private handleNewRoom(ctx: Koa.Context): void {
    const { id } = this.server.newRoom();
    log.debug(`new room allocated: ${id}`);
    ctx.status = 200;
    ctx.body = {
      'code': 'success',
      'id': id
    };
  }

  private handleNewPlayerConnection(ctx: Koa.Context, id: string): void {
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
        return;
      }

      const room = this.server.getRoom(id);
      if (room === null) {
        ctx.websocket.close(4040, 'error.room_not_exists');
      } else {
        room.onNewPlayerConnection(ctx.websocket, ctx.query.name);
        this.newPlayerConnection.emit({ conn: ctx.websocket, room: room });
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

      const room = this.server.getRoom(id);
      if (room === null) {
        ctx.websocket.close(4040, 'error.room_not_exists');
      } else {
        room.onNewObserverConnection(ctx.websocket);
      }
    } catch (e) {
      ctx.throw(e);
    }
  }

}
