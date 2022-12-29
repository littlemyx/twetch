import { Reader, Decoder, tools, EBMLElementDetail } from "ts-ebml";
import { Buffer } from "buffer/";

type ResolvedChunk = {
  header: EBMLElementDetail[];
  clusters: EBMLElementDetail[][];
};

export default class Parser {
  private _reader: Reader;
  private _buffer: Buffer;
  private _decoder: Decoder;
  private _clusters: EBMLElementDetail[][];
  private _tail: EBMLElementDetail[];
  private _header: EBMLElementDetail[] | null;

  constructor() {
    this._reader = new Reader();
    this._reader.logging = true;
    this._decoder = new Decoder();
    this._buffer = Buffer.alloc(0);
    this._header = null;
    this._clusters = [];
    this._tail = [];
  }

  public finish(): Buffer | null {
    // if (this._header) {
    //   const header = Buffer.from(this._header);
    //   const body = this._clusters.map(cluster => Buffer.from(cluster));
    //   return Buffer.concat([header, ...body]);
    // }
    return null;
  }

  private findClusters(nodes: EBMLElementDetail[]): number[] {
    const indexes: Array<number> = [];

    nodes.forEach((node, index) => {
      const { name } = node;
      if (name === undefined) {
        throw new Error(
          `Each node must have a field 'name' but the pointed one (${index}) hasn't`
        );
      }
      if (name === "Cluster") {
        indexes.push(index);
      }
    });

    return indexes;
  }

  public resolveChunk(data: Buffer): ResolvedChunk {
    let input = data;
    // this._decoder = new Decoder();

    // const ebmlElms = this._decoder.decode(this._buffer);
    const decodedData = this._decoder.decode(data);
    const ebmlElms = [...this._tail, ...decodedData];

    const clusterIndexes = this.findClusters(ebmlElms);

    let shift = 0; // If we have header in this chunk it will shift our data for its length after cutting

    if (this._header === null) {
      this._reader = new Reader();
      this._reader.logging = true;

      ebmlElms.forEach((elm: any) => {
        this._reader.read(elm);
      });

      this._reader.stop();

      shift = clusterIndexes[0] ?? 0; // the beginning of the first cluster after the header is exactly headers length

      const header = ebmlElms.splice(0, clusterIndexes[0]);
      this._header = header ?? null;

      // const arrayBuffer = this._buffer.buffer;

      // const bufferWithoutHeader = arrayBuffer.slice(this._reader.metadataSize);

      // this._buffer = Buffer.from(bufferWithoutHeader);
    }

    const clusters: EBMLElementDetail[][] = [];

    let tailStart = null;

    for (let i = 0; i < clusterIndexes.length; i += 1) {
      const start = clusterIndexes[i] - shift;
      let end = clusterIndexes[i + 1] - shift;

      if (isNaN(end)) {
        tailStart = start;
      } else {
        const cluster = ebmlElms.slice(start, end);

        clusters.push(cluster);
      }
    }

    if (tailStart === null) {
      // data has no Cluster tags in it
      this._tail = ebmlElms;
    } else {
      // data has some Clusters inside

      const end = ebmlElms.length;

      const tail = ebmlElms.slice(tailStart, end);

      this._tail = tail;
    }

    return {
      header: this._header,
      clusters
    };

    // this._buffer = Buffer.concat([Buffer.from(this._buffer), input]);

    // skipping the last item because it can be not complete
    // for (let i = 0; i < this._reader.cues.length; i += 1) {
    //   const start = this._reader.cues[i].CueClusterPosition;
    //   let end = this._reader.cues[i + 1]?.CueClusterPosition;

    //   if (end === undefined) {
    //     end = this._buffer.buffer.byteLength;
    //   }

    //   const cluster = this._buffer.buffer.slice(start, end);

    //   this._clusters.push(cluster);
    // }
  }
}
