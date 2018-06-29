import { GameObject } from 'pearl';
import { NetworkedPrefab } from '../components/networking/Networking';
import Session, { GameState, SessionPlayer } from '../components/Session';
import SessionUI from '../components/SessionUI';
import { ZIndex } from '../types';

interface SessionSnapshot {
  gameState: GameState;
  startTime?: number;
  players: SessionPlayer[];
}

const session: NetworkedPrefab<SessionSnapshot> = {
  type: 'session',

  zIndex: ZIndex.Session,

  createComponents: () => {
    return [new Session(), new SessionUI()];
  },

  serialize(obj) {
    const session = obj.getComponent(Session);
    return {
      gameState: session.gameState,
      startTime: session.startTime,
      players: session.players,
    };
  },

  deserialize(obj, snapshot) {
    const session = obj.getComponent(Session);
    session.gameState = snapshot.gameState;
    session.startTime = snapshot.startTime;
    session.players = snapshot.players;
  },
};

export default session;
