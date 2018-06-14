import { Component, GameObject } from 'pearl';

interface NetworkedObjectType<T> {
  create: () => GameObject;
  serialize: (obj: GameObject) => T;
  deserialize: (obj: GameObject, state: T) => void;
}

interface Opts {
  types: { [_: string]: NetworkedObjectType<any> };
}

export interface SnapshotObject {
  id: string;
  type: string;
  state: any;
}

export interface Snapshot {
  objects: SnapshotObject[];
}

interface NetworkedObject {
  type: string;
  object: GameObject;
}

export default abstract class Networking extends Component<Opts> {
  types!: { [_: string]: NetworkedObjectType<any> };

  networkedObjects = new Map<string, NetworkedObject>();

  init(opts: Opts) {
    this.types = opts.types;
  }

  createNetworkedObject(typeName: string, id?: string): GameObject {
    const type = this.types[typeName];

    if (!type) {
      throw new Error(
        `no registered networked object type with name ${typeName}`
      );
    }

    const obj = type.create();

    if (id) {
      obj.id = id;
    }

    this.registerNetworkedObject(typeName, obj);

    this.pearl.entities.add(obj);

    return obj;
  }

  registerNetworkedObject(typeName: string, obj: GameObject) {
    this.networkedObjects.set(obj.id, {
      type: typeName,
      object: obj,
    });
  }
}
