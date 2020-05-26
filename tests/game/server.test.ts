import { GameServer } from "../../src/game/server";


describe('GameServer.newGame works', () => {
  
    it('works', () => {
        GameServer.newGame(
            ['a','b'],
            {
                answerLength: 4,
                playerTimeoutMillis: 1000
            }
        )
        expect(1).toEqual(1);
    });

  });