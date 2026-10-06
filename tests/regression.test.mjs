import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { data, baseline, hash } from "./helpers/fixtures.mjs";
import { truthTable } from "../src/core/engine.js";
import { encodeMFFT } from "../src/formats/native.js";
import { exportVerilog, exportVHDL, exportEDIF } from "../src/export/index.js";
import { symbolGraphics } from "../src/ui/render/symbols.js";
import { renderComponent } from "../src/ui/render/components.js";
import { renderFigure } from "../src/ui/render/figures.js";
import { menus } from "../src/ui/menus.js";

test("Bundled data retains the exact release 2.0 content", () => {
  assert.equal(
    hash(
      fs.readFileSync(new URL("../assets/data.json", import.meta.url), "utf8"),
    ),
    baseline.dataHash,
  );
  assert.deepEqual(data.statistics, baseline.statistics);
});
for (const [name, expected] of Object.entries(baseline.truthTables)) {
  test("Release truth table: " + name, () =>
    assert.deepEqual(truthTable(data.circuits[name], data), expected),
  );
  test("Release file exports: " + name, () => {
    const exporters = {
      schematic: encodeMFFT,
      verilog: exportVerilog,
      vhdl: exportVHDL,
      edif: exportEDIF,
    };
    for (const [format, expected] of Object.entries(baseline.exports[name])) {
      if (expected.error)
        assert.throws(() => exporters[format](data.circuits[name], data), {
          message: expected.error,
        });
      else
        assert.equal(
          hash(exporters[format](data.circuits[name], data)),
          expected.sha256,
          name + " " + format,
        );
    }
  });
}
test("All 600 original SVG symbols retain their release output", () => {
  for (const [key, expected] of Object.entries(baseline.symbols))
    assert.equal(hash(symbolGraphics(data.symbols[key])), expected, key);
});
test("Selected, rotated and mirrored components and figures retain their markup", () => {
  const context = {
    data,
    inputs: { A: 1 },
    result: { outputs: { S: 1 } },
    selection: "gate",
    selectedIds: new Set(),
  };
  assert.deepEqual(
    baseline.renderCases.map((c) => hash(renderComponent(c, context))),
    baseline.renderHashes,
  );
  assert.deepEqual(
    baseline.figureCases.map((f) => hash(renderFigure(f, "gate"))),
    baseline.figureHashes,
  );
});
test("Menus retain all existing action IDs, labels, shortcuts and ordering", () =>
  assert.deepEqual(menus, baseline.menus));
