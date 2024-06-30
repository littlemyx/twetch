import { EBMLElementDetail } from "ts-ebml";

const serializeTag = (tag: EBMLElementDetail) => JSON.stringify(tag);

const deserializeTag = (tag: string) => {
  let parsed = JSON.parse(tag);

  if (!Array.isArray(parsed)) {
    parsed = [parsed];
  }

  parsed.forEach((element: any) => {
    // because fuck you

    if ("data" in element && element.data && element.data.type === "Buffer") {
      element.data = Buffer.from(element.data.data);
    }
    if (
      "value" in element &&
      element.value &&
      element.value.type === "Buffer"
    ) {
      element.value = Buffer.from(element.value.data);
    }
  });

  return parsed;
};

export { serializeTag, deserializeTag };
