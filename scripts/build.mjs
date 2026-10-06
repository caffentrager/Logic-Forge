import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = path.resolve(
  fileURLToPath(new URL("..", import.meta.url)),
);

export function build(root = projectRoot) {
  const source = path.join(root, "src"),
    output = path.resolve(root, "dist");
  // Only remove this project's generated output, never source or arbitrary paths.
  if (
    path.dirname(output) !== path.resolve(root) ||
    path.basename(output) !== "dist"
  )
    throw Error("Invalid build output directory");
  for (const required of [
    "src/ui/index.html",
    "src/ui/style.css",
    "assets/data.json",
  ]) {
    if (!fs.existsSync(path.join(root, required)))
      throw Error("Missing build input: " + required);
  }
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  function copyModules(directory) {
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        copyModules(file);
        continue;
      }
      if (!entry.name.endsWith(".js")) continue;
      const relative = path.relative(source, file),
        target = relative.startsWith("compat" + path.sep)
          ? path.join(output, entry.name)
          : path.join(output, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(file, target);
    }
  }
  copyModules(source);
  for (const [from, to] of [
    ["src/ui/index.html", "index.html"],
    ["src/ui/style.css", "style.css"],
    ["assets/data.json", "data.json"],
  ])
    fs.copyFileSync(path.join(root, from), path.join(output, to));
  return output;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log("Built " + build());
