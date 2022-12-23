import React, { forwardRef, useCallback, useEffect, useRef } from "react";

interface Props {
  onPlayClick: (value: boolean) => void;
}

const mime = "video/webm;codecs=opus,vp8";

const Player = forwardRef<HTMLVideoElement, Props>(function Player(
  { onPlayClick }: Props,
  ref
) {
  const playClickHandler = useCallback(() => {
    onPlayClick(true);
  }, [onPlayClick]);

  return (
    <div>
      Player
      <br />
      <video controls ref={ref} />
      <button onClick={playClickHandler}>PLAY</button>
    </div>
  );
});

export default Player;
