import { Reader, Decoder, tools } from "ts-ebml";
import { Buffer } from "buffer/";

export default class Parser {
  private _reader: any;
  private _buffer: Buffer;
  private _decoder: Decoder;
  private _header: ArrayBuffer | null;

  constructor() {
    this._reader = new Reader();
    this._reader.logging = true;
    this._decoder = new Decoder();
    this._buffer = Buffer.alloc(0);
    this._header = null;
  }

  public addData(data: Buffer) {
    this._buffer = Buffer.concat([this._buffer, data]);
    const ebmlElms = this._decoder.decode(data);

    ebmlElms.forEach((elm: any) => {
      this._reader.read(elm);
    });

    this._reader.stop();

    if (this._header === null) {
      this._header = tools.makeMetadataSeekable(
        this._reader.metadatas,
        this._reader.duration,
        this._reader.cues
      );

      // const arrayBuffer = this._buffer.buffer;

      // const bufferWithoutHeader = arrayBuffer.slice(this._reader.metadataSize);

      // this._buffer = Buffer.from(bufferWithoutHeader);
    }
  }
}
