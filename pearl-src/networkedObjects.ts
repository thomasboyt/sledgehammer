import {
  Component,
  GameObject,
  PolygonRenderer,
  PolygonCollider,
  Physical,
} from 'pearl';

import Player, { PlayerSnapshot } from './components/Player';

const networkedPlayer = {
  create: () => {
    return new GameObject({
      name: 'player',
      components: [
        new Player(),
        new Physical({
          center: { x: 120, y: 120 },
        }),
        new PolygonRenderer({ fillStyle: 'cyan' }),
        PolygonCollider.createBox({ width: 16, height: 16 }),
      ],
    });
  },

  serialize: (obj: GameObject): PlayerSnapshot => {
    const phys = obj.getComponent(Physical);
    return { center: phys.center, vel: phys.vel };
  },

  deserialize: (obj: GameObject, snapshot: PlayerSnapshot) => {
    const phys = obj.getComponent(Physical);
    phys.center = snapshot.center;
    phys.vel = snapshot.vel;
  },
};

export default {
  player: networkedPlayer,
};
