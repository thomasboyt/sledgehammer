import * as Peer from 'simple-peer';
import axios from 'axios';
import { lobbyServer } from './constants';
import ClientGame from './ClientGame';
import GroovejetClient from './groovejet/GroovejetClient';

export default async function initializeClient(roomCode: string) {
  function createPeer() {
    const p = new Peer({
      initiator: true,
      trickle: false,
      objectMode: true,
    });

    p.on('error', (err) => {
      console.log('error', err);
    });

    p.on('signal', (signalData) => {
      console.log('SIGNAL', JSON.stringify(signalData));
      console.log('sending client offer');
      groovejet.sendClientOfferSignal(signalData);
    });

    p.on('connect', () => {
      console.log('CONNECT');
      const game = new ClientGame(p);
    });

    return p;
  }

  // we wait to create the peer until after the websocket is established so the peer can
  // immediately send the signal upon generation
  let peer: Peer.Instance;

  const groovejet = new GroovejetClient({
    url: lobbyServer,
    roomCode,
    isHost: false,

    onOpen() {
      peer = createPeer();
    },

    onHostAnswerSignal(answerSignal) {
      peer.signal(answerSignal);
    },
  });
}
