import { Component, Coordinates, Physical } from 'pearl';
import { getRandomInt, getVectorComponents, addVector } from '../util/math';
import Game from './Game';

interface Particle {
  center: Coordinates;
  angle: number;
  speed: number;
}

const PARTICLE_SPEED_BASE = 1.35;

export default class BulletExplosion extends Component<null> {
  initialized = false;
  vanishMs = 500;
  timeElapsed = 0;
  particles: Particle[] = [];

  // some day I would like this to be part of init() but init sucks right now because you can't
  // like set properties _then_ init so idk
  start() {
    const numParticles = getRandomInt(10, 16);

    for (let i = 0; i < numParticles; i += 1) {
      this.particles.push({
        center: { x: 0, y: 0 },

        // there are 2 radians in a circle, so 0 to 2 radians gives us a random angle
        angle: Math.random() * 2 * Math.PI,

        speed: PARTICLE_SPEED_BASE + Math.random() * PARTICLE_SPEED_BASE,
      });
    }

    this.initialized = true;
  }

  update(dt: number) {
    for (let particle of this.particles) {
      const vec = getVectorComponents(particle.speed, particle.angle);
      particle.center = addVector(particle.center, vec);
    }

    this.timeElapsed += dt;

    if (this.pearl.obj.getComponent(Game).isHost) {
      if (this.timeElapsed > this.vanishMs) {
        this.pearl.entities.destroy(this.gameObject);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const center = this.getComponent(Physical).center;

    ctx.translate(center.x, center.y);

    for (let particle of this.particles) {
      const alpha = (this.vanishMs - this.timeElapsed) / this.vanishMs;
      ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
      ctx.fillRect(particle.center.x, particle.center.y, 2, 2);
    }
  }
}
