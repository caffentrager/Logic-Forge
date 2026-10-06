import test from "node:test";
import assert from "node:assert/strict";
import { createCircuitHistory } from "../src/ui/state/history.js";
import { registerKeyboard } from "../src/ui/interaction/keyboard.js";

test("History snapshots are isolated, branch edits clear redo, empty restore is inert", () => {
  const h = createCircuitHistory(),
    circuit = { components: [{ x: 1 }] };
  assert.equal(h.undo(circuit), null);
  assert.equal(h.redo(circuit), null);
  h.snapshot(circuit);
  circuit.components[0].x = 2;
  const restored = h.undo(circuit);
  assert.deepEqual(restored, { components: [{ x: 1 }] });
  assert.equal(h.canUndo, false);
  assert.equal(h.canRedo, true);
  assert.deepEqual(h.redo(restored), circuit);
  h.undo(circuit);
  h.snapshot(restored);
  assert.equal(h.canRedo, false);
});

test("History preserves the release's snapshot limit and separate drag policy", () => {
  const h = createCircuitHistory();
  for (let n = 0; n < 65; n++) h.snapshot({ n });
  for (let n = 64; n >= 5; n--) assert.deepEqual(h.undo({ n: 99 }), { n });
  assert.equal(h.canUndo, false);
  for (let n = 0; n < 65; n++) h.recordDrag({ n });
  assert.equal(h.canRedo, false);
  for (let n = 64; n >= 0; n--) assert.deepEqual(h.undo({ n: 99 }), { n });
  assert.equal(h.canUndo, false);
});

test("Keyboard routing preserves modifiers, edit/modal guards, defaults and teardown", () => {
  let handler,
    modal = false;
  const calls = [];
  const document = {
    addEventListener(name, fn) {
      assert.equal(name, "keydown");
      handler = fn;
    },
    removeEventListener(name, fn) {
      assert.equal(name, "keydown");
      assert.equal(fn, handler);
      handler = null;
    },
  };
  const dispose = registerKeyboard(document, {
    actions: new Proxy({}, { get: (_, name) => () => calls.push(name) }),
    isModalOpen: () => modal,
    setMode: (mode) => calls.push(mode),
    clearSelection: () => calls.push("clear"),
    fit: () => calls.push("fit"),
  });
  function key(key, options = {}) {
    let prevented = false;
    handler({
      key,
      target: { tagName: "BODY" },
      preventDefault() {
        prevented = true;
      },
      ...options,
    });
    return prevented;
  }
  assert.equal(key("z", { ctrlKey: true }), true);
  assert.equal(key("Z", { metaKey: true, shiftKey: true }), true);
  assert.equal(key("ArrowRight", { altKey: true }), true);
  assert.equal(key("F5"), true);
  assert.equal(key("Escape"), false);
  assert.equal(key("w"), false);
  assert.equal(key("Home"), false);
  assert.deepEqual(calls, [
    "undo",
    "redo",
    "spaceacross",
    "run",
    "clear",
    "wire",
    "fit",
  ]);
  for (const tagName of ["INPUT", "TEXTAREA", "SELECT"])
    assert.equal(key("Delete", { target: { tagName } }), false);
  modal = true;
  assert.equal(key("s", { ctrlKey: true }), false);
  modal = false;
  assert.equal(key("q", { ctrlKey: true }), false);
  assert.equal(calls.length, 7);
  dispose();
  assert.equal(handler, null);
});
