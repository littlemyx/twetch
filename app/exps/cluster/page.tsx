"use client";
import { useEffect, useCallback, useRef, useMemo } from "react";
import { Buffer } from "buffer/";

import blob2buffer from "@/lib/blob2buffer";
import Parser from "@/lib/parser";

const ONE_SECOND = 1000;

interface Props {
  interval?: number;
}

export default function Cluster({ interval = ONE_SECOND / 10 }: Props) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const constraints = useRef({
    // audio: true,
    audio: false,
    video: {
      width: { min: 640, ideal: 640, max: 640 },
      height: { min: 640, ideal: 640, max: 640 }
    }
  });

  const parser = useMemo(() => new Parser(), []);

  const dataAvailableHandler = useCallback(({ data }: BlobEvent) => {
    mediaChunksRef.current.push(data);
  }, []);

  const stopEventHandler = useCallback(() => {
    console.log(mediaChunksRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        stopEventHandler();
      }
    };
  }, [stopEventHandler]);

  const startClickHandler = useCallback(() => {
    mediaChunksRef.current = [];

    navigator.mediaDevices
      .getUserMedia(constraints.current)
      .then(function (stream) {
        const options = {
          // audioBitsPerSecond: 128000,
          // videoBitsPerSecond: 2500000,
          // mimeType: "video/webm;codecs=vp9"
          mimeType: "video/webm;codecs=opus,vp8"
          // mimeType: "video/x-matroska;codecs=avc1,opus"
        };
        mediaRecorderRef.current = new MediaRecorder(stream, options);
        mediaRecorderRef.current.start(interval);

        // const mediaTimerId = setInterval(onPeriodTic, PERIOD);

        mediaRecorderRef.current.onstop = function () {
          stopEventHandler();
        };

        mediaRecorderRef.current.ondataavailable = dataAvailableHandler;
      })
      .catch(function (err) {
        console.log("The following error occured: " + err);
      });
  }, [dataAvailableHandler, interval, stopEventHandler]);

  const stopClickHadler = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current?.stop();
    }

    blob2buffer(
      new Blob(mediaChunksRef.current, {
        type: "video/webm;codecs=opus,vp8"
      }),
      function (error: string | null, result?: Buffer) {
        if (error) {
          throw error;
        }

        if (result) {
          parser.addData(result);
        }
      }
    );
  }, [parser]);

  return (
    <div>
      Cluster
      <br />
      <button onClick={startClickHandler}>START</button>
      <button onClick={stopClickHadler}>STOP</button>
    </div>
  );
}
