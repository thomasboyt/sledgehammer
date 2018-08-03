import axios from 'axios';

export async function createRoom(lobbyServer: string): Promise<string> {
  const resp = await axios.post(`http://${lobbyServer}/rooms`);
  const code = resp.data.code;
  return code;
}
