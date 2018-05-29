import * as Peer from 'simple-peer';
import axios from 'axios';
import { lobbyServer } from './constants';

export default async function initializeClient(roomCode: string) {
  function createPeer() {
    const p = new Peer({
      initiator: true,
      trickle: false,
    });

    p.on('error', (err) => {
      console.log('error', err);
    });

    p.on('signal', (signalData) => {
      console.log('SIGNAL', JSON.stringify(signalData));

      console.log('sending client offer');
      ws.send(
        JSON.stringify({
          type: 'clientSignal',
          data: {
            roomCode,
            offerSignal: signalData,
          },
        })
      );
    });

    p.on('connect', () => {
      console.log('CONNECT');
    });

    p.on('data', (data) => {
      console.log('data:', data);
      // handle incoming data as client
    });

    return p;
  }

  // const answerSignal = await connectToHost(offerSignal, roomCode);

  const ws = new WebSocket(`ws://${lobbyServer}?code=${roomCode}`);

  let p: Peer.Instance;
  ws.onopen = () => {
    p = createPeer();
  };

  ws.onmessage = (evt: MessageEvent) => {
    const message = JSON.parse(evt.data);

    if (message.type === 'hostSignal') {
      const answerSignal = message.data.answerSignal;
      p.signal(answerSignal);
    }
  };
}

/**
 * Get the peer signal of the host for a given room code, to generate this client's peer signal
 */
// async function getRtcConnectCode(code: string): Promise<string> {
//   const resp = await axios.get(`http://${lobbyServer}/rooms/${code}`);
//   return resp.data.rtcData;
// }

// /**
//  * Connect a client to a host by sending the server the client's peer signal
//  */
// async function connectToHost(ownSignalData: any, code: string): Promise<void> {
//   const resp = await axios.post(`http://${lobbyServer}/rooms/${code}`, {
//     rtcData: ownSignalData,
//   });
// }
