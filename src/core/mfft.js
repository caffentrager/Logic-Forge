export function parseMFFT(text) {
  const tokens =
    text.replace(/^\[[^\]]*\]/, "").match(/"(?:\\.|[^"\\])*"|[()]|[^\s()]+/g) ||
    [];
  let i = 0;
  function read() {
    const t = tokens[i++];
    if (t === "(") {
      const a = [];
      while (i < tokens.length && tokens[i] !== ")") a.push(read());
      if (tokens[i++] !== ")") throw Error("닫는 괄호가 없습니다.");
      return a;
    }
    if (t === ")") throw Error("잘못된 괄호입니다.");
    if (t?.startsWith('"')) {
      try {
        return JSON.parse(t);
      } catch {
        return t.slice(1, -1);
      }
    }
    return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : t;
  }
  const out = [];
  while (i < tokens.length) out.push(read());
  return out;
}
export const fields = (o, k) => o.filter((a) => Array.isArray(a) && a[0] === k);
export const field = (o, k) => fields(o, k)[0];
export function values(o, k) {
  const f = field(o, k);
  return Array.isArray(f?.[1]) ? f[1].slice(1) : f?.slice(1) || [];
}
export const value = (o, k, d) => values(o, k)[0] ?? d;
export const objects = (t) =>
  t.filter((a) => Array.isArray(a) && a[0] === "OBJECT");
export function decodeSymbol(text, key) {
  const all = objects(parseMFFT(text));
  return {
    key,
    name: key.split("/").at(-1),
    graphics: all.filter(
      (o) => !["DocInfo", "DisplayTemplate"].includes(value(o, "OBJECTTYPE")),
    ),
    pins: all
      .filter((o) => value(o, "OBJECTTYPE") === "SymbolPort")
      .map((o) => ({
        name: value(field(o, "DisplayInfo") || [], "Value", "?"),
        direction: value(o, "Direction", 1),
        start: values(o, "StartPoint"),
        end: values(o, "EndPoint"),
        bubble: value(o, "Bubble") === "TRUE",
      })),
  };
}
export function decodeCircuit(text) {
  const tree = parseMFFT(text),
    all = objects(tree);
  return {
    name: value(tree, "cellName", "Imported"),
    library: value(tree, "libName", "User"),
    components: all
      .filter((o) => ["InstImp", "Port"].includes(value(o, "OBJECTTYPE")))
      .map((o) => {
        const t = values(o, "Transform");
        return {
          id: "n" + value(o, "OBJECTXID"),
          name: value(o, "OBJECTNAME"),
          kind:
            value(o, "OBJECTTYPE") === "Port"
              ? value(o, "Direction") === 1
                ? "INPUT"
                : "OUTPUT"
              : "GATE",
          symbol: value(o, "DescriberName", "")
            .replace(/\/symbol$/i, "")
            .toUpperCase(),
          x: t[2] || 0,
          y: -(t[3] || 0),
          rotation: t[0] || 0,
          mirror: t[1] === -1,
          portBubbles: fields(o, "InstPort")
            .filter((p) => value(p, "Bubble") === "TRUE")
            .map((p) => value(p, "Name")),
        };
      }),
    wires: all
      .filter((o) => value(o, "OBJECTTYPE") === "NetSegment")
      .map((o) => {
        const pts = values(field(o, "Path") || [], "Points");
        return {
          id: "w" + value(o, "OBJECTXID"),
          name: value(o, "OBJECTNAME", ""),
          points: Array.from({ length: pts.length / 2 }, (_, i) => [
            pts[i * 2],
            -pts[i * 2 + 1],
          ]),
        };
      }),
    notes: [],
    figures: all
      .filter((o) =>
        ["Line", "Rect", "Circle", "Arc", "Text"].includes(
          value(o, "OBJECTTYPE"),
        ),
      )
      .map((o) => {
        const kind = value(o, "OBJECTTYPE"),
          a = values(
            o,
            kind === "Text"
              ? "Position"
              : kind === "Rect" || kind === "Circle"
                ? "BoundRect"
                : "StartPoint",
          ),
          b = values(o, "EndPoint");
        return {
          id: "f" + value(o, "OBJECTXID"),
          kind,
          x: a[0] || 0,
          y: -(a[1] || 0),
          ...(kind === "Text"
            ? { text: value(o, "Content", ""), size: value(o, "Height", 15) }
            : { x2: a[2] ?? b[0] ?? 0, y2: -(a[3] ?? b[1] ?? 0) }),
        };
      }),
  };
}
