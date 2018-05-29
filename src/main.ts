import * as Peer from 'simple-peer';
import * as queryString from 'query-string';

import initializeClient from './client';
import initializeHost from './host';

const query = queryString.parse(location.search);

const isHost = !!query.host;
const roomCode = query.game;

if (isHost) {
  initializeHost();
} else {
  initializeClient(roomCode);
}
