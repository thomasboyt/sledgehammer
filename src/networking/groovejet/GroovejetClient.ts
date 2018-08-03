type OnClientOfferSignal = (
  clientId: string,
  offerSignal: RTCSessionDescriptionInit
) => void;

type OnHostAnswerSignal = (answerSignal: RTCSessionDescriptionInit) => void;

interface GroovejetOptions {
  url: string;
  roomCode: string;
  isHost: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onClientOfferSignal?: OnClientOfferSignal;
  onHostAnswerSignal?: OnHostAnswerSignal;
}

export default class GroovejetClient {
  ws: WebSocket;
  onOpen = () => {};
  onClose = () => {};
  onClientOfferSignal?: OnClientOfferSignal;
  onHostAnswerSignal?: OnHostAnswerSignal;

  constructor(opts: GroovejetOptions) {
    // TODO: allow wss://
    let url = `ws://${opts.url}/?code=${opts.roomCode}`;

    if (opts.isHost) {
      url += '&host';
    }

    this.ws = new WebSocket(url);
    this.ws.onopen = this.handleOpen.bind(this);
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onclose = this.handleClose.bind(this);

    if (this.onOpen) {
      this.onOpen = opts.onOpen!;
    }
    if (this.onClose) {
      this.onClose = opts.onClose!;
    }

    this.onClientOfferSignal = opts.onClientOfferSignal;
    this.onHostAnswerSignal = opts.onHostAnswerSignal;
  }

  private handleOpen() {
    console.log('*** Connected to Groovejet server');
    this.onOpen();
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
    console.error('*** Lost connection to lobby server');
    this.onClose();
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
