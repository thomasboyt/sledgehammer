import { Component, Physical, Keys, Coordinates } from 'pearl';
import Game from './Game';
import NetworkingHost from './networking/NetworkingHost';

const MOVE_SPEED = 0.1;

export interface PlayerSnapshot {
  center: Coordinates;
  vel: Coordinates;
}

export interface Options {
  playerId: number;
}

export default class Player extends Component<Options> {
  playerId!: number;

  init(opts: Options) {
    if (opts) {
      this.playerId = opts.playerId;
    }
  }

  update(dt: number) {
    if (!this.pearl.obj.getComponent(Game).isHost) {
      return;
    }

    const players = this.pearl.obj.getComponent(NetworkingHost).players;
    const networkedPlayer = players.get(this.playerId)!;
    const inputter = networkedPlayer.inputter;

    const phys = this.getComponent(Physical);
    phys.vel = { x: 0, y: 0 };

    if (inputter.isKeyDown(Keys.rightArrow)) {
      phys.vel.x = 1 * MOVE_SPEED;
    } else if (inputter.isKeyDown(Keys.leftArrow)) {
      phys.vel.x = -1 * MOVE_SPEED;
    } else if (inputter.isKeyDown(Keys.upArrow)) {
      phys.vel.y = -1 * MOVE_SPEED;
    } else if (inputter.isKeyDown(Keys.downArrow)) {
      phys.vel.y = 1 * MOVE_SPEED;
    }
  }
}
