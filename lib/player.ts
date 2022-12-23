type Options = {
  mimeType?: string;
};

export default class Player {
  private _mediasource: MediaSource | null;
  private _mimeType: string;
  private _buffer: SourceBuffer | null;
  private _queue: ArrayBuffer[];
  public isInit: boolean = false;

  constructor(
    { mimeType = "video/webm;codecs=opus,vp8" }: Options = {
      mimeType: "video/webm;codecs=opus,vp8"
    }
  ) {
    this._mediasource = null;
    this._buffer = null;
    this._mimeType = mimeType;
    this._queue = [];
  }

  init(ref: HTMLVideoElement) {
    this.isInit = true;
    this._mediasource = new MediaSource();

    ref.src = URL.createObjectURL(this._mediasource);

    this._mediasource.addEventListener("sourceclose", () => {
      console.log("sourceclose");
    });

    this._mediasource.addEventListener("sourceopen", () => {
      this._buffer = this._mediasource?.addSourceBuffer(
        this._mimeType
      ) as SourceBuffer;

      // this._buffer.addEventListener("update", () => {
      //   // Note: Have tried 'updateend'
      //   if (this._queue.length > 0 && !this._buffer?.updating) {
      //     const chunk = this._queue.shift() as ArrayBuffer;
      //     this._buffer?.appendBuffer(chunk);
      //   }
      // });
      this._buffer.addEventListener("updateend", () => {
        if (this._queue.length > 0) {
          const chunk = this._queue.shift() as ArrayBuffer;
          this._buffer?.appendBuffer(chunk);
        }
      });
    });
  }

  addChunk(chunk: ArrayBuffer) {
    if (this._buffer?.updating || this._queue.length > 0) {
      this._queue.push(chunk);
    } else {
      this._buffer?.appendBuffer(chunk);
    }
  }
}
