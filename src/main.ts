import * as queryString from 'query-string';

import initializeClient from './initializeClient';
import initializeHost from './initializeHost';

const query = queryString.parse(location.search);

const roomCode = query.game;

if (roomCode) {
  initializeClient(roomCode);
} else {
  initializeHost();
}
