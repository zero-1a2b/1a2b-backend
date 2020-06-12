import { configure, getLogger } from 'log4js';
import { RootServers } from './server/cluster';
import { RootServersInbound } from './server/inbound-server';

configure({
  appenders: {
    out: { type: 'console' }
  },
  categories: {
    default: { appenders: [ 'out' ], level: 'debug' }
  }
});

const log = getLogger('main');

function main(): void {
  const servers = new RootServers();
  const inbound = new RootServersInbound(servers);
  inbound.newPlayerConnection.subscribe((e)=>servers.onNewPlayerConnection(e.conn, e.room));
  servers.start();
  inbound.start();
  log.info('server started');
}

main();
