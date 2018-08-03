import { NetworkedPrefab } from '../networking/components/Networking';
import Session, { GameState, SessionPlayer } from '../components/Session';
import SessionUI from '../components/SessionUI';
import { ZIndex } from '../types';
import LevelTransitionManager from '../components/LevelTransitionManager';
import NetworkedObject from '../networking/components/NetworkedObject';

interface SessionSnapshot {
  gameState: GameState;
  startTime?: number;
  players: SessionPlayer[];
  worldId: string;
}

const session: NetworkedPrefab<SessionSnapshot> = {
  type: 'session',

  zIndex: ZIndex.Session,

  createComponents: () => {
    return [new Session(), new SessionUI(), new LevelTransitionManager()];
  },

  serialize(obj) {
    const session = obj.getComponent(Session);
    return {
      gameState: session.gameState,
      startTime: session.startTime,
      players: session.players,
      worldId: session.worldObj.getComponent(NetworkedObject).id,
    };
  },

  deserialize(obj, snapshot, objectsById) {
    const session = obj.getComponent(Session);
    session.gameState = snapshot.gameState;
    session.startTime = snapshot.startTime;
    session.players = snapshot.players;
    session.worldObj = objectsById.get(snapshot.worldId)!;
  },
};

export default session;
