import * as queryString from 'query-string';

import initializeClient from './client';
import initializeHost from './host';

const query = queryString.parse(location.search);

const roomCode = query.game;

if (roomCode) {
  initializeClient(roomCode);
} else {
  initializeHost();
}
