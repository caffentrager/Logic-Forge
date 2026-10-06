import { field, value, values } from "../../core/mfft.js";
import { esc } from "../html.js";
export function svgText(p, text, size = 12, align = 0, color = "#234c80") {
  return `<text x="${p[0]}" y="${-p[1]}" fill="${color}" stroke="none" font-size="${size}" font-family="Consolas, monospace" text-anchor="${align === 1 ? "middle" : align === 2 ? "end" : "start"}" dominant-baseline="auto">${esc(text)}</text>`;
}
export function arcPath(a, b, c) {
  if (!a.length || !b.length || !c.length) return "";
  const [x1, y1] = [a[0], -a[1]],
    [x2, y2] = [c[0], -c[1]],
    [x3, y3] = [b[0], -b[1]],
    d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
  if (Math.abs(d) < 0.001) return `M${x1},${y1} Q${x2},${y2} ${x3},${y3}`;
  const q1 = x1 * x1 + y1 * y1,
    q2 = x2 * x2 + y2 * y2,
    q3 = x3 * x3 + y3 * y3,
    cx = (q1 * (y2 - y3) + q2 * (y3 - y1) + q3 * (y1 - y2)) / d,
    cy = (q1 * (x3 - x2) + q2 * (x1 - x3) + q3 * (x2 - x1)) / d,
    r = Math.hypot(x1 - cx, y1 - cy),
    ang = (x, y) => (Math.atan2(y - cy, x - cx) + Math.PI * 2) % (Math.PI * 2),
    a1 = ang(x1, y1),
    a2 = ang(x2, y2),
    a3 = ang(x3, y3),
    dist = (a, b) => (b - a + Math.PI * 2) % (Math.PI * 2),
    sweep = dist(a1, a2) < dist(a1, a3) ? 1 : 0,
    delta = sweep ? dist(a1, a3) : dist(a3, a1);
  return `M${x1},${y1} A${r},${r} 0 ${delta > Math.PI ? 1 : 0} ${sweep} ${x3},${y3}`;
}
export function symbolGraphics(symbol) {
  if (!symbol) return '<rect x="-40" y="-30" width="80" height="60"/>';
  return symbol.graphics
    .map((o) => {
      const t = value(o, "OBJECTTYPE"),
        a = values(o, "StartPoint"),
        b = values(o, "EndPoint"),
        p = values(o, "Position"),
        br = values(o, "BoundRect");
      if (t === "Line" || t === "SymbolPort") {
        let s = `<path d="M${a[0]},${-a[1]} L${b[0]},${-b[1]}"/>`;
        if (t === "SymbolPort" && value(o, "Bubble") === "TRUE")
          s += `<circle cx="${a[0]}" cy="${-a[1]}" r="5" fill="white"/>`;
        if (t === "SymbolPort") {
          const d = field(o, "DisplayInfo");
          if (d && value(d, "DisplayMode") === 2)
            s += svgText(
              values(d, "Position"),
              value(d, "Value"),
              value(d, "FontHeight", 9),
              value(d, "FontAlign", 1),
            );
        }
        return s;
      }
      if (t === "Arc")
        return `<path d="${arcPath(a, b, values(o, "ControlPoint"))}"/>`;
      if (t === "Rect" && br.length)
        return `<rect x="${Math.min(br[0], br[2])}" y="${-Math.max(br[1], br[3])}" width="${Math.abs(br[2] - br[0])}" height="${Math.abs(br[3] - br[1])}"/>`;
      if ((t === "Circle" || t === "Ellipse") && br.length)
        return `<ellipse cx="${(br[0] + br[2]) / 2}" cy="${-(br[1] + br[3]) / 2}" rx="${Math.abs(br[2] - br[0]) / 2}" ry="${Math.abs(br[3] - br[1]) / 2}"/>`;
      if (t === "Circle") {
        const cp = values(o, "CenterPoint");
        return cp.length
          ? `<circle cx="${cp[0]}" cy="${-cp[1]}" r="${value(o, "Radius", 5)}"/>`
          : "";
      }
      if (t === "Text")
        return svgText(
          p,
          value(o, "Content", ""),
          value(o, "Height", 12),
          value(o, "Align", 1),
        );
      if (t === "Polyline" || t === "Polygon") {
        const pp = values(field(o, "Path") || o, "Points");
        return `<polyline points="${Array.from({ length: pp.length / 2 }, (_, i) => pp[i * 2] + "," + -pp[i * 2 + 1]).join(" ")}"/>`;
      }
      return "";
    })
    .join("");
}
