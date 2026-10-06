import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { projectRoot } from "./build.mjs";

function files(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(directory, entry.name))
        : [path.join(directory, entry.name)],
    );
}
const modules = ["src", "scripts", "tests"]
  .flatMap((dir) => files(path.join(projectRoot, dir)))
  .filter((file) => /\.(mjs|js)$/.test(file));
for (const file of [...modules, path.join(projectRoot, "server.mjs")]) {
  const result = spawnSync(process.execPath, ["--check", file], {
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log("Syntax checked " + (modules.length + 1) + " modules.");
