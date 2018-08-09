import * as queryString from 'query-string';

import createGame from './createGame';

const query = queryString.parse(location.search);

const roomCode = query.game;

if (roomCode) {
  createGame({ isHost: false, roomCode });
} else {
  createGame({ isHost: true });
}
