import { NewClientGameEvent, NormalEvent } from './event';
import { Game } from './game';

export class ClientGame extends Game {

  static fromNewGameEvent(event: NewClientGameEvent): ClientGame {
    return new ClientGame(
      Game.fromNewGameEvent(event),
    );
  }


  constructor(
    readonly game: Game,
  ) {
    super(game.players, game.winner, game.guesser, game.config);
  }


  handleEvent(event: NormalEvent): ClientGame {
    return new ClientGame(
      this.game.handleEvent(event),
    );
  }

}
