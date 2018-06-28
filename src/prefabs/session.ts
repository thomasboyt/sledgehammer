import { GameObject } from 'pearl';
import { NetworkedPrefab } from '../components/networking/Networking';
import Session, { GameState } from '../components/Session';
import SessionUI from '../components/SessionUI';
import { ZIndex } from '../types';

interface SessionSnapshot {
  gameState: GameState;
  startTime?: number;
}

const session: NetworkedPrefab<SessionSnapshot> = {
  type: 'session',

  zIndex: ZIndex.Session,

  createComponents: () => {
    return [new Session(), new SessionUI()];
  },

  serialize(obj) {
    const session = obj.getComponent(Session);
    return { gameState: session.gameState, startTime: session.startTime };
  },

  deserialize(obj, snapshot) {
    const session = obj.getComponent(Session);
    session.gameState = snapshot.gameState;
    session.startTime = snapshot.startTime;
  },
};

export default session;
