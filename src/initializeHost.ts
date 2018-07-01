import * as Peer from 'simple-peer';
import { lobbyServer } from './constants';
import GroovejetClient from './groovejet/GroovejetClient';
import { createRoom } from './groovejet/GroovejetHTTP';
import showRoomLink from './roomLink';
import createGame from './createGame';
import NetworkingHost from './components/networking/NetworkingHost';

const peers = new Set<Peer.Instance>();

export default async function initializeHost() {
  const game = await createGame({ isHost: true });
  (window as any).game = game;

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
      // signaling data has been created for the host, so it needs to be passed
      // back to the server
      console.log('SIGNAL', JSON.stringify(signalData));
      onSignal(signalData);
    });

    p.on('connect', () => {
      console.log('CONNECT');
      peers.add(p);
      game.obj.getComponent(NetworkingHost).onPeerConnected(p);
    });

    return p;
  }

  const code = await createRoom(lobbyServer);
  console.log('Created room with code', code);
  console.log(`${window.location.origin}/?game=${code}`);

  showRoomLink(code);

  const groovejet = new GroovejetClient({
    url: lobbyServer,
    roomCode: code,
    isHost: true,

    onOpen() {
      // report room created to parent for debug iframe usage
      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: 'hostCreatedRoom',
            roomCode: code,
          },
          window.location.origin
        );
      }
    },

    onClientOfferSignal(offerSignal, answerCallback) {
      const peer = createPeer(answerCallback);
      peer.signal(offerSignal);
    },
  });
}
