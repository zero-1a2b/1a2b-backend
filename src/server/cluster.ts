import * as ws from 'ws';
import { RootServer } from './server';
import * as moment from 'moment';
import { random } from 'lodash';
import { RoomEventType } from '../room/logic/room.event';
import { getLogger } from 'log4js';
import { RepeatedTimer } from '../util/timer';

const log = getLogger('root-server-cluster');


export interface RootServersGCConfig {
  scanIntervalMillis: number;
  maxEmptyRoomIdleMillis: number;
  maxIdleMillis: number;
}

export interface RootServersConfig {
  gc: RootServersGCConfig
}


export class RootServers {

  public static readonly DEFAULT_CONFIG: RootServersConfig = {
    gc: {
      scanIntervalMillis: 30*1000,
      maxEmptyRoomIdleMillis: 1*60*1000,
      maxIdleMillis: 60*60*1000
    }
  };


  private rooms: Map<string, { room: RootServer, lastActive: moment.Moment }>;

  private gcTimer: RepeatedTimer;


  constructor(
    readonly config: RootServersConfig = RootServers.DEFAULT_CONFIG
  ) {
    this.rooms = new Map<string, {room: RootServer, lastActive: moment.Moment}>();
    this.gcTimer = new RepeatedTimer(
      this.config.gc.scanIntervalMillis,
      true,
      ()=>this.gc()
    );
  }

  // life cycles

  start(): void {
    this.gcTimer.start();
  }

  stop(): void {
    this.gcTimer.stop();

    this.rooms.forEach(v=>v.room.close());
  }

  // eventing

  onNewPlayerConnection(conn: ws, room: RootServer): void {
    conn.on('message', ()=>this.rooms.get(room.room.room.id).lastActive=moment());
  }

  // operations

  newRoom(): { id: string; key: string; } {
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
    this.rooms.set(
      id.toString(),
      {
        room: server,
        lastActive: moment()
      }
    );

    return {
      id: id.toString(),
      key: key.toString(),
    };
  }

  getRoom(id: string): RootServer | null {
    return this.rooms.has(id) ? this.rooms.get(id).room : null;
  }

  closeRoom(id: string): void {
    if(this.rooms.has(id)) {
      const { room } = this.rooms.get(id);
      room.close();
      this.rooms.delete(id);
    }
  }

  // GC Logic

  gc(): void {
    log.info(`executing room GC`);
    const toGC: string[] = [];
    const now = moment();
    this.rooms.forEach((v, k) => {
      log.debug(`room: ${k}: ${now.diff(v.lastActive)}`);
      const haveNobody = v.room.room.room.playerIDs.length === 0;
      const isEmptyInactive = now.diff(v.lastActive)>=this.config.gc.maxEmptyRoomIdleMillis;
      const isMaxInactive = now.diff(v.lastActive)>=this.config.gc.maxIdleMillis;
      if ((haveNobody && isEmptyInactive)||((!haveNobody)&& isMaxInactive)) {
        toGC.push(k);
      }
    });

    toGC.forEach(v => { this.closeRoom(v); });
    log.info(`GC deleted ${toGC.length} rooms`);
    log.debug(`GC room id:${JSON.stringify(toGC)}`);
  }

}
