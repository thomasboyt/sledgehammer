import { lobbyServer } from './constants';
import { createRoom } from './networking/groovejet/GroovejetHTTP';
import showRoomLink from './roomLink';
import createGame from './createGame';

export default async function initializeHost() {
  // TODO: move this into NetworkingHost
  const code = await createRoom(lobbyServer);
  console.log('Created room with code', code);
  console.log(`${window.location.origin}/?game=${code}`);

  showRoomLink(code);

  createGame({ isHost: true, roomCode: code });
}
