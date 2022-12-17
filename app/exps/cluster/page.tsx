"use client";
import { useEffect, useCallback, useRef, useMemo, useState } from "react";
import { Buffer } from "buffer/";

import blob2buffer from "@/lib/blob2buffer";
import Parser from "@/lib/parser";
import downloadBlob from "@/lib/downloadBlob";
import Recorder from "@/lib/recorder";

const ONE_SECOND = 1000;

interface Props {
  interval?: number;
}

export default function Cluster({ interval = ONE_SECOND / 10 }: Props) {
  const [time, setTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mediaChunksRef = useRef<Blob[]>([]);

  const parser = useMemo(() => new Parser(), []);
  const recorder = useRef<Recorder | null>(null);
  if (recorder.current === null) {
    recorder.current = new Recorder({ interval });
  }

  const downloadClickHandler = useCallback(() => {
    const result = parser.finish();
    if (result !== null) {
      /////////////
      // const newParser = new Parser();
      // newParser.addData(result);
      /////////////

      const blob = new Blob([result.buffer], { type: "video/webm" });
      downloadBlob(blob, "test.webm", "video/webm");
    }
  }, [parser]);

  const dataAvailableHandler = useCallback(({ data }: BlobEvent) => {
    mediaChunksRef.current.push(data);
  }, []);

  const stopEventHandler = useCallback(() => {
    console.log(mediaChunksRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (recorder.current?.isRecording) {
        stopEventHandler();
      }
    };
  }, [stopEventHandler]);

  const startClickHandler = useCallback(async () => {
    mediaChunksRef.current = [];

    await recorder.current?.init();

    recorder.current?.startRecording(dataAvailableHandler, stopEventHandler);

    timerRef.current = setInterval(() => {
      setTime(time => time + 1);
    }, 1000);
  }, [dataAvailableHandler, stopEventHandler]);

  const stopClickHadler = useCallback(() => {
    if (recorder.current?.isRecording) {
      recorder.current?.stopRecording();
    }

    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      setTime(0);
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
      <button onClick={downloadClickHandler}>DOWNLOAD</button>
      <br />
      <br />
      <br />
      <div style={{ fontSize: "48px" }}>Time passed: {time}s</div>
    </div>
  );
}
