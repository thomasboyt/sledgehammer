import { GameObject } from 'pearl';

import Networking, { Snapshot, SnapshotObject } from './Networking';
import Delegate from '../../util/Delegate';
import NetworkedObject from './NetworkedObject';
import { HostConnection, ConnectionOptions } from '../GameConnection';

let playerIdCounter = 0;

const MAX_CLIENTS = 4;

interface OnPlayerAddedMsg {
  networkingPlayer: NetworkingPlayer;
}

interface Inputter {
  isKeyDown(keyCode: number): boolean;
  isKeyPressed(keyCode: number): boolean;
}

class NetworkedInputter implements Inputter {
  keysDown = new Set<number>();
  keysPressed = new Set<number>();

  isKeyDown(keyCode: number): boolean {
    return this.keysDown.has(keyCode);
  }

  isKeyPressed(keyCode: number): boolean {
    return this.keysPressed.has(keyCode);
  }
}

export class NetworkingPlayer {
  id: number;
  inputter: Inputter;

  constructor(id: number, inputter: Inputter) {
    this.id = id;
    this.inputter = inputter;
  }
}

interface AddPlayerOpts {
  inputter: Inputter;
  isLocal?: boolean;
}

export interface RpcMessage {
  objectId: string;
  componentName: string;
  methodName: string;
  args: any[];
}

export default class NetworkingHost extends Networking {
  peerIdToPlayerId = new Map<string, number>();
  players = new Map<number, NetworkingPlayer>();

  onPlayerAdded = new Delegate<OnPlayerAddedMsg>();
  onPlayerRemoved = new Delegate<OnPlayerAddedMsg>();

  private connection!: HostConnection;

  connect(connectionOptions: ConnectionOptions) {
    const connection = new HostConnection(connectionOptions);
    this.connection = connection;

    return new Promise((resolve, reject) => {
      connection.onGroovejetConnect = () => {
        // report room created to parent for debug iframe usage
        if (window.parent !== window) {
          window.parent.postMessage(
            {
              type: 'hostCreatedRoom',
              roomCode: connectionOptions.roomCode,
            },
            window.location.origin
          );
        }

        resolve();
      };

      connection.onPeerConnection = this.onPeerConnected.bind(this);
      connection.onPeerMessage = this.onPeerMessage.bind(this);
      connection.onPeerDisconnect = this.onPeerDisconnect.bind(this);
      // TODO: not actually implemented yet
      // connection.onPeerError = this.onPeerDisconnect;
    });
  }

  onPeerConnected(peerId: string) {
    if (this.players.size === MAX_CLIENTS) {
      this.connection.sendPeer(
        peerId,
        JSON.stringify({
          type: 'tooManyPlayers',
        })
      );
      this.connection.closePeerConnection(peerId);
      return;
    }

    const player = this.addPlayer({
      inputter: new NetworkedInputter(),
    });

    this.peerIdToPlayerId.set(peerId, player.id);

    this.connection.sendPeer(
      peerId,
      JSON.stringify({
        type: 'identity',
        data: {
          id: player.id,
        },
      })
    );
  }

  onPeerMessage(peerId: string, data: string) {
    console.log('message');
    const player = this.players.get(this.peerIdToPlayerId.get(peerId)!)!;
    const msg = JSON.parse(data);

    if (msg.type === 'keyDown') {
      this.onClientKeyDown(player, msg.data.keyCode);
    } else if (msg.type === 'keyUp') {
      this.onClientKeyUp(player, msg.data.keyCode);
    } else if (msg.type === 'pong') {
      // const ping = Date.now() - this.lastPingTime; this.pings.set(playerId,
      // ping);
    }
  }

  onPeerDisconnect(peerId: string) {
    const player = this.players.get(this.peerIdToPlayerId.get(peerId)!)!;
    this.peerIdToPlayerId.delete(peerId);
    this.players.delete(player.id);
    this.removePlayer(player);
  }

