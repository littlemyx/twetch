type Dimension = { min: number; ideal: number; max: number };

type VideoConstraints = {
  width: Dimension;
  height: Dimension;
};
type RecordingConstraints = {
  audio: boolean;
  video: VideoConstraints;
};

enum mimeType {
  default = "video/webm;codecs=opus,vp8"
}

type RecordingOptions = {
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
  mimeType: mimeType;
};

interface Options {
  interval?: number;
  constraints?: RecordingConstraints;
}

export default class Recorder {
  private _interval: number;
  private _mediaRecorder: MediaRecorder | null;
  private _stream: MediaStream | null;
  private _constraints: RecordingConstraints;
  private _options: RecordingOptions;

  get isRecording() {
    return this._mediaRecorder?.state === "recording" ?? false;
  }

  constructor({
    interval = 3000,
    constraints = {
      audio: true,
      video: {
        width: { min: 640, ideal: 640, max: 640 },
        height: { min: 640, ideal: 640, max: 640 }
      }
    }
  }: Options) {
    this._interval = interval;
    this._constraints = constraints;
    this._stream = null;
    this._mediaRecorder = null;
    this._options = {
      mimeType: mimeType.default
    };
  }

  init(): Promise<null> {
    return new Promise((resolve, reject) => {
      navigator.mediaDevices
        .getUserMedia(this._constraints)
        .then(stream => {
          this._stream = stream;
          resolve(null);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  setRecordingOptions(newOptions: RecordingOptions) {
    if (this.isRecording) {
      throw new Error("The options can not be changed while already recording");
    }
    this._options = newOptions;
  }

  setInterval(newInterval: number) {
    if (this.isRecording) {
      throw new Error(
        "The interval can not be changed while already recording"
      );
    }
    this._interval = newInterval;
  }

  startRecording(
    onDataAvailable: (event: BlobEvent) => void,
    onStop: () => void
  ) {
    if (this.isRecording === false && this._stream !== null) {
      this._mediaRecorder = new MediaRecorder(this._stream, this._options);

      this._mediaRecorder.start(this._interval);

      this._mediaRecorder.onstop = onStop;

      this._mediaRecorder.ondataavailable = onDataAvailable;
    } else {
      if (this.isRecording) {
        throw new Error("The recording proccess has already been started");
      }
      if (this._stream === null) {
        throw new Error("No valid stream was provided");
      }
    }
  }

  stopRecording() {
    this._mediaRecorder?.stop();
  }
}
