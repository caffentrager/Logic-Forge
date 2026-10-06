import fs from "node:fs";
import { createHash } from "node:crypto";
export const data = JSON.parse(
  fs.readFileSync(new URL("../../assets/data.json", import.meta.url)),
);
export const baseline = JSON.parse(
  fs.readFileSync(
    new URL("../fixtures/release-2.0-baseline.json", import.meta.url),
  ),
);
export const hash = (value) =>
  createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value))
    .digest("hex");
