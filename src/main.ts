import { RootServers } from './server/cluster';
import { configure } from "log4js";

configure({
  appenders: {
    out: { type: 'console' }
  },
  categories: {
    default: { appenders: [ 'out' ], level: 'debug' }
  }
});

function main(): void {
  const servers = new RootServers();
  servers.start();
}

main();
