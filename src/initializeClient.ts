import createGame from './createGame';

export default async function initializeClient(roomCode: string) {
  createGame({ isHost: false, roomCode });
}
