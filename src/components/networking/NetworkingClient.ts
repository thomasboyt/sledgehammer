import { Component, GameObject, Keys } from 'pearl';
import * as Peer from 'simple-peer';
import Networking, { Snapshot } from './Networking';

// TODO: replace this with something better?
import PlayerInputter from '../../util/PlayerInputter';
import NetworkedObject from './NetworkedObject';
import { RpcMessage } from './NetworkingHost';

type ConnectionState = 'connecting' | 'connected' | 'error';

export default class NetworkingClient extends Networking {
  hostPeer!: Peer.Instance;

  connectionState: ConnectionState = 'connecting';
  errorReason?: string;

  registerHostPeer(hostPeer: Peer.Instance) {
    this.connectionState = 'connected';

    this.hostPeer = hostPeer;

    hostPeer.on('data', (strData: string) => {
      // const msg = deserializeMessage('host', strData);
      const msg = JSON.parse(strData);

      if (msg.type === 'snapshot') {
        this.onSnapshot(msg.data);
      } else if (msg.type === 'identity') {
        this.setIdentity(msg.data.id);
      } else if (msg.type === 'tooManyPlayers') {
        this.connectionState = 'error';
        this.errorReason = 'Room at max capacity';
      } else if (msg.type === 'rpc') {
        this.handleRpc(msg.data);
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

  private createNetworkedPrefab(name: string, id: string): GameObject {
    const prefab = this.getPrefab(name);
    return this.instantiatePrefab(prefab, id);
  }

  private onSnapshot(snapshot: Snapshot) {
    const unseenIds = new Set(this.networkedObjects.keys());

    for (let snapshotObject of snapshot.objects) {
      const prefab = this.prefabs[snapshotObject.type];

      if (!prefab) {
        throw new Error(
          `unrecognized networked object prefab ${snapshotObject.type}`
        );
      }

      const object =
        this.networkedObjects.get(snapshotObject.id) ||
        this.createNetworkedPrefab(snapshotObject.type, snapshotObject.id);

      object
        .getComponent(NetworkedObject)
        .deserialize(object, snapshotObject.state, this.networkedObjects);

      unseenIds.delete(snapshotObject.id);
    }

    for (let unseenId of unseenIds) {
      this.pearl.entities.destroy(this.networkedObjects.get(unseenId)!);
    }
  }

  private handleRpc(rpc: RpcMessage) {
    const { objectId, componentName, methodName, args } = rpc;
    const obj = this.networkedObjects.get(objectId);

    if (!obj) {
      console.warn(
        `ignoring rpc for nonexistent object -
        ${rpc.componentName}, ${rpc.methodName}`
      );
      return;
    }

    const component = obj.components.find(
      (component) => component.constructor.name === componentName
    );

    if (!component) {
      throw new Error(
        `missing component ${component} for rpc message ${methodName}`
      );
    }

    (component as any)[methodName](...args);
  }
}
