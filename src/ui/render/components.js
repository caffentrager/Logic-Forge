import { resolveSymbol, pinsFor, localPoint } from "../../core/geometry.js";
import { values } from "../../core/mfft.js";
import { symbolGraphics } from "./symbols.js";
import { esc } from "../html.js";
export function componentBounds(c, data) {
  const ps = pinsFor(c, data).map((p) => p.point);
  if (c.kind !== "GATE") ps.push([c.x - 30, c.y - 18], [c.x + 30, c.y + 18]);
  else {
    const sym = resolveSymbol(c, data);
    for (const g of sym?.graphics || []) {
      for (const k of ["StartPoint", "EndPoint", "ControlPoint", "Position"]) {
        const p = values(g, k);
        if (p.length >= 2) ps.push(localPoint(c, p));
      }
      const b = values(g, "BoundRect");
      if (b.length)
        ps.push(localPoint(c, [b[0], b[1]]), localPoint(c, [b[2], b[3]]));
    }
  }
  if (!ps.length) ps.push([c.x - 40, c.y - 30], [c.x + 40, c.y + 30]);
  return {
    x: Math.min(...ps.map((p) => p[0])) - 8,
    y: Math.min(...ps.map((p) => p[1])) - 8,
    w: Math.max(...ps.map((p) => p[0])) - Math.min(...ps.map((p) => p[0])) + 16,
    h: Math.max(...ps.map((p) => p[1])) - Math.min(...ps.map((p) => p[1])) + 16,
  };
}
export function renderComponent(
  c,
  { data, inputs, result, selection, selectedIds },
  ghost = false,
) {
  let body;
  if (c.kind === "GATE") {
    body = `<g transform="rotate(${c.rotation || 0}) scale(${c.mirror ? -1 : 1},1)" fill="none" stroke="#254c84" stroke-width="1.2">${symbolGraphics(resolveSymbol(c, data))}</g><text y="20" text-anchor="middle" font-family="Consolas" font-size="11" fill="#7a8793">${esc(c.name)}</text>`;
  } else {
    const v =
        c.kind === "INPUT"
          ? (inputs[c.name] ?? 0)
          : (result?.outputs[c.name] ?? "X"),
      color = v === 1 ? "#087c72" : v === 0 ? "#944650" : "#bc8b32";
    body = `<path d="${c.kind === "INPUT" ? "M0,0 L-9,-7 L-26,-7 L-26,7 L-9,7 Z" : "M0,0 L17,0 M17,-7 L32,-7 L40,0 L32,7 L17,7 Z"}" stroke="#254c84" stroke-width="1.2" fill="white"/><text x="${c.kind === "INPUT" ? -17 : 28}" y="3.5" text-anchor="middle" font-size="10" font-family="Consolas" fill="${color}">${v}</text><text x="${c.kind === "INPUT" ? -32 : 48}" y="4" text-anchor="${c.kind === "INPUT" ? "end" : "start"}" font-size="13" font-family="Consolas" fill="#354b60">${esc(c.name)}</text>`;
  }
  const hit = componentBounds(c, data);
  let select =
    selection === c.id || selectedIds.has(c.id)
      ? `<rect class="selection-box" x="${hit.x - c.x}" y="${hit.y - c.y}" width="${hit.w}" height="${hit.h}"/>`
      : "";
  const pins = ghost
    ? ""
    : pinsFor(c, data)
        .map(
          (p) =>
            `<circle class="pin-hit" data-pin="${esc(c.id)}" data-name="${esc(p.name)}" data-x="${p.point[0]}" data-y="${p.point[1]}" cx="${p.point[0] - c.x}" cy="${p.point[1] - c.y}" r="5"/>`,
        )
        .join("");
  return `<g class="circuit-part" data-component="${esc(c.id)}" transform="translate(${c.x},${c.y})" ${ghost ? 'opacity="0.4"' : ""}>${select}${body}${pins}</g>`;
}
