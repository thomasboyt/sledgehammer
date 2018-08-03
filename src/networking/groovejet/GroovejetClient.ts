type OnClientOfferSignal = (
  clientId: string,
  offerSignal: RTCSessionDescriptionInit
) => void;

type OnHostAnswerSignal = (answerSignal: RTCSessionDescriptionInit) => void;

interface GroovejetOptions {
  url: string;
  roomCode: string;
  isHost: boolean;
  onOpen?: (this: WebSocket, evt: Event) => void;
  onClientOfferSignal?: OnClientOfferSignal;
  onHostAnswerSignal?: OnHostAnswerSignal;
}

export default class GroovejetClient {
  ws: WebSocket;
  onClientOfferSignal?: OnClientOfferSignal;
  onHostAnswerSignal?: OnHostAnswerSignal;

  constructor(opts: GroovejetOptions) {
    // TODO: allow wss://
    let url = `ws://${opts.url}/?code=${opts.roomCode}`;

    if (opts.isHost) {
      url += '&host';
    }

    this.ws = new WebSocket(url);
    this.ws.onopen = opts.onOpen || null;
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onclose = this.handleClose.bind(this);

    this.onClientOfferSignal = opts.onClientOfferSignal;
    this.onHostAnswerSignal = opts.onHostAnswerSignal;
  }

  private handleMessage(evt: MessageEvent) {
    const msg = JSON.parse(evt.data);

    if (msg.type === 'hostSignal') {
      this.onHostAnswerSignal!(msg.data.answerSignal);
    } else if (msg.type === 'clientConnection') {
      const { clientId, offerSignal } = msg.data;

      this.onClientOfferSignal!(clientId, offerSignal);
    }
  }

  private handleClose() {
    console.error('Lost connection to lobby server');
  }

  private send(msg: any) {
    this.ws.send(JSON.stringify(msg));
  }

  sendClientOfferSignal(offerSignal: RTCSessionDescriptionInit) {
    this.send({
      type: 'clientSignal',
      data: {
        offerSignal,
      },
    });
  }

  sendHostAnswerSignal(
    clientId: string,
    answerSignal: RTCSessionDescriptionInit
  ) {
    this.send({
      type: 'hostSignal',
      data: {
        answerSignal,
        clientId,
      },
    });
  }

  // uploadSnapshot(snapshot: string) {
  // }
}
