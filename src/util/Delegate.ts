interface Listener<T> {
  (data: T): void;
}

export default class Delegate<T> {
  private listeners: Set<Listener<T>> = new Set();

  add(fn: Listener<T>) {
    this.listeners.add(fn);
  }

  remove(fn: Listener<T>) {
    this.listeners.delete(fn);
  }

  call(data: T) {
    this.listeners.forEach((fn: Listener<T>) => {
      fn(data);
    });
  }
}
