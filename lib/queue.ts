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

  public getItemByIndex(index: number): T | null {
    const item = this._storage[index];

    return item === undefined ? null : item;
  }

  public push(item: T): T | null {
    this._storage.push(item);

    let overflow = null;

    if (this._storage.length > this._length) {
      const shifted = this._storage.shift();
      if (shifted !== undefined) {
        overflow = shifted;
      }
      console.log("overfloated! Shifting", shifted);
      console.log("new queue", this._storage);
    }
    return overflow;
  }

  public next() {
    return this._storage.shift();
  }

  public getAll() {
    return this._storage;
  }
}
