const ENABLE_LOGGING = true;
const debugLog = (...msgs: any[]) => ENABLE_LOGGING && console.log(...msgs);

/**
 * Represents a single connection, including two data channels, with another
 * user. Sends ice candidates up to the GameConnection so it can send them off
 * to Groovejet.
 */
export default class PeerSocket {
  state: 'connecting' | 'open' | 'closed' = 'connecting';

  private _peer: RTCPeerConnection;

  private _pendingCandidates: RTCIceCandidate[] = [];
  private _candidatesPromise: Promise<RTCIceCandidate[]> = new Promise(
    (resolve, reject) => {
      this._resolveCandidates = resolve;
    }
  );
  private _resolveCandidates!: (value: RTCIceCandidate[]) => void;

  _channels: {
    reliable?: RTCDataChannel;
    unreliable?: RTCDataChannel;
  } = {};

  constructor(isOffering: boolean) {
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
      if (this._peer.iceConnectionState === 'connected') {
        this.onConnect();
      } else if (this._peer.iceConnectionState === 'disconnected') {
        this.onDisconnect();
      } else if (this._peer.iceConnectionState === 'failed') {
        // TODO: maybe handle this differently??
      } else if (this._peer.iceConnectionState === 'closed') {
        this.onClose();
      }
    };
  }

  async getConnectionProtocol() {
    // XXX: RTCStatsReport isn't typed yet
    const stats = (await this._peer.getStats()) as any;

    const connectionPairs = [...stats.values()].filter(
      (entry) => entry.type === 'candidate-pair'
    );
    const successPairs = connectionPairs.filter(
      (entry) => entry.state === 'succeeded'
    );

    if (successPairs.length !== 1) {
      console.log('too many or too few success pairs');
      console.log(connectionPairs);
      console.log([...stats.values()]);
      throw new Error();
    }

    const pair = connectionPairs[0];
    const remote = stats.get(pair.remoteCandidateId);

    return remote.protocol;
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
      const allReady = [
        this._channels.reliable,
        this._channels.unreliable,
      ].every((channel) => {
        return channel !== undefined && channel.readyState === 'open';
      });

      console.log('opened channel', label);

      if (allReady && this.state !== 'open') {
        this.state = 'open';
        this.onOpen();
      }
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

  close() {
    this._peer.close();
  }

  onOpen = () => {};
  onConnect = () => {};
  onMessage = (evt: MessageEvent) => {};
  onDisconnect = () => {};
  onClose = () => {};
}
