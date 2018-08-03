import GroovejetClient from './groovejet/GroovejetClient';
import PeerSocket from './PeerSocket';

type PeerID = string;

export interface ConnectionOptions {
  groovejetUrl: string;
  roomCode: string;
}

abstract class GameConnection {
  onGroovejetConnect = () => {};
  onGroovejetDisconnect = () => {};
  onGroovejetError = () => {};
}

/**
 * A host connection multiplexes connections to various peers and can send and
 * receive messages to/from any of them.
 */
export class HostConnection extends GameConnection {
  private _groovejet: GroovejetClient;
  private _peerSockets = new Map<PeerID, PeerSocket>();

  constructor(opts: ConnectionOptions) {
    super();
    this._groovejet = new GroovejetClient({
      isHost: true,
      url: opts.groovejetUrl,
      roomCode: opts.roomCode,

      onOpen: () => {
        this.onGroovejetConnect();
      },

      onClientOfferSignal: (clientId, offer) => {
        this._onClientOffer(clientId, offer);
      },
    });
  }

  async _onClientOffer(peerId: PeerID, offer: RTCSessionDescriptionInit) {
    console.log('* host: creating peer & answer');
    const peer = new PeerSocket(true);
    this._peerSockets.set(peerId, peer);
    const answer = await peer.handleOffer(offer);
    this._groovejet.sendHostAnswerSignal(peerId, answer);
    console.log('* host: sent host answer');

    peer.onOpen = () => {
      this.onPeerConnection(peerId);
    };

    peer.onMessage = (evt) => {
      this.onPeerMessage(peerId, evt.data);
    };

    peer.onDisconnect = () => {
      this.onPeerDisconnect(peerId);
    };

    peer.onClose = () => {
      this.onPeerDisconnect(peerId);
    };
  }

  sendPeer(
    id: PeerID,
    msg: any,
    channelLabel: 'reliable' | 'unreliable' = 'reliable'
  ) {
    const socket = this._peerSockets.get(id);
    if (!socket) {
      throw new Error(`cannot send message to nonexistent peer ${id}`);
    }

    socket.send(channelLabel, msg);
  }

  closePeerConnection(id: PeerID) {
    const socket = this._peerSockets.get(id);
    if (!socket) {
      throw new Error(`cannot close socket for nonexistent peer ${id}`);
    }
    socket.close();
    this._peerSockets.delete(id);
  }

  /**
   * Fires when a peer connects.
   */
  onPeerConnection = (id: PeerID) => {};
  /**
   * Fires when a peer disconnects.
   */
  onPeerDisconnect = (id: PeerID) => {};
  onPeerError = (id: PeerID) => {};
  onPeerMessage = (id: PeerID, msg: any) => {};
}

export class ClientConnection extends GameConnection {
  private _groovejet: GroovejetClient;
  private _hostSocket!: PeerSocket;

  constructor(opts: ConnectionOptions) {
    super();
    this._groovejet = new GroovejetClient({
      isHost: false,
      url: opts.groovejetUrl,
      roomCode: opts.roomCode,

      onOpen: () => {
        this._onGroovejetOpen();
        this.onGroovejetConnect();
      },

      onHostAnswerSignal: (answer) => {
        this._onHostAnswer(answer);
      },
    });
  }

  private async _onGroovejetOpen() {
    console.log('* client: groovejet open');
    this._hostSocket = new PeerSocket(false);
    const offer = await this._hostSocket.createOffer();
    this._groovejet.sendClientOfferSignal(offer);
    console.log('* client: sent client offer signal');

    this._hostSocket.onOpen = () => {
      this.onOpen();
    };

    this._hostSocket.onMessage = (evt) => {
      this.onMessage(evt.data);
    };

    this._hostSocket.onDisconnect = () => {
      this.onDisconnect();
    };

    this._hostSocket.onClose = () => {
      this.onDisconnect();
    };
  }

  private async _onHostAnswer(answer: RTCSessionDescriptionInit) {
    console.log('* client: received answer');
    await this._hostSocket.handleAnswer(answer);
    console.log('* client: handled answer');
  }

  send(msg: any, channelLabel: 'unreliable' | 'reliable' = 'reliable'): void {
    this._hostSocket.send(channelLabel, msg);
  }

  onConnect = () => {};
  onOpen = () => {};
  onDisconnect = () => {};
  onError = () => {};
  onMessage = (msg: any) => {};
}
