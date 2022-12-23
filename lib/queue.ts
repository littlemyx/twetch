export default class Queue<T> {
  private _length: number;
  private _storage: Array<T>;

  constructor(length: number) {
    this._length = length;
    this._storage = new Array<T>(0);
  }

  get length() {
    return this._length;
  }

  set length(value: number) {
    this._length = value;
  }

  get currentNumberOfItems() {
    return this._storage.length;
  }

  public push(item: T) {
    this._storage.push(item);

    if (this._storage.length > this._length) {
      const shifted = this._storage.shift();
      console.log("overfloated! Shifting", shifted);
      console.log("new queue", this._storage);
    }
  }

  public next() {
    return this._storage.shift();
  }

  public getAll() {
    return this._storage;
  }
}
