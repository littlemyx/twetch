import { Buffer } from "buffer/";

export default function blob2buffer(
  blob: Blob,
  cb: (error: string | null, result?: Buffer) => void
) {
  if (typeof Blob === "undefined" || !(blob instanceof Blob)) {
    throw new Error("first argument must be a Blob");
  }
  if (typeof cb !== "function") {
    throw new Error("second argument must be a function");
  }

  const reader = new FileReader();

  function onLoadEnd(event: any) {
    reader.removeEventListener("loadend", onLoadEnd, false);
    if (event.error) {
      cb(event.error);
    } else {
      cb(null, Buffer.from(reader.result as ArrayBuffer));
    }
  }

  reader.addEventListener("loadend", onLoadEnd, false);
  reader.readAsArrayBuffer(blob);
}
