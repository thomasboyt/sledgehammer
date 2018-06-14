import { Component, GameObject, Keys } from 'pearl';
import * as Peer from 'simple-peer';
import Networking, { Snapshot } from './Networking';

// TODO: replace this with something better
import PlayerInputter from '../../src/util/PlayerInputter';

export default class NetworkingClient extends Networking {
  hostPeer!: Peer.Instance;

  registerHostPeer(hostPeer: Peer.Instance) {
    this.hostPeer = hostPeer;

    hostPeer.on('data', (strData: string) => {
      // const msg = deserializeMessage('host', strData);
      const msg = JSON.parse(strData);

      if (msg.type === 'snapshot') {
        this.onSnapshot(msg.data);
      } else if (msg.type === 'identity') {
        // this.playerId = msg.data.id;
      } else if (msg.type === 'ping') {
        // this.sendToHost({
        //   type: 'pong',
        // });
      }
    });

    const inputter = new PlayerInputter({
      onKeyDown: (keyCode) => {
        this.sendToHost({
          type: 'keyDown',
          data: {
            keyCode,
          },
        });
      },
      onKeyUp: (keyCode) => {
        this.sendToHost({
          type: 'keyUp',
          data: {
            keyCode,
          },
        });
      },
    });

    inputter.registerLocalListeners();
  }

  sendToHost(msg: any) {
    // this.hostPeer.send(serializeMessage('client', msg));
    this.hostPeer.send(JSON.stringify(msg));
  }

  private onSnapshot(snapshot: Snapshot) {
    // TODO: destroy objects that are missing in snapshot
    for (let snapshotObject of snapshot.objects) {
      const type = this.types[snapshotObject.type];

      if (!type) {
        throw new Error(
          `unrecognized networked object type ${snapshotObject.type}`
        );
      }

      const networkedObject = this.networkedObjects.get(snapshotObject.id);

      const object = networkedObject
        ? networkedObject.object
        : this.createNetworkedObject(snapshotObject.type, snapshotObject.id);

      type.deserialize(object, snapshotObject.state);
    }
  }
}
