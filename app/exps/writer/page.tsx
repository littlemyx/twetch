"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import GUN from "gun";

import "gun/lib/radix.js";
import "gun/lib/radisk.js";
import "gun/lib/store.js";
import "gun/lib/rindexed.js";

import {
  ChildElementsValue,
  EBMLElementDetail,
  ElementDetail,
  Encoder,
  NumberElement,
  tools
} from "ts-ebml";
import _Buffer from "buffer/";

import Recorder from "@/components/Recorder";
import PlayerComponent from "@/components/Player";

import Player from "@/lib/player";
import { serializeTag, deserializeTag } from "@/lib/EBML2JSON";
import downloadBlob from "@/lib/downloadBlob";

type TimestampTag = NumberElement & {
  data: Buffer;
} & ElementDetail;

const ONE_SECOND = 1000;

const gun = GUN({
  // peers: ["https://relay.peer.ooo/gun", "https://gun-ams1.cl0vr.co:443/gun"],
  localStorage: false
});

// @ts-ignore
const Buffer: typeof globalThis.Buffer = _Buffer.Buffer;

const getStringSize = (s: string) => new Blob([s]).size;

const sliceArray = (array: any[], chunkSize: number) =>
  [...Array(Math.ceil(array.length / chunkSize))].map(_ =>
    array.splice(0, chunkSize)
  );

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

const createVIntFromUInt = (data: Buffer) => {
  let vInt = new Buffer(data);

  let length = 1 << (8 - vInt.length);
  if (vInt[0] >= length) {
    length = length >> 1;

    let oldData = new Buffer([length]);
    vInt.forEach(item => {
      const newSlice = Buffer.concat([oldData, new Buffer([item])]);
      oldData = newSlice;
    });
    vInt = oldData;
  } else {
    vInt[0] = vInt[0] | length;
  }

  return vInt;
};

const shiftTimestamp = (tag: TimestampTag, initialShift: number) => {
  const copyTag = { ...tag };
  let oldData = copyTag.data;
  let timestampShift = 0;

  const dataWithLength = createVIntFromUInt(oldData);
  // const timestamp = tools.readVint(dataWithLength, 0)?.value ?? 0;
  const timestamp = tag.value;

  let newData = tools.writeVint(timestamp - initialShift);

  newData[0] = newData[0] & ((1 << (8 - newData.length)) - 1);

  if (newData[0] === 0 && newData.length > 1) {
    // @ts-ignore
    newData = new Buffer(Uint8Array.prototype.slice.call(newData, 1));
  }

  // seems like we need to shift other blocks cumulatively as well
  timestampShift = dataWithLength.length - newData.length;

  copyTag.data = newData;

  copyTag.dataEnd = copyTag.dataEnd - timestampShift;
  copyTag.dataSize = newData.length;

  return copyTag;
};

const shiftClusters = (
  clusters: EBMLElementDetail[],
  playbackShift: number,
  initialTimestampShift: number
) => {
  return clusters.map(_tag => {
    // const serialized = serializeTag(_tag);
    // const [tag] = deserializeTag(serialized);

    let newTag: EBMLElementDetail = shiftTag(_tag, playbackShift);

    if (
      newTag.name === "Timestamp" &&
      "data" in newTag &&
      typeof newTag.value === "number" &&
      (newTag.type === "u" || newTag.type === "i" || newTag.type === "f")
    ) {
      newTag = shiftTimestamp(newTag, initialTimestampShift);
    }
    return newTag;
  });
};

export default function Writer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const headerRef = useRef<EBMLElementDetail[] | null>(null);
  const clustersRef = useRef<EBMLElementDetail[][]>([]);
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const shiftedDataRef = useRef<EBMLElementDetail[] | null>(null);
  const renderedDataRef = useRef<ArrayBuffer | undefined | null>(null);

  const reducedDataRef = useRef<EBMLElementDetail[] | null>(null);
  const timestampShiftRef = useRef<number | null>(null);
  const iterationRef = useRef<number>(1);
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
        console.log("newClusters", newClusters);
        const data: EBMLElementDetail[] = [];
        const flatTagsArray = newClusters.flat();

        const shiftedClusters = shiftClusters(
          flatTagsArray,
          shiftRef.current,
          timestampShiftRef.current ?? 0
        );

        const serializedCluster = JSON.stringify(shiftedClusters);

        gun.get("tWEtch_test_2").get("cluster").put(serializedCluster);

        data.push(...shiftedClusters);

        iterationRef.current += 1;

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

        const serializedHeader = JSON.stringify(headerRef.current);

        gun.get("tWEtch_test_2").get("header").put(serializedHeader);
      }

      console.log("clustersRef.current", clustersRef.current);

      if (clustersRef.current.length) {
        const flatTagsArray = clustersRef.current.flat();

        const firstTimestampIndex = flatTagsArray.findIndex(
          tag => tag.name === "Timestamp"
        );

        const firstTimestamp: TimestampTag = flatTagsArray[
          firstTimestampIndex
        ] as TimestampTag;

        timestampShiftRef.current =
          timestampShiftRef.current === null
            ? (firstTimestamp.value as number) ?? null
            : timestampShiftRef.current;

        const shiftedClusters = shiftClusters(
          flatTagsArray,
          shiftRef.current,
          timestampShiftRef.current
        );

        const serializedCluster = JSON.stringify(shiftedClusters);

        gun.get("tWEtch_test_2").get("cluster").put(serializedCluster);

        // shiftedClusters.slice(0, 190).forEach((cluster, index) => {
        //   const serializedCluster = JSON.stringify(cluster);

        //   console.log("size", getStringSize(serializedCluster));

        //   gun
        //     .get("tWEtch_test_2")
        //     // .get("test_id")
        //     // .get("cluster_1")
        //     .get(`tag_${index}`)
        //     .put({ value: serializedCluster });

        //   // sliceArray(serializedCluster.split(""), 10).forEach(
        //   //   (slice, sliceIndex) => {
        //   //     gun
        //   //       .get("tWEtch_test_0")
        //   //       .get(`video_${index}`)
        //   //       .put({ value: serializedCluster });
        //   //   }
        //   // );
        // });

        data.push(...shiftedClusters);
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
