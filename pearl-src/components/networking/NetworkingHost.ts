import { Component, GameObject } from 'pearl';

import * as Peer from 'simple-peer';
import Networking, { Snapshot, SnapshotObject } from './Networking';
import Delegate from '../../util/Delegate';
import NetworkedObject from './NetworkedObject';

let playerIdCounter = 0;

interface OnPlayerAddedMsg {
  networkingPlayer: NetworkingPlayer;
}

interface Inputter {
  isKeyDown(keyCode: number): boolean;
}

class NetworkedInputter implements Inputter {
  keysDown = new Set<number>();

  isKeyDown(keyCode: number): boolean {
    return this.keysDown.has(keyCode);
  }
}

class NetworkingPlayer {
  id: number;
  inputter: Inputter;

  constructor(id: number, inputter: Inputter) {
    this.id = id;
    this.inputter = inputter;
  }
}

interface AddPlayerOpts {
  inputter: Inputter;
}

export default class NetworkingHost extends Networking {
  peerToPlayerId = new Map<Peer.Instance, number>();
  players = new Map<number, NetworkingPlayer>();

  onPlayerAdded = new Delegate<OnPlayerAddedMsg>();

  onPeerConnected(peer: Peer.Instance) {
    // const playerId = this.addPlayer({
    //   color: 'cyan',
    // });

    const player = this.addPlayer({ inputter: new NetworkedInputter() });

    this.peerToPlayerId.set(peer, player.id);

    peer.on('data', (data: string) => {
      // const msg = deserializeMessage('client', data);
      const msg = JSON.parse(data);

      if (msg.type === 'keyDown') {
        this.onClientKeyDown(player, msg.data.keyCode);
      } else if (msg.type === 'keyUp') {
        this.onClientKeyUp(player, msg.data.keyCode);
      } else if (msg.type === 'pong') {
        // const ping = Date.now() - this.lastPingTime;
        // this.pings.set(playerId, ping);
      }
    });

    // peer.on('close', () => {
    //   this.peerToPlayerId.delete(peer);
    //   this.removePlayer(playerId);
    // });

    peer.send(
      JSON.stringify({
        type: 'identity',
        data: {
          id: player.id,
        },
      })
    );
  }

  addPlayer(opts: AddPlayerOpts): NetworkingPlayer {
    const playerId = playerIdCounter;
    playerIdCounter += 1;

    const player = new NetworkingPlayer(playerId, opts.inputter);
    this.players.set(playerId, player);
    this.onPlayerAdded.call({ networkingPlayer: player });

    return player;
  }

  addLocalPlayer() {
    this.addPlayer({
      inputter: this.pearl.inputter,
    });
  }

  update(dt: number) {
    const snapshot = this.serializeSnapshot();

    this.sendToPeers({
      type: 'snapshot',
      data: snapshot,
    });
  }

  onClientKeyDown(player: NetworkingPlayer, keyCode: number) {
    if (player.inputter instanceof NetworkedInputter) {
      player.inputter.keysDown.add(keyCode);
    }
  }

  onClientKeyUp(player: NetworkingPlayer, keyCode: number) {
    if (player.inputter instanceof NetworkedInputter) {
      player.inputter.keysDown.delete(keyCode);
    }
  }

  private sendToPeers(msg: any): void {
    // const serialized = serializeMessage('host', msg);
    const serialized = JSON.stringify(msg);

    for (let peer of this.peerToPlayerId.keys()) {
      peer.send(serialized);
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
}
