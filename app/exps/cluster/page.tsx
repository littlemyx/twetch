"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { EBMLElementDetail, Encoder, tools } from "ts-ebml";
import _Buffer from "buffer/";

import Recorder from "@/components/Recorder";
import PlayerComponent from "@/components/Player";

import Player from "@/lib/player";
import downloadBlob from "@/lib/downloadBlob";

const ONE_SECOND = 1000;

// @ts-ignore
const Buffer: typeof globalThis.Buffer = _Buffer.Buffer;

const shiftTag = (tag: EBMLElementDetail, shift: number) => ({
  ...tag,
  dataEnd: tag.dataEnd === -1 ? -1 : tag.dataEnd - shift,
  dataStart: tag.dataStart - shift,
  sizeEnd: tag.sizeEnd - shift,
  sizeStart: tag.sizeStart - shift,
  tagEnd: tag.tagEnd - shift,
  tagStart: tag.tagStart - shift
});

const shiftTrack = (
  list: EBMLElementDetail[],
  shift: number,
  positionToStart: number
) =>
  list.map((tag, index) => {
    if (index < positionToStart) {
      return tag;
    } else {
      return shiftTag(tag, shift);
    }
  });

export default function Cluster() {
  const [isPlaying, setIsPlaying] = useState(false);
  const headerRef = useRef<EBMLElementDetail[] | null>(null);
  const clustersRef = useRef<EBMLElementDetail[][]>([]);
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const shiftedDataRef = useRef<EBMLElementDetail[] | null>(null);
  const renderedDataRef = useRef<ArrayBuffer | undefined | null>(null);
  const reducedDataRef = useRef<EBMLElementDetail[] | null>(null);
  const timestampShiftRef = useRef<number | null>(null);
  const shiftRef = useRef<number>(0);

  const encoder = useRef<Encoder | null>(null);
  if (encoder.current === null) {
    encoder.current = new Encoder();
  }

  const player = useRef<Player | null>(null);
  if (player.current === null) {
    player.current = new Player();
  }

  useEffect(() => {
    if (playerRef.current !== null && player.current?.isInit === false) {
      player.current?.init(playerRef.current);
    }
  }, []);

  const clustersUpdateHandler = useCallback(
    (
      newClusters: EBMLElementDetail[][],
      header: EBMLElementDetail[] | null,
      shift: number
    ) => {
      if (isPlaying) {
        const data: EBMLElementDetail[] = [];

        newClusters.forEach(cluster => {
          cluster.forEach(tag => {
            const newTag: EBMLElementDetail = {
              ...tag,
              dataEnd: tag.dataEnd === -1 ? -1 : tag.dataEnd - shiftRef.current,
              dataSize:
                tag.dataSize === -1 ? -1 : tag.dataSize - shiftRef.current,
              dataStart: tag.dataStart - shiftRef.current,
              sizeEnd: tag.sizeEnd - shiftRef.current,
              sizeStart: tag.sizeStart - shiftRef.current,
              tagEnd: tag.tagEnd - shiftRef.current,
              tagStart: tag.tagStart - shiftRef.current
            };

            data.push(newTag);
          });
        });

        // data.push(...newClusters.slice(-1)[0]);

        const encodedData = encoder.current?.encode(data);

        if (encodedData?.byteLength) {
          player.current?.addChunk(encodedData);
        }
      } else {
        if (header !== null) {
          headerRef.current = header;
        }

        shiftRef.current = shift;

        clustersRef.current = newClusters;
      }
    },
    [isPlaying]
  );

  const playerPlayClickHandler = useCallback((value: boolean) => {
    setIsPlaying(value);

    if (value) {
      const data: EBMLElementDetail[] = [];

      if (headerRef.current !== null) {
        data.push(...headerRef.current);
      }
      console.log("clustersRef.current", clustersRef.current);
      if (clustersRef.current.length) {
        clustersRef.current.forEach(cluster => {
          cluster.forEach(tag => {
            // {
            //   ...tag,
            //   dataEnd: tag.dataEnd === -1 ? -1 : tag.dataEnd - shiftRef.current,
            //   dataStart: tag.dataStart - shiftRef.current,
            //   sizeEnd: tag.sizeEnd - shiftRef.current,
            //   sizeStart: tag.sizeStart - shiftRef.current,
            //   tagEnd: tag.tagEnd - shiftRef.current,
            //   tagStart: tag.tagStart - shiftRef.current
            // };

            let timestampShift = 0;

            const newTag: EBMLElementDetail = shiftTag(tag, shiftRef.current);

            if (newTag.name === "Timestamp" && "data" in newTag) {
              let oldData = newTag.data;

              let length = 1 << (8 - oldData.length);
              if (oldData[0] >= length) {
                length = length >> 1;

                // @ts-ignore
                oldData = new Buffer([length]);
                newTag.data.forEach(item => {
                  const newSlice = Buffer.concat([oldData, new Buffer([item])]);
                  // @ts-ignore
                  oldData = newSlice;
                });
              } else {
                oldData[0] = oldData[0] | length;
              }

              const timestamp = tools.readVint(oldData, 0)?.value ?? 0;
              timestampShiftRef.current =
                timestampShiftRef.current === null
                  ? timestamp
                  : timestampShiftRef.current;

              let newData = tools.writeVint(
                timestamp - timestampShiftRef.current
              );

              newData[0] = newData[0] & ((1 << (8 - newData.length)) - 1);

              if (newData[0] === 0 && newData.length > 1) {
                // @ts-ignore
                newData = new _Buffer(
                  Uint8Array.prototype.slice.call(newData, 1)
                );
              }

              timestampShift = oldData.length - newData.length;

              newTag.data = newData;

              newTag.dataEnd = newTag.dataEnd - timestampShift;
              newTag.dataSize = newData.length;
            }

            data.push(newTag);
          });
        });
      }

      shiftedDataRef.current = data;
      console.log("shifted data", data);

      const encodedData = encoder.current?.encode(data);
      renderedDataRef.current = encodedData;

      if (encodedData?.byteLength) {
        player.current?.addChunk(encodedData);
      }

      playerRef.current?.play();
    }

    // const data = [];

    // if (headerRef.current !== null) {
    //   data.push(...headerRef.current);
    //   headerRef.current = null;
    // }

    // if (clustersRef.current?.length > 0) {
    //   clustersRef.current.forEach(cluster => {
    //     data.push(...cluster);
    //   });

    //   clustersRef.current = [];
    // }

    // const encodedData = encoder.current?.encode(data);

    // if (encodedData?.byteLength) {
    //   const blob = new Blob([encodedData], { type: "video/webm" });
    //   downloadBlob(blob, "test.webm", "video/webm");
    // }

    // if (encodedData?.byteLength) {
    //   const onePartLength = 5000;
    //   const length = Math.ceil(encodedData.byteLength / 5000);
    //   for (let i = 0; i < length; i += 1) {
    //     const start = i * onePartLength;
    //     let end = start + onePartLength;

    //     if (end > encodedData.byteLength) {
    //       end = encodedData.byteLength;
    //     }
    //     const part = encodedData.slice(start, end);

    //     player.current?.addChunk(part);
    //   }
    //   playerRef.current?.play();
    // }
  }, []);

  const downloadClickHandler = useCallback(() => {
    if (
      renderedDataRef.current !== null &&
      renderedDataRef.current !== undefined
    ) {
      const blob = new Blob([renderedDataRef.current], { type: "video/webm" });
      downloadBlob(blob, "test.webm", "video/webm");
    }
  }, []);

  return (
    <div>
      <button onClick={downloadClickHandler}>DOWNLOAD</button>
      <br />
      <br />
      Cluster
      <br />
      <Recorder
        interval={ONE_SECOND}
        onClustersUpdate={clustersUpdateHandler}
      />
      <hr />
      <PlayerComponent ref={playerRef} onPlayClick={playerPlayClickHandler} />
    </div>
  );
}
