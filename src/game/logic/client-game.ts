import { NewClientGameEvent, NormalGameEvent } from './game.event';
import { Game } from './game';


/**
 * the client version of game, acts as a follower in state sync.
 */
export class ClientGame extends Game {

  static fromNewGameEvent(event: NewClientGameEvent): ClientGame {
    return new ClientGame(
      Game.fromNewGameEvent(event),
    );
  }


  constructor(
    game: Game,
  ) {
    super(game.players, game.guesser, game.winner, game.config);
  }


  handleEvent(event: NormalGameEvent): ClientGame {
    return new ClientGame(
      super.handleEvent(event)
    );
  }

}
