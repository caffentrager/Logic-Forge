import test from "node:test";
import assert from "node:assert/strict";
import { data } from "./helpers/fixtures.mjs";
import { browserHost } from "./helpers/browser-host.mjs";

test("Real application controller: inputs, editing, history, files, patterns and persistence", async (t) => {
  const host = browserHost(data);
  host.install();
  try {
    await import("../src/ui/app.js");
    await t.test("Initial boot restores the same HA editor and library", () => {
      assert.equal(host.element("#document-name").textContent, "HA");
      assert.equal(host.element("#symbol-count").textContent, 600);
      assert.match(host.element("#drawing").innerHTML, /XOR2/);
    });
    await t.test(
      "Input switches compute outputs without the previous ReferenceError",
      () => {
        assert.doesNotThrow(() => host.input("A", 1));
        assert.doesNotThrow(() => host.input("B", 1));
        assert.equal(host.element("#time-label").textContent, "t = 20 ns");
        assert.equal(
          host.element("#outputs").innerHTML.replace(/<[^>]+>/g, ""),
          "C1S0",
        );
      },
    );
    await t.test(
      "Copy/paste and Ctrl+Z/Ctrl+Y retain components and internal wires",
      () => {
        host.action("selectall");
        host.action("copy");
        host.action("paste");
        assert.equal(
          host.saved().components.length,
          data.circuits.HA.components.length * 2,
        );
        assert.equal(
          host.saved().wires.length,
          data.circuits.HA.wires.length * 2,
        );
        host.key("z", { ctrlKey: true });
        assert.equal(
          host.saved().components.length,
          data.circuits.HA.components.length,
        );
        host.key("y", { ctrlKey: true });
        assert.equal(
          host.saved().components.length,
          data.circuits.HA.components.length * 2,
        );
        host.action("undo");
      },
    );
    await t.test(
      "Text tool, property editing and deletion use the existing document shape",
      () => {
        host.key("t");
        host.pointer(800, 500);
        assert.equal(host.saved().figures.length, 1);
        host.element("#fig-text").onchange({ target: { value: "회귀 검사" } });
        assert.equal(host.saved().figures[0].text, "회귀 검사");
        host.key("Delete");
        assert.equal(host.saved().figures.length, 0);
        host.action("undo");
        assert.equal(host.saved().figures[0].text, "회귀 검사");
        host.action("undo");
        host.action("undo");
      },
    );
    await t.test(
      "JSON save keeps format, custom library and stimulus fields",
      async () => {
        host.action("save");
        const d = host.downloads.at(-1),
          saved = await (await fetch(d.url)).json();
        assert.equal(d.name, "HA.mylogic.json");
        assert.equal(saved.format, "LogicForge-2");
        assert.deepEqual(saved.userLibrary, { symbols: {}, circuits: {} });
        assert.equal(saved.stimulusText, "");
      },
    );
    await t.test(
      "GEN at 15 ns, VECTOR and WATCH render at the same event time",
      () => {
        host.action("stimulus");
        host.element("#stimulus-text").value =
          "MAX_TIME 100; GEN A 0@0 1@15; GEN B 1@0; VECTOR Result C S; WATCH Result;";
        host.element("#apply-stimulus").onclick();
        host.action("step");
        host.action("step");
        assert.equal(host.element("#time-label").textContent, "t = 15 ns");
        assert.match(
          host.element("#bottom-content").innerHTML,
          />Result<\/text>/,
        );
        assert.match(host.element("#bottom-content").innerHTML, />10<\/text>/);
        assert.match(host.saved().stimulusText, /1@15/);
      },
    );
    await t.test(
      "Existing examples and inspector drawer still dispatch their actions",
      () => {
        host.example("FA");
        assert.equal(host.element("#document-name").textContent, "FA");
        assert.equal(host.saved().name, "FA");
        host.action("signals");
        assert.equal(host.element(".signals-button").textContent, "입출력 ◂");
        host.action("signals");
        assert.equal(host.element(".signals-button").textContent, "입출력 ▸");
      },
    );
  } finally {
    host.action("reset");
    host.restore();
  }
});
