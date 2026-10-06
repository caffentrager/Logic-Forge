import { clone, compile } from "../core/geometry.js";
export function copyCircuitSelection(circuit, ids, data) {
  const selected = new Set(ids),
    components = circuit.components.filter((c) => selected.has(c.id)),
    wireSelected = circuit.wires.filter((w) => selected.has(w.id));
  if (components.length === circuit.components.length)
    return clone({
      components,
      wires: circuit.wires,
      figures: circuit.figures || [],
    });
  const graph = compile(circuit, data),
    inside = new Set(
      [...graph.nets]
        .filter(
          ([, pins]) =>
            pins.length && pins.every((p) => selected.has(p.component)),
        )
        .map(([net]) => net),
    );
  return clone({
    components,
    wires: circuit.wires.filter(
      (w) => inside.has(graph.root(w.points[0])) || wireSelected.includes(w),
    ),
    figures: (circuit.figures || []).filter((f) => selected.has(f.id)),
  });
}
export function pasteCircuitSelection(
  circuit,
  clipboard,
  offset = [40, 40],
  nextId = () => crypto.randomUUID(),
) {
  const out = clone(clipboard),
    taken = new Set(circuit.components.map((c) => c.name)),
    unique = (n) => {
      let name = n,
        i = 1;
      while (taken.has(name)) name = n + "_" + i++;
      taken.add(name);
      return name;
    };
  for (const c of out.components) {
    c.id = nextId();
    c.name = unique(c.name);
    c.x += offset[0];
    c.y += offset[1];
  }
  for (const w of out.wires) {
    w.id = nextId();
    w.points = w.points.map((p) => [p[0] + offset[0], p[1] + offset[1]]);
  }
  for (const f of out.figures || []) {
    f.id = nextId();
    f.x += offset[0];
    f.y += offset[1];
    if (f.x2 !== undefined) {
      f.x2 += offset[0];
      f.y2 += offset[1];
    }
  }
  return out;
}
