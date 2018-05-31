type OnClientOfferSignal = (
  offerSignal: string,
  answerCallback: (answerSignal: string) => void
) => void;

type OnHostAnswerSignal = (answerSignal: string) => void;

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
  clientId?: string;
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
      this.clientId = clientId;

      this.onClientOfferSignal!(offerSignal, (answerSignal) => {
        this.sendHostAnswerSignal(answerSignal);
      });
    }
  }

  private handleClose() {
    console.error('Lost connection to lobby server');
  }

  private send(msg: any) {
    this.ws.send(JSON.stringify(msg));
  }

  sendClientOfferSignal(offerSignal: string) {
    this.send({
      type: 'clientSignal',
      data: {
        offerSignal,
      },
    });
  }

  sendHostAnswerSignal(answerSignal: string) {
    this.send({
      type: 'hostSignal',
      data: {
        answerSignal: answerSignal,
        clientId: this.clientId,
      },
    });
  }

  // uploadSnapshot(snapshot: string) {
  // }
}
