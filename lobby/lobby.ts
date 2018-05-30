import * as express from 'express';
import * as ws from 'ws';
import * as http from 'http';
import * as cors from 'cors';
import * as url from 'url';

const server = http.createServer();

interface Room {
  hostSocket?: HostWebSocket;
  // TODO: support more than one client socket duh
  clientSocket?: ClientWebSocket;
}

const rooms = new Map<string, Room>();

const app = express();

app.use(express.json());

// TODO: only whitelist app server
app.use(cors());

function generateCode(length: number): string {
  // https://stackoverflow.com/a/19964557
  return (Math.random().toString(36) + '00000000000000000').slice(
    2,
    length + 2
  );
}

app.post('/rooms', (req, res) => {
  // create game code
  // (TODO: check uniqueness lol)
  const code = generateCode(5);
  rooms.set(code, {});
  res.json({ code });
});

/**
 * Websocket server used for hosts to listen for incoming connections
 */

const wss = new ws.Server({ server });

class HostWebSocket {
  _ws: ws;
  _roomCode: string;

  constructor(ws: ws, roomCode: string) {
    this._ws = ws;
    this._roomCode = roomCode;

    rooms.get(roomCode)!.hostSocket = this;

    this._ws.on('message', this._onMessage.bind(this));
  }

  onClientConnected(rtcData: string) {
    console.log('sending client information to host');
    this._ws.send(
      JSON.stringify({
        type: 'clientConnection',
        data: {
          offerSignal: rtcData,
        },
      })
    );
  }

  _onMessage(wsData: string) {
    const msg = JSON.parse(wsData);

    if (msg.type === 'hostSignal') {
      // send to connecting client
      rooms
        .get(this._roomCode)!
        .clientSocket!.onHostSignal(msg.data.answerSignal);
    }
  }

  _onClose() {
    // Destroy room if zero clients
    // otherwise idk?
  }
}

class ClientWebSocket {
  _ws: ws;
  _roomCode: string;

  constructor(ws: ws, roomCode: string) {
    this._ws = ws;
    this._roomCode = roomCode;

    rooms.get(roomCode)!.clientSocket = this;

    this._ws.on('message', this._onMessage.bind(this));
  }

  onHostSignal(answerSignal: string) {
    this._ws.send(
      JSON.stringify({
        type: 'hostSignal',
        data: {
          answerSignal,
        },
      })
    );
  }

  _onMessage(wsData: string) {
    const msg = JSON.parse(wsData);

    console.log('recieved client message');
    console.log(msg);

    if (msg.type === 'clientSignal') {
      console.log('sending client signal to host');
      // send on to host
      rooms
        .get(this._roomCode)!
        .hostSocket!.onClientConnected(msg.data.offerSignal);
    }
  }

  _onClose() {
    // TODO: ????
  }
}

wss.on('connection', (ws, req) => {
  const query = url.parse(req.url!, true).query;

  if (typeof query.code !== 'string') {
    ws.send(
      JSON.stringify({
        error: `Missing room code in query string`,
      })
    );

    return ws.close();
  } else if (!rooms.has(query.code)) {
    ws.send(
      JSON.stringify({
        error: `No room exists with code ${query.code}`,
      })
    );

    return ws.close();
  }

  if (typeof query.host === 'string') {
    const socket = new HostWebSocket(ws, query.code);
  } else {
    const socket = new ClientWebSocket(ws, query.code);
  }
});

/*
 * Run server
 */

const port = process.env.PORT || 3000;

server.on('request', app);

server.listen(port, () => {
  console.log(`Lobby server listening on port ${port}!`);
});