  addPlayer(opts: AddPlayerOpts): NetworkingPlayer {
    const playerId = playerIdCounter;
    playerIdCounter += 1;

    const player = new NetworkingPlayer(playerId, opts.inputter);
    this.players.set(playerId, player);

    if (opts.isLocal) {
      this.setIdentity(player.id);
    }

    this.onPlayerAdded.call({ networkingPlayer: player });

    return player;
  }

  addLocalPlayer() {
    const player = this.addPlayer({
      inputter: this.pearl.inputter,
      isLocal: true,
    });

    this.setIdentity(player.id);
  }

  removePlayer(player: NetworkingPlayer): void {
    this.onPlayerRemoved.call({ networkingPlayer: player });
  }

  update(dt: number) {
    const snapshot = this.serializeSnapshot();

    this.sendToPeers({
      type: 'snapshot',
      data: snapshot,
    });

    // TODO: This is wrapped in setImmediate() so that keys aren't unset before
    // everything else's update() hook is called This is a decent argument for
    // adding a lateUpdate() hook that happens after update()
    setImmediate(() => {
      for (let player of this.players.values()) {
        if (player.inputter instanceof NetworkedInputter) {
          player.inputter.keysPressed = new Set();
        }
      }
    });
  }

  onClientKeyDown(player: NetworkingPlayer, keyCode: number) {
    if (player.inputter instanceof NetworkedInputter) {
      if (!player.inputter.keysDown.has(keyCode)) {
        player.inputter.keysDown.add(keyCode);
        player.inputter.keysPressed.add(keyCode);
      }
    }
  }

  onClientKeyUp(player: NetworkingPlayer, keyCode: number) {
    if (player.inputter instanceof NetworkedInputter) {
      player.inputter.keysDown.delete(keyCode);
    }
  }

  createNetworkedPrefab(name: string): GameObject {
    const prefab = this.getPrefab(name);
    const obj = this.instantiatePrefab(prefab);
    this.wrapRpcFunctions(obj);
    return obj;
  }

  private sendToPeers(msg: any): void {
    // const serialized = serializeMessage('host', msg);
    const serialized = JSON.stringify(msg);

    for (let peerId of this.peerIdToPlayerId.keys()) {
      this.connection.sendPeer(peerId, serialized);
    }
  }

  private serializeSnapshot(): Snapshot {
    const networkedObjects = [...this.networkedObjects.values()];

    const serializedObjects: SnapshotObject[] = networkedObjects.map(
      (networkedObject) => {
        const { id, type, serialize } = networkedObject.getComponent(
          NetworkedObject
        );

        return {
          id,
          type,
          state: serialize(networkedObject),
        };
      }
    );

    return {
      objects: serializedObjects,
    };
  }

  private wrapRpcFunctions(object: GameObject) {
    const components = object.components;
    const objectId = object.getComponent(NetworkedObject).id;

    for (let component of components) {
      const componentName = component.constructor.name;

      // TODO: It'd be nice to have some extra guarantees here around ensuring
      // function is not a getter or setter, etc
      const rpcMethodNames = getRPCClassMethodNames(component);

      for (let methodName of rpcMethodNames) {
        const originalFn = (component as any)[methodName].bind(component);

        (component as any)[methodName] = (...args: any[]) => {
          originalFn(...args);

          this.dispatchRpc({
            objectId,
            // maybe replace this with a component ID at some point...
            componentName,
            methodName,
            args,
          });
        };
      }
    }
  }

  dispatchRpc(opts: RpcMessage) {
    this.sendToPeers({
      type: 'rpc',
      data: opts,
    });
  }
}

function getRecursiveProps(obj: Object): string[] {
  const prototype = Object.getPrototypeOf(obj);
  const propNames = Object.getOwnPropertyNames(obj);

  if (!prototype) {
    return propNames;
  } else {
    return propNames.concat(getRecursiveProps(prototype));
  }
}

// TODO: Would be nice to have guarantee rpc isn't a getter/setter, etc.
function getRPCClassMethodNames(obj: any): string[] {
  const props = getRecursiveProps(obj);

  return props
    .filter((prop) => prop.startsWith('rpc'))
    .filter((prop) => obj[prop] instanceof Function);
}
