import crypto from "crypto";

// JSON.stringify puts keys in whatever order they arrived in, so the same
// request sent twice can produce two different strings. Sorting the keys
// first means an identical request always hashes to the same value.
const canonical = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value === undefined ? null : value);
};

export const fingerprintRequest = (payload) =>
  crypto.createHash("sha256").update(canonical(payload)).digest("hex");
