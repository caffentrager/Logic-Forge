export const clone = (o) => JSON.parse(JSON.stringify(o));
export function resolveSymbol(c, data) {
  return (
    data.symbols[c.symbol] ||
    data.symbols[
      Object.keys(data.symbols).find(
        (k) => k.split("/").at(-1) === c.symbol.split("/").at(-1),
      )
    ]
  );
}
export function localPoint(c, p) {
  const a = ((c.rotation || 0) * Math.PI) / 180,
    x = p[0] * (c.mirror ? -1 : 1),
    y = -p[1];
  return [
    Math.round(c.x + x * Math.cos(a) - y * Math.sin(a)),
    Math.round(c.y + x * Math.sin(a) + y * Math.cos(a)),
  ];
}
export function pinsFor(c, data) {
  if (c.kind !== "GATE")
    return [
      {
        name: c.name,
        direction: c.kind === "INPUT" ? 2 : 1,
        point: [c.x, c.y],
        component: c.id,
      },
    ];
  return (c.pins || resolveSymbol(c, data)?.pins || []).map((p) => ({
    ...p,
    component: c.id,
    point: localPoint(c, p.end),
  }));
}
const key = (p) =>
  `${Math.round(p[0] * 100) / 100},${Math.round(p[1] * 100) / 100}`;
const onSegment = (p, a, b) =>
  Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) <
    0.001 &&
  p[0] >= Math.min(a[0], b[0]) - 0.001 &&
  p[0] <= Math.max(a[0], b[0]) + 0.001 &&
  p[1] >= Math.min(a[1], b[1]) - 0.001 &&
  p[1] <= Math.max(a[1], b[1]) + 0.001;
export function compile(circuit, data) {
  const parent = new Map(),
    find = (k) => {
      if (!parent.has(k)) parent.set(k, k);
      if (parent.get(k) !== k) parent.set(k, find(parent.get(k)));
      return parent.get(k);
    },
    join = (a, b) => parent.set(find(a), find(b));
  const pins = circuit.components.flatMap((c) => pinsFor(c, data));
  const pts = [
    ...pins.map((p) => p.point),
    ...circuit.wires.flatMap((w) => w.points),
  ];
  pts.forEach((p) => find(key(p)));
  for (const w of circuit.wires) {
    for (let i = 1; i < w.points.length; i++) {
      const a = w.points[i - 1],
        b = w.points[i];
      join(key(a), key(b));
      for (const p of pts) if (onSegment(p, a, b)) join(key(a), key(p));
    }
  }
  const nets = new Map();
  pins.forEach((p) => {
    p.net = find(key(p.point));
    if (!nets.has(p.net)) nets.set(p.net, []);
    nets.get(p.net).push(p);
  });
  return { pins, nets, root: (p) => find(key(p)), circuit };
}
