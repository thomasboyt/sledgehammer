import { GameObject } from 'pearl';
import { NetworkedPrefab } from '../components/networking/Networking';
import Session, { GameState } from '../components/Session';

interface SessionSnapshot {
  gameState: GameState;
}

const session: NetworkedPrefab<SessionSnapshot> = {
  type: 'session',

  createComponents: () => {
    return [new Session()];
  },

  serialize(obj) {
    const session = obj.getComponent(Session);
    return { gameState: session.gameState };
  },

  deserialize(obj, snapshot) {
    const session = obj.getComponent(Session);
    session.gameState = snapshot.gameState;
  },
};

export default session;
