import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodeSymbol, decodeCircuit } from "../src/core/engine.js";
import { decodeNetlist } from "../src/formats/index.js";
const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const output = new URL("../assets/data.json", import.meta.url);
const base = path.resolve(process.argv[2] || path.join(projectRoot, "..")),
  data = {
    version: 2,
    symbols: {},
    circuits: {},
    models: {},
    sources: [],
    statistics: {},
  };
if (!fs.existsSync(path.join(base, "MyLogicSV51"))) {
  if (fs.existsSync(output)) {
    console.log(
      "Using bundled original library; external MyLogic source folders are optional.",
    );
    process.exit(0);
  }
  throw Error(
    "MyLogic source folders or bundled assets/data.json are required.",
  );
}
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );
}
function text(file) {
  return new TextDecoder("euc-kr").decode(fs.readFileSync(file));
}
for (const file of walk(path.join(base, "MyLogicSV51", "Library", "MyLogic"))) {
  const key = path
      .relative(
        path.join(base, "MyLogicSV51", "Library", "MyLogic"),
        path.dirname(file),
      )
      .replaceAll("\\", "/")
      .toUpperCase(),
    name = path.basename(file).toLowerCase();
  if (name === "symbol") data.symbols[key] = decodeSymbol(text(file), key);
  if (name === "netlist") data.models[key] = decodeNetlist(text(file), key);
}
for (const file of walk(
  path.join(base, "MyLogicSV51", "Data", "MyLogic", "PRM"),
)) {
  if (path.basename(file).toLowerCase() === "symbol") {
    const key = "PRIMITIVE/" + path.basename(path.dirname(file)).toUpperCase();
    data.symbols[key] = decodeSymbol(text(file), key);
  }
}
for (const file of walk(path.join(base, "MyLogic"))) {
  const n = path.basename(file).toLowerCase();
  if (n === "schematic") {
    const c = decodeCircuit(text(file));
    data.circuits[c.name.toUpperCase()] = c;
    data.sources.push({
      name: c.name,
      library: c.library,
      file: path.relative(base, file).replaceAll("\\", "/"),
    });
  } else if (n === "symbol") {
    const key = "USER/" + path.basename(path.dirname(file)).toUpperCase();
    data.symbols[key] = decodeSymbol(text(file), key);
  }
}
data.statistics = {
  symbols: Object.keys(data.symbols).length,
  circuits: Object.keys(data.circuits).length,
  models: Object.keys(data.models).length,
};
fs.writeFileSync(output, JSON.stringify(data));
console.log(JSON.stringify(data.statistics));
