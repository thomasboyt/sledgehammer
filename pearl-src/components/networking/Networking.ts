import { Component, GameObject } from 'pearl';
import NetworkedObject from './NetworkedObject';

export interface SnapshotObject {
  id: string;
  type: string;
  state: any;
}

export interface Snapshot {
  objects: SnapshotObject[];
}

export interface NetworkedPrefab<Snapshot> {
  type: string;
  createComponents: () => Component<any>[];
  serialize: (obj: GameObject) => Snapshot;
  deserialize: (
    obj: GameObject,
    snapshot: Snapshot,
    objectsById: Map<string, GameObject>
  ) => void;
}

interface Opts {
  prefabs: { [_: string]: NetworkedPrefab<any> };
}

export default abstract class Networking extends Component<Opts> {
  prefabs!: { [_: string]: NetworkedPrefab<any> };

  networkedObjects = new Map<string, GameObject>();

  init(opts: Opts) {
    this.prefabs = opts.prefabs;
  }

  createNetworkedPrefab(prefabName: string, id?: string): GameObject {
    const prefab = this.prefabs[prefabName];

    if (!prefab) {
      throw new Error(`no registered networked prefab with name ${prefabName}`);
    }

    const components = prefab.createComponents();

    const obj = new GameObject({
      name: 'player',
      components: [
        ...components,
        new NetworkedObject({
          networking: this,
          type: prefabName,
          serialize: prefab.serialize,
          deserialize: prefab.deserialize,
          id,
        }),
      ],
    });

    this.pearl.entities.add(obj);

    const networked = obj.getComponent(NetworkedObject);

    this.networkedObjects.set(networked.id, obj);

    return obj;
  }

  deregisterNetworkedObject(obj: GameObject) {
    const networked = obj.getComponent(NetworkedObject);
    this.networkedObjects.delete(networked.id);
  }
}
