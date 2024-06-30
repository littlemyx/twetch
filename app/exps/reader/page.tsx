"use client";

import { useCallback, useEffect, useRef } from "react";

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

import "buffer/";

import { serializeTag, deserializeTag } from "@/lib/EBML2JSON";
import Player from "@/lib/player";

import PlayerComponent from "@/components/Player";

const gun = GUN({
  // peers: ["https://relay.peer.ooo/gun", "https://gun-ams1.cl0vr.co:443/gun"],
  localStorage: false
});

const shiftTag = (tag: EBMLElementDetail, shift: number) => ({
  ...tag,
  dataEnd: tag.dataEnd === -1 ? -1 : tag.dataEnd - shift,
  dataStart: tag.dataStart - shift,
  sizeEnd: tag.sizeEnd - shift,
  sizeStart: tag.sizeStart - shift,
  tagEnd: tag.tagEnd - shift,
  tagStart: tag.tagStart - shift
});

export default function Reader() {
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const dataRef = useRef<EBMLElementDetail[]>([]);

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

  const gunUpdateHandler = useCallback((nextIteration: number) => {
    gun
      .get("tWEtch_test_2")
      .get("cluster")
      .once((serializedCluster: string) => {
        if (serializedCluster !== undefined) {
          const cluster = deserializeTag(serializedCluster);

          const encodedData = encoder.current?.encode(cluster);

          if (encodedData?.byteLength) {
            player.current?.addChunk(encodedData);
          }

          gunUpdateHandler(nextIteration + 1);
        } else {
          gunUpdateHandler(nextIteration);
        }
      });
  }, []);

  const playerPlayClickHandler = useCallback(() => {
    gun
      .get("tWEtch_test_2")
      .get("header")
      .once((serializedHeader: string) => {
        const header = deserializeTag(serializedHeader);

        dataRef.current.push(...header);

        gun
          .get("tWEtch_test_2")
          .get("cluster")
          .on((serializedCluster: string) => {
            const cluster = deserializeTag(serializedCluster);

            dataRef.current.push(...cluster);

            const encodedData = encoder.current?.encode(dataRef.current);

            dataRef.current = [];

            if (encodedData?.byteLength) {
              player.current?.addChunk(encodedData);
            }
          });
      });

    playerRef.current?.play();
  }, []);

  return (
    <div>
      <h1>Reader</h1>
      <PlayerComponent ref={playerRef} onPlayClick={playerPlayClickHandler} />
    </div>
  );
}
