import { Component, GameObject, PearlInstance } from 'pearl';
import NetworkedObject from './NetworkedObject';

export interface SnapshotObject {
  id: string;
  type: string;
  state: any;
}

export interface Snapshot {
  objects: SnapshotObject[];
  clock: number;
}

export interface NetworkedPrefab<Snapshot> {
  type: string;
  tags?: string[];
  zIndex?: number;
  createComponents: (pearl: PearlInstance) => Component<any>[];
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
  localPlayerId?: number;

  create(opts: Opts) {
    this.prefabs = opts.prefabs;
  }

  protected getPrefab(prefabName: string): NetworkedPrefab<any> {
    const prefab = this.prefabs[prefabName];

    if (!prefab) {
      throw new Error(`no registered networked prefab with name ${prefabName}`);
    }

    return prefab;
  }

  protected instantiatePrefab(
    prefab: NetworkedPrefab<any>,
    id?: string
  ): GameObject {
    const components = prefab.createComponents(this.pearl);

    const obj = new GameObject({
      name: prefab.type,
      tags: [prefab.type, ...(prefab.tags || [])],
      zIndex: prefab.zIndex || 0,
      components: [
        ...components,
        new NetworkedObject({
          networking: this,
          type: prefab.type,
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

  protected setIdentity(id: number) {
    this.localPlayerId = id;
  }
}
