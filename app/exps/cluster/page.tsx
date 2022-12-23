"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { EBMLElementDetail, Encoder } from "ts-ebml";

import Recorder from "@/components/Recorder";
import PlayerComponent from "@/components/Player";

import Player from "@/lib/player";
import downloadBlob from "@/lib/downloadBlob";

const ONE_SECOND = 1000;

interface Props {
  interval?: number;
}

export default function Cluster({ interval = ONE_SECOND }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const headerRef = useRef<EBMLElementDetail[] | null>(null);
  const clustersRef = useRef<EBMLElementDetail[][]>([]);
  const playerRef = useRef<HTMLVideoElement | null>(null);

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
      header: EBMLElementDetail[] | null
    ) => {
      if (isPlaying) {
        const data: EBMLElementDetail[] = [];

        data.push(...newClusters.slice(-1)[0]);

        const encodedData = encoder.current?.encode(data);

        if (encodedData?.byteLength) {
          player.current?.addChunk(encodedData);
        }
      } else {
        if (header !== null) {
          headerRef.current = header;
        }

        clustersRef.current = newClusters;
      }
    },
    [isPlaying]
  );

  const playerPlayClickHandler = useCallback(
    (value: boolean) => {
      setIsPlaying(value);

      if (value) {
        const data = [];

        if (headerRef.current !== null) {
          data.push(...headerRef.current);
        }
        if (clustersRef.current.length) {
          clustersRef.current.forEach(cluster => {
            data.push(...cluster);
          });
        }

        const encodedData = encoder.current?.encode(data);

        // if (encodedData?.byteLength) {
        //   const blob = new Blob([encodedData], { type: "video/webm" });
        //   downloadBlob(blob, "test.webm", "video/webm");
        // }

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
    },
    [isPlaying]
  );

  return (
    <div>
      Cluster
      <br />
      <Recorder interval={interval} onClustersUpdate={clustersUpdateHandler} />
      <hr />
      <PlayerComponent ref={playerRef} onPlayClick={playerPlayClickHandler} />
    </div>
  );
}
