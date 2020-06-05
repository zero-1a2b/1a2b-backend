import { RootServers } from "./server/cluster";

function main(): void {
  const servers = new RootServers();
  servers.start();
}

main();
