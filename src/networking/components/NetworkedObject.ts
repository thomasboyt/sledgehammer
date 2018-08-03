import { Component, GameObject } from 'pearl';
import Networking from './Networking';
import * as uuidv4 from 'uuid/v4';

interface Opts<T> {
  type: string;
  networking: Networking;
  serialize: (obj: GameObject) => T;
  deserialize: (
    obj: GameObject,
    snapshot: T,
    objectsById: Map<string, GameObject>
  ) => void;
  id?: string;
}

export default class NetworkedObject<T> extends Component<Opts<T>> {
  networking!: Networking;

  id = uuidv4();
  type!: string;
  serialize!: (obj: GameObject) => T;
  deserialize!: (
    obj: GameObject,
    snapshot: T,
    objectsById: Map<string, GameObject>
  ) => void;

  create(opts: Opts<T>) {
    this.networking = opts.networking;
    this.type = opts.type;
    this.serialize = opts.serialize;
    this.deserialize = opts.deserialize;

    if (opts.id !== undefined) {
      this.id = opts.id;
    }
  }

  onDestroy() {
    if (this.networking) {
      this.networking.deregisterNetworkedObject(this.gameObject);
    }
  }
}
