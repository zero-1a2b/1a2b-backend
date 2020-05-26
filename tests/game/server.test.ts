import { GameServer } from "../../src/game/server";


describe('GameServer.newGame works', () => {
  
    it('works', () => {
        GameServer.newGame(
            1,
            ['a','b'],
            60*1000
        )
    });

  });