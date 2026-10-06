import { arcPath } from "./symbols.js";
import { esc } from "../html.js";
export function renderFigure(f, selection = null) {
  let shape = "";
  const x = Math.min(f.x, f.x2 ?? f.x),
    y = Math.min(f.y, f.y2 ?? f.y),
    w = Math.abs((f.x2 ?? f.x) - f.x),
    h = Math.abs((f.y2 ?? f.y) - f.y);
  if (f.kind === "Text")
    shape = `<text x="${f.x}" y="${f.y}" fill="#4d6275" stroke="none" font-size="${f.size || 15}" font-family="Consolas">${esc(f.text)}</text>`;
  else if (f.kind === "Rect")
    shape = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/>`;
  else if (f.kind === "Circle")
    shape = `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="transparent"/>`;
  else if (f.kind === "Arc")
    shape = `<path d="${arcPath([f.x, -f.y], [f.x2, -f.y2], [(f.x + f.x2) / 2, -Math.min(f.y, f.y2) - Math.abs(f.x2 - f.x) / 2])}" fill="none"/>`;
  else shape = `<path d="M${f.x},${f.y} L${f.x2},${f.y2}"/>`;
  return `<g class="figure-part" data-figure="${esc(f.id)}" stroke="${f.id === selection ? "#087c72" : "#718295"}" stroke-width="${f.id === selection ? 2 : 1}" fill="none">${shape}</g>`;
}
