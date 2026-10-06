import { pinsFor } from "../core/geometry.js";
export function route(a, b) {
  if (a[0] === b[0] || a[1] === b[1]) return [b];
  return [[b[0], a[1]], b];
}
export function moveComponent(circuit, data, c, x, y) {
  const old = pinsFor(c, data).map((p) => p.point),
    dx = x - c.x,
    dy = y - c.y;
  c.x = x;
  c.y = y;
  for (const w of circuit.wires)
    for (const index of [0, w.points.length - 1]) {
      const p = w.points[index];
      if (!old.some((q) => q[0] === p[0] && q[1] === p[1])) continue;
      const adjacent = index === 0 ? 1 : index - 1,
        neighbor = w.points[adjacent],
        next = [p[0] + dx, p[1] + dy];
      if (w.points.length === 2) {
        const other = w.points[1 - index];
        const rt = route(next, other);
        w.points = index === 0 ? [next, ...rt] : [other, ...route(other, next)];
        break;
      }
      if (neighbor[0] === p[0]) neighbor[0] = next[0];
      else if (neighbor[1] === p[1]) neighbor[1] = next[1];
      w.points[index] = next;
    }
}
export function transformComponents(circuit, data, parts, kind) {
  for (const c of parts) {
    const before = pinsFor(c, data);
    if (kind === "left") c.rotation = ((c.rotation || 0) + 270) % 360;
    else if (kind === "right") c.rotation = ((c.rotation || 0) + 90) % 360;
    else if (kind === "horizontal") c.mirror = !c.mirror;
    else {
      c.mirror = !c.mirror;
      c.rotation = ((c.rotation || 0) + 180) % 360;
    }
    const after = pinsFor(c, data);
    for (const w of circuit.wires)
      for (const idx of [0, w.points.length - 1]) {
        const i = before.findIndex(
          (p) =>
            p.point[0] === w.points[idx][0] && p.point[1] === w.points[idx][1],
        );
        if (i >= 0) {
          const other = idx === 0 ? w.points[1] : w.points[idx - 1],
            end = after[i].point;
          if (idx === 0)
            w.points = [end, ...route(end, other), ...w.points.slice(2)];
          else w.points = [...w.points.slice(0, -1), ...route(other, end)];
        }
      }
  }
}
export function alignComponents(circuit, data, parts, kind) {
  const xs = parts.map((c) => c.x),
    ys = parts.map((c) => c.y),
    horizontal = kind === "left" || kind === "right" || kind === "across";
  if (kind === "across" || kind === "down") {
    const sorted = parts.sort((a, b) => (horizontal ? a.x - b.x : a.y - b.y)),
      lo = horizontal ? Math.min(...xs) : Math.min(...ys),
      hi = horizontal ? Math.max(...xs) : Math.max(...ys);
    sorted.forEach((c, i) => {
      const v =
        Math.round((lo + ((hi - lo) * i) / (sorted.length - 1)) / 10) * 10;
      moveComponent(
        circuit,
        data,
        c,
        horizontal ? v : c.x,
        horizontal ? c.y : v,
      );
    });
  } else {
    const v =
      kind === "left"
        ? Math.min(...xs)
        : kind === "right"
          ? Math.max(...xs)
          : kind === "top"
            ? Math.min(...ys)
            : Math.max(...ys);
    parts.forEach((c) =>
      moveComponent(
        circuit,
        data,
        c,
        horizontal ? v : c.x,
        horizontal ? c.y : v,
      ),
    );
  }
}
