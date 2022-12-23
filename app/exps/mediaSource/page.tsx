"use client";
import { useCallback, useRef } from "react";

export default function MediaSourceComponent() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const playClickHandler = useCallback(async () => {
    // Create a MediaSource instance and connect it to video element
    const mediaSource = new MediaSource();
    // This creates a URL that points to the media buffer,
    // and assigns it to the video element src
    if (videoRef.current) {
      videoRef.current.src = URL.createObjectURL(mediaSource);
    }

    // Video that will be fetched and appended
    const remoteVidUrl = `/test3.webm`;

    // Fetch remote URL, getting contents as binary blob
    const vidBlob = await (await fetch(remoteVidUrl)).blob();
    // We need array buffers to work with media source
    const vidBuff = await vidBlob.arrayBuffer();

    /**
     * Before we can actually add the video, we need to:
     *  - Create a SourceBuffer, attached to the MediaSource object
     *  - Wait for the SourceBuffer to "open"
     */
    /** @type {SourceBuffer} */
    const sourceBuffer = await new Promise<SourceBuffer>((resolve, reject) => {
      const getSourceBuffer = () => {
        try {
          const sourceBuffer = mediaSource.addSourceBuffer(
            "video/webm;codecs=opus,vp8"
          );
          resolve(sourceBuffer);
        } catch (e) {
          reject(e);
        }
      };
      if (mediaSource.readyState === "open") {
        getSourceBuffer();
      } else {
        mediaSource.addEventListener("sourceopen", getSourceBuffer);
      }
    });

    mediaSource.addEventListener("sourceclose", () => {
      console.log("sourceclose");
    });
    mediaSource.addEventListener("sourceended", () => {
      console.log("sourceended");
    });

    // Now that we have an "open" source buffer, we can append to it
    sourceBuffer.appendBuffer(vidBuff);
    // Listen for when append has been accepted and
    // You could alternative use `.addEventListener` here instead
    sourceBuffer.addEventListener("update", () => {
      console.log("onupdate");
    });
    sourceBuffer.onupdateend = () => {
      // Nothing else to load
      mediaSource.endOfStream();
      // Start playback!
      // Note: this will fail if video is not muted, due to rules about
      // autoplay and non-muted videos
      if (videoRef.current) {
        videoRef.current.play();
      }
    };

    // Debug Info
    console.log({
      sourceBuffer,
      mediaSource,
      videoElement: videoRef.current
    });
  }, []);

  return (
    <div>
      <h1>MediaSource</h1>
      <br />
      <video controls ref={videoRef}></video>
      <br />
      <button onClick={playClickHandler}>PLAY</button>
    </div>
  );
}
