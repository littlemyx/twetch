"use client";
import { useEffect, useCallback, useRef, useMemo, useState } from "react";
import { Buffer } from "buffer/";
import { EBMLElementDetail, Encoder } from "ts-ebml";

import blob2buffer from "@/lib/blob2buffer";
import Parser from "@/lib/parser";
import downloadBlob from "@/lib/downloadBlob";
import Recorder from "@/lib/recorder";
import Queue from "@/lib/queue";

const ONE_SECOND = 1000;

interface Props {
  interval?: number;
}

export default function Cluster({ interval = ONE_SECOND }: Props) {
  const [time, setTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const headerRef = useRef<EBMLElementDetail[] | null>(null);

  const mediaChunksRef = useRef<Blob[]>([]);

  const parser = useMemo(() => new Parser(), []);

  const recorder = useRef<Recorder | null>(null);
  if (recorder.current === null) {
    recorder.current = new Recorder({ interval });
  }

  const queue = useRef<Queue<EBMLElementDetail[]> | null>(null);
  if (queue.current === null) {
    queue.current = new Queue(21);
  }

  const downloadClickHandler = useCallback(() => {
    // const result = parser.finish();
    const encoder = new Encoder();

    let clip: EBMLElementDetail[] | null = null;

    if (headerRef.current !== null && queue.current?.getAll()) {
      clip = [...headerRef.current];
      queue.current?.getAll().forEach((cluster, index) => {
        clip?.push(...cluster);
      });
    }

    let encodedClip: ArrayBuffer | null = null;
    if (clip !== null) {
      encodedClip = encoder.encode(clip);
    }

    if (encodedClip !== null) {
      const blob = new Blob([encodedClip], { type: "video/webm" });
      downloadBlob(blob, "test.webm", "video/webm");
    }
  }, []);

  const dataAvailableHandler = useCallback(
    async ({ data }: BlobEvent) => {
      const result = await new Promise<Buffer>((resolve, reject) => {
        blob2buffer(
          new Blob([data], {
            type: "video/webm;codecs=opus,vp8"
          }),
          function (error: string | null, result?: Buffer) {
            if (error) {
              reject(error);
            }

            if (result) {
              resolve(result);
            }
          }
        );
      });

      const { header, clusters } = parser.resolveChunk(result);

      if (headerRef.current === null) {
        headerRef.current = header;
      }
      clusters.forEach(cluster => {
        queue.current?.push(cluster);
      });

      console.log(`outer header:  ${headerRef.current}`);
      console.log(queue.current?.getAll());
    },
    [parser]
  );

  const stopEventHandler = useCallback(() => {}, []);

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
  }, []);

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
