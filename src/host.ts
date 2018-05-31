import * as Peer from 'simple-peer';
import { lobbyServer } from './constants';
import HostGame from './HostGame';
import GroovejetClient from './groovejet/GroovejetClient';
import { createRoom } from './groovejet/GroovejetHTTP';

const peers = new Set<Peer.Instance>();

let game: HostGame;
export default async function initializeHost() {
  const code = await createRoom(lobbyServer);
  console.log('Created room with code', code);
  console.log(`${window.location.origin}/?game=${code}`);

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

  game = new HostGame(peers);
}

// Host flow

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
