import { NetworkedPrefab } from 'pearl-networking';
import Session from '../components/Session';
import SessionUI from '../components/SessionUI';
import { ZIndex } from '../types';
import LevelTransitionManager from '../components/LevelTransitionManager';

const session: NetworkedPrefab = {
  type: 'session',

  zIndex: ZIndex.Session,

  createComponents: () => {
    return [new Session(), new SessionUI(), new LevelTransitionManager()];
  },
};

export default session;
