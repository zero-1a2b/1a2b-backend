import { GameEventType, NewServerGameEvent, NormalGameEvent } from './game.event';
import { shuffle, take } from 'lodash';
import { Game, GameConfig } from './game';
import { Player } from './player';
import { ClientGame } from './client-game';


/**
 * creates a new server game event(aka a new game) from game configuration
 * @param players
 * @param config
 * @param extra
 */
export function newServerGameEvent(
  players: Player[],
  config: GameConfig,
  extra: {
    answer?: number[],
    players?: Player[]
  } = {},
): NewServerGameEvent {

  // basic configuration check
  if (!(0 < config.answerLength && config.answerLength < 10)) {
    throw Error(`answer length ${config.answerLength} is not in range [1,9]`);
  }
  if (config.playerTimeoutMillis <= 0) {
    throw Error('player timeout must be greater than zero!');
  }
  if (players.length == 0) {
    throw Error(`players cannot be empty!`);
  }

  let answer: number[];
  if (extra.answer !== undefined) {
    if (extra.answer.length != config.answerLength) {
      throw Error('the length of given answer is not equal to config ');
    }
    answer = extra.answer;
  } else {
    answer = take(shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]), config.answerLength);
  }

  let guessPlayerOrder: string[];
  if (extra.players !== undefined) {
    guessPlayerOrder = extra.players;
  } else {
    guessPlayerOrder = shuffle(players);
  }

  return {
    type: GameEventType.NEW_GAME_SERVER,
    answer: answer,
    players: guessPlayerOrder,
    config: config,
  };
}


export function mapToClient(server: ServerGame): ClientGame {
  return new ClientGame(
    new Game(
      server.players,
      server.winner,
      server.guesser,
      server.config
    )
  );
}


export class ServerGame extends Game {

  static fromNewGameEvent(event: NewServerGameEvent): ServerGame {
    return new ServerGame(
      Game.fromNewGameEvent(event),
      event.answer,
      new Set(event.answer),
    );
  }


  constructor(
    game: Game,
    readonly answer: number[],
    readonly answerDigits: Set<number>,
  ) {
    super(game.players, game.winner, game.guesser, game.config);
  }


  handleEvent(event: NormalGameEvent): ServerGame {
    return new ServerGame(
      super.handleEvent(event),
      this.answer,
      this.answerDigits,
    );
  }

}
