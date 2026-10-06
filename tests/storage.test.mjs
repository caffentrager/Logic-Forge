import test from "node:test";
import assert from "node:assert/strict";
import {
  loadLibrary,
  loadProject,
  saveProject,
} from "../src/storage/project.js";
const storage = (entries) => {
  const values = new Map(Object.entries(entries || {}));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
};
const circuit = { name: "Saved", library: "User", components: [], wires: [] };
test("Project saves retain the LogicForge-2 shape, stimulus and custom library", () => {
  const s = storage(),
    library = {
      symbols: { "USER/CUSTOM": { name: "CUSTOM" } },
      circuits: { CUSTOM: circuit },
    },
    stimulus = "GEN A 1@15;";
  saveProject(s, circuit, stimulus, library);
  assert.deepEqual(loadProject(s, {}), { ...circuit, stimulusText: stimulus });
  const data = { symbols: {}, circuits: {} };
  assert.deepEqual(loadLibrary(s, data), library);
  assert.equal(data.symbols["USER/CUSTOM"].name, "CUSTOM");
  assert.deepEqual(data.circuits.CUSTOM, circuit);
});
test("Original mylogic-web-project fallback and current key precedence remain", () => {
  const old = { ...circuit, name: "Legacy" },
    current = { ...circuit, name: "Current" };
  assert.deepEqual(
    loadProject(storage({ "mylogic-web-project": JSON.stringify(old) }), {}),
    old,
  );
  assert.deepEqual(
    loadProject(
      storage({
        "mylogic-web-project": JSON.stringify(old),
        "logic-forge-project": JSON.stringify(current),
      }),
      {},
    ),
    current,
  );
});
test("Unavailable or corrupt browser storage leaves the initial circuit usable", () => {
  const initial = { name: "HA" },
    broken = {
      getItem() {
        throw Error("Access denied");
      },
      setItem() {
        throw Error("Quota");
      },
    };
  assert.equal(loadProject(broken, initial), initial);
  assert.deepEqual(loadLibrary(broken, { symbols: {}, circuits: {} }), {
    symbols: {},
    circuits: {},
  });
  assert.equal(
    loadProject(storage({ "logic-forge-project": "invalid JSON" }), initial),
    initial,
  );
  assert.equal(
    loadProject(
      storage({ "logic-forge-project": '{"components":[]}' }),
      initial,
    ),
    initial,
  );
  assert.throws(
    () => saveProject(broken, circuit, "", { symbols: {}, circuits: {} }),
    /Quota/,
  );
});

test("A denied localStorage getter is handled before the editor boots", () => {
  const denied = () => {
    throw Error("SecurityError");
  };
  const initial = { name: "HA" };
  assert.equal(loadProject(denied, initial), initial);
  assert.deepEqual(loadLibrary(denied, { symbols: {}, circuits: {} }), {
    symbols: {},
    circuits: {},
  });
});
