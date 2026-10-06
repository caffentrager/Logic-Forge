import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build, projectRoot } from "../scripts/build.mjs";
import { data, hash } from "./helpers/fixtures.mjs";

function inventory(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) =>
      e.isDirectory()
        ? inventory(path.join(directory, e.name))
        : [path.join(directory, e.name)],
    );
}
test("A clean checkout builds deterministic output and retains deployed module URLs", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "logic-forge-build-"));
  try {
    fs.cpSync(path.join(projectRoot, "src"), path.join(root, "src"), {
      recursive: true,
    });
    fs.cpSync(path.join(projectRoot, "assets"), path.join(root, "assets"), {
      recursive: true,
    });
    const output = build(root),
      before = inventory(output).map((file) => [
        path.relative(output, file),
        hash(fs.readFileSync(file, "utf8")),
      ]);
    fs.writeFileSync(path.join(output, "stale-output.js"), "must disappear");
    build(root);
    assert.deepEqual(
      inventory(output).map((file) => [
        path.relative(output, file),
        hash(fs.readFileSync(file, "utf8")),
      ]),
      before,
    );
    for (const file of inventory(output).filter((file) =>
      file.endsWith(".js"),
    )) {
      const text = fs.readFileSync(file, "utf8");
      for (const match of text.matchAll(
        /(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g,
      ))
        assert.ok(
          fs.existsSync(path.resolve(path.dirname(file), match[1])),
          "Missing import " + file + " -> " + match[1],
        );
    }
    for (const facade of ["engine.js", "formats.js", "hdl.js", "app.js"])
      assert.ok(fs.existsSync(path.join(output, facade)), facade);
    const engine = await import(pathToFileURL(path.join(output, "engine.js"))),
      formats = await import(pathToFileURL(path.join(output, "formats.js"))),
      hdl = await import(pathToFileURL(path.join(output, "hdl.js")));
    assert.deepEqual(
      engine.simulate(data.circuits.HA, data, { A: 1, B: 1 }).outputs,
      { C: 1, S: 0 },
    );
    assert.equal(typeof formats.parseStimulus, "function");
    assert.equal(typeof hdl.exportVHDL, "function");
    assert.match(
      fs.readFileSync(path.join(output, "index.html"), "utf8"),
      /src="app.js"/,
    );
    assert.equal(
      hash(fs.readFileSync(path.join(output, "data.json"), "utf8")),
      hash(fs.readFileSync(path.join(root, "assets/data.json"), "utf8")),
    );
  } finally {
    // The directory is the unique temporary root created by this test.
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith("logic-forge-build-"));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
