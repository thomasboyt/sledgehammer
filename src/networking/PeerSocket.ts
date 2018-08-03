import { Socket } from 'dgram';

const ENABLE_LOGGING = true;
const debugLog = (...msgs: any[]) => ENABLE_LOGGING && console.log(...msgs);

interface PeerSocketOptions {
  onOpen: () => void;
  onMessage: (evt: MessageEvent) => void;
  onClose: () => void;
  onError?: (err: SocketError) => void;
}

type ErrorCode = 'iceFailed';

class SocketError extends Error {
  code: ErrorCode;
  constructor(msg: string, code: ErrorCode) {
    super(msg);
    this.code = code;
  }
}

/**
 * Represents a single connection, including two data channels, with another
 * user. Sends ice candidates up to the GameConnection so it can send them off
 * to Groovejet.
 */
export default class PeerSocket {
  state: 'connecting' | 'open' | 'closed' = 'connecting';

  onOpen = () => {};
  onMessage = (evt: MessageEvent) => {};
  onClose = () => {};
  onError = (err: SocketError) => {
    console.error('Unhandled PeerSocket error:');
    throw err;
  };

  private _peer: RTCPeerConnection;

  private _pendingCandidates: RTCIceCandidate[] = [];
  private _candidatesPromise: Promise<RTCIceCandidate[]> = new Promise(
    (resolve, reject) => {
      this._resolveCandidates = resolve;
    }
  );
  private _resolveCandidates!: (value: RTCIceCandidate[]) => void;

  private _channels: {
    reliable?: RTCDataChannel;
    unreliable?: RTCDataChannel;
  } = {};

  constructor(opts: PeerSocketOptions) {
    this._peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: ['stun:stun.l.google.com:19302'],
        },
      ],
    });

    this._peer.onicecandidate = (evt) => {
      if (evt.candidate) {
        debugLog('adding candidate');
        this._pendingCandidates.push(evt.candidate);
      } else {
        debugLog('resolving candidates');
        this._resolveCandidates(this._pendingCandidates);
      }
    };

    this._peer.ondatachannel = (evt) => {
      const channel = evt.channel;
      if (channel.label === 'reliable') {
        this._registerChannel('reliable', channel);
      } else if (channel.label === 'unreliable') {
        this._registerChannel('unreliable', channel);
      } else {
        console.warn(`unrecognized channel label, ignoring: ${channel.label}`);
      }
    };

    this._peer.oniceconnectionstatechange = (evt) => {
      if (this._peer.iceConnectionState === 'failed') {
        debugLog('iceConnectionState = failed');
        this.close(new SocketError('ice connection failed', 'iceFailed'));
      } else if (this._peer.iceConnectionState === 'closed') {
        debugLog('iceConnectionState = closed');
        this.close();
      }
    };

    this.onOpen = opts.onOpen;
    this.onMessage = opts.onMessage;
    this.onClose = opts.onClose;
  }

  /**
   * Create and set an offer, returning the session description to send to the
   * signaling server.
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    debugLog('creating offer channels');
    const reliable = this._peer.createDataChannel('reliable');
    const unreliable = this._peer.createDataChannel('unreliable', {
      ordered: false,
      maxRetransmits: 0,
    });

    this._registerChannel('reliable', reliable);
    this._registerChannel('unreliable', unreliable);

    debugLog('creating offer');
    const offer = await this._peer.createOffer();
    await this._peer.setLocalDescription(offer);

    debugLog('awaiting candidates');
    await this._candidatesPromise;

    debugLog('returning offer');
    // There's some kind of awful issue in type checking this :|
    return this._peer.localDescription! as any;
  }

  _registerChannel(label: 'reliable' | 'unreliable', channel: RTCDataChannel) {
    this._channels[label] = channel;

    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      // XXX: both channels change readyState on the same tick, so this always
      // gets called twice, which is why the allReady + state check is important
      const allReady = [
        this._channels.reliable,
        this._channels.unreliable,
      ].every((channel) => {
        return channel !== undefined && channel.readyState === 'open';
      });

      debugLog('opened channel', label);

      if (allReady && this.state === 'connecting') {
        this.state = 'open';
        this.onOpen();
      }
    };

    channel.onclose = () => {
      // if either channel closes, we kill the connection
      this.close();
    };

    channel.onmessage = (evt) => {
      this.onMessage(evt);
    };
  }

  /**
   * Set the offer and return the answer session description to send back to the
   * signaling server.
   */
  async handleOffer(
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    debugLog('setting remote');
    await this._peer.setRemoteDescription(offer);

    debugLog('creating answer');
    const answer = await this._peer.createAnswer();
    await this._peer.setLocalDescription(answer);

    debugLog('awaiting candidates');
    await this._candidatesPromise;

    debugLog('returning answer');
    // There's some kind of awful issue in type checking this :|
    return this._peer.localDescription! as any;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    debugLog('handling answer');
    await this._peer.setRemoteDescription(answer);
  }

  send(channelLabel: 'unreliable' | 'reliable', msg: any) {
    const channel = this._channels[channelLabel];

    if (!channel) {
      throw new Error(`cannot send message: channels not instantiated yet`);
    }

    channel.send(msg);
  }

  close(err?: SocketError) {
    if (this.state === 'closed') {
      return;
    }

    this.state = 'closed';

    // attempt to close channels (can fail if already closed)
    const channels = [this._channels.reliable, this._channels.unreliable];
    for (let channel of channels) {
      if (!channel) {
        continue;
      }
      try {
        debugLog('closing channel');
        channel.close();
      } catch (err) {
        debugLog('error closing channel', err);
      }
    }

    // attempt to close peer (can fail if already closed)
    try {
      debugLog('closing peer');
      this._peer.close();
    } catch (err) {
      debugLog('error closing peer', err);
    }

    // unset peer listeners
    this._peer.onicecandidate = () => {};
    this._peer.oniceconnectionstatechange = () => {};
    this._peer.ondatachannel = () => {};

    if (err) {
      this.onError(err);
    }

    this.onClose();
  }
}
