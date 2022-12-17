import { Reader, Decoder, tools } from "ts-ebml";
import { Buffer } from "buffer/";

export default class Parser {
  private _reader: Reader;
  private _buffer: Buffer;
  private _decoder: Decoder;
  private _clusters: ArrayBuffer[];
  private _header: ArrayBuffer | null;

  constructor() {
    this._reader = new Reader();
    this._reader.logging = true;
    this._decoder = new Decoder();
    this._buffer = Buffer.alloc(0);
    this._header = null;
    this._clusters = [];
  }

  public finish(): Buffer | null {
    if (this._header) {
      const header = Buffer.from(this._header);
      const body = this._clusters.map(cluster => Buffer.from(cluster));
      return Buffer.concat([header, ...body]);
    }
    return null;
  }

  public addData(data: Buffer): void {
    let input = data;
    this._decoder = new Decoder();
    this._reader = new Reader();
    this._reader.logging = true;
    const ebmlElms = this._decoder.decode(input);

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
    } else {
      input = input.slice(this._reader.metadataSize);
    }

    this._buffer = Buffer.concat([Buffer.from(this._header), input]);

    // skipping the last item because it can be not complete
    for (let i = 0; i < this._reader.cues.length; i += 1) {
      const start = this._reader.cues[i].CueClusterPosition;
      let end = this._reader.cues[i + 1]?.CueClusterPosition;

      if (end === undefined) {
        end = this._buffer.buffer.byteLength;
      }

      const cluster = this._buffer.buffer.slice(start, end);

      this._clusters.push(cluster);
    }
  }
}
