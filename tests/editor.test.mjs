import test from "node:test";
import assert from "node:assert/strict";
import { data } from "./helpers/fixtures.mjs";
import { clone, pinsFor, simulate } from "../src/core/engine.js";
import {
  route,
  moveComponent,
  transformComponents,
  alignComponents,
} from "../src/editor/geometry.js";

test("Moving an exercise gate preserves its attached endpoints and arithmetic", () => {
  const c = clone(data.circuits.HA),
    gate = c.components.find((c) => c.kind === "GATE"),
    before = pinsFor(gate, data);
  const attached = c.wires.flatMap((w) =>
    [0, w.points.length - 1]
      .filter((i) =>
        before.some(
          (p) => p.point[0] === w.points[i][0] && p.point[1] === w.points[i][1],
        ),
      )
      .map((index) => ({ w, index, point: [...w.points[index]] })),
  );
  moveComponent(c, data, gate, gate.x + 80, gate.y + 40);
  for (const { w, index, point } of attached)
    assert.deepEqual(w.points[index === 0 ? 0 : w.points.length - 1], [
      point[0] + 80,
      point[1] + 40,
    ]);
  assert.deepEqual(simulate(c, data, { A: 1, B: 1 }).outputs, { C: 1, S: 0 });
});
test("Four rotations and two mirrors restore gate pins and circuit results", () => {
  const c = clone(data.circuits.HA),
    gate = c.components.find((c) => c.kind === "GATE"),
    pins = pinsFor(gate, data).map((p) => p.point);
  for (let i = 0; i < 4; i++) transformComponents(c, data, [gate], "right");
  assert.deepEqual(
    pinsFor(gate, data).map((p) => p.point),
    pins,
  );
  transformComponents(c, data, [gate], "horizontal");
  transformComponents(c, data, [gate], "horizontal");
  assert.deepEqual(
    pinsFor(gate, data).map((p) => p.point),
    pins,
  );
  assert.deepEqual(simulate(c, data, { A: 1, B: 1 }).outputs, { C: 1, S: 0 });
});
test("Alignment and grid spacing retain existing anchor rules", () => {
  const parts = [
      { id: "a", name: "A", kind: "INPUT", x: 10, y: 0 },
      { id: "b", name: "B", kind: "INPUT", x: 40, y: 30 },
      { id: "c", name: "C", kind: "INPUT", x: 130, y: 60 },
    ],
    c = { components: parts, wires: [] };
  alignComponents(c, data, parts, "across");
  assert.deepEqual(
    parts.map((c) => c.x),
    [10, 70, 130],
  );
  alignComponents(c, data, parts, "top");
  assert.deepEqual(
    parts.map((c) => c.y),
    [0, 0, 0],
  );
  assert.deepEqual(route([0, 0], [30, 50]), [
    [30, 0],
    [30, 50],
  ]);
  assert.deepEqual(route([0, 0], [0, 50]), [[0, 50]]);
});
