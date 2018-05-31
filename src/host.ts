import * as Peer from 'simple-peer';
import axios from 'axios';
import { lobbyServer } from './constants';
import * as uuidv1 from 'uuid/v1';
import HostGame from './HostGame';

const peers = new Set<Peer.Instance>();

let game: HostGame;
export default async function initializeHost() {
  const code = await createRoom();
  console.log('Created room with code', code);
  console.log(`http://localhost:8080/?game=${code}`);
  const socket = createHostSocket(code);

  game = new HostGame(peers);
}

// Host flow

async function createRoom(): Promise<string> {
  const resp = await axios.post(`http://${lobbyServer}/rooms`);
  const code = resp.data.code;
  return code;
}

function createPeer(onSignal: (signalData: any) => void): Peer.Instance {
  const p = new Peer({
    initiator: false,
    trickle: false,
    objectMode: true,
  });

  p.on('error', (err) => {
    console.log('error', err);
  });

  p.on('signal', (signalData) => {
    // signaling data has been created for the host, so it needs to be passed back to the server
    console.log('SIGNAL', JSON.stringify(signalData));
    onSignal(signalData);
  });

  p.on('connect', () => {
    console.log('CONNECT');
    peers.add(p);
    game.onPeerConnected(p);
  });

  p.on('data', (data) => {
    console.log('data:', data);
    // handle incoming data as host
  });

  return p;
}

function createHostSocket(code: string) {
  const ws = new WebSocket(`ws://${lobbyServer}?code=${code}&host=true`);

  ws.onmessage = (evt: MessageEvent) => {
    const message = JSON.parse(evt.data);

    if (message.type === 'clientConnection') {
      // create Peer object
      // send signal to lobby server, which sends to the client waiting to join
      // we also give the peer a UUID that we can use to track it when it comes back
      const clientId = uuidv1();
      console.log('received clientConnection');

      const peer = createPeer((signalData: any) => {
        ws.send(
          JSON.stringify({
            type: 'hostSignal',
            data: {
              answerSignal: signalData,
              clientId,
            },
          })
        );
      });

      peer.signal(message.data.offerSignal);
    }
  };
}
