import {
  parseMFFT,
  objects,
  value,
  values,
  decodeSymbol,
} from "../core/mfft.js";
import { pinsFor } from "../core/geometry.js";
const quoted = (s) => JSON.stringify(String(s ?? ""));
export const normalizedReference = (s) =>
  String(s)
    .replace(/^\(1\)(.*?):\(2\)(.*)$/, "$1/$2")
    .replace(/^PRIMITIV(?:E)?\//i, "PRIMITIVE/")
    .toUpperCase();
export function decodeNetlist(text, key) {
  const all = objects(parseMFFT(text)),
    byId = new Map(all.map((o) => [value(o, "OBJECTXID"), o])),
    nets = all.filter((o) => /^NVNet/.test(value(o, "OBJECTTYPE", ""))),
    parent = new Map();
  const root = (id) => {
    if (!parent.has(id)) parent.set(id, id);
    if (parent.get(id) !== id) parent.set(id, root(parent.get(id)));
    return parent.get(id);
  };
  for (const n of nets) {
    const ids = [...values(n, "JoinedPorts"), ...values(n, "JoinedInstPorts")];
    if (ids.length) for (const id of ids) parent.set(root(id), root(ids[0]));
  }
  const point = (id) => {
    const r = root(id);
    return [r * 10, r * 10];
  };
  const components = all
    .filter((o) => value(o, "OBJECTTYPE") === "NVPortScalar")
    .map((o) => {
      const p = point(value(o, "OBJECTXID"));
      return {
        id: "p" + value(o, "OBJECTXID"),
        name: value(o, "OBJECTNAME"),
        kind: value(o, "Direction") === 1 ? "INPUT" : "OUTPUT",
        x: p[0],
        y: p[1],
      };
    });
  for (const o of all.filter((o) => value(o, "OBJECTTYPE") === "NVInst")) {
    const ports = values(o, "InstPorts")
      .map((id) => byId.get(id))
      .filter(Boolean);
    components.push({
      id: "i" + value(o, "OBJECTXID"),
      name: value(o, "OBJECTNAME"),
      kind: "GATE",
      symbol: normalizedReference(value(o, "DescriberName", "")),
      x: 0,
      y: 0,
      pins: ports.map((p) => ({
        name: value(p, "OBJECTNAME"),
        direction: value(p, "Direction"),
        end: [
          point(value(p, "OBJECTXID"))[0],
          -point(value(p, "OBJECTXID"))[1],
        ],
      })),
      portBubbles: ports
        .filter((p) => value(p, "IsBubble") === "TRUE")
        .map((p) => value(p, "OBJECTNAME")),
    });
  }
  return {
    name: key,
    library: key.split("/")[0],
    components,
    wires: [],
    notes: [],
    virtual: true,
  };
}
export function encodeMFFT(circuit, data) {
  let xid = 1;
  const ids = new Map(),
    connection = (p) => {
      const key = p.join(",");
      if (!ids.has(key)) ids.set(key, 100000 + ids.size);
      return ids.get(key);
    };
  const scalar = (k, t, ...v) =>
    `  (${k} (${t} ${v.map((x) => (typeof x === "string" && t === "STRING" ? quoted(x) : x)).join(" ")}))`;
  const object = (type, name, body) =>
    `(OBJECT\n${scalar("OBJECTTYPE", "STRING", type)}\n${scalar("OBJECTNAME", "STRING", name)}\n${scalar("OBJECTXID", "XID", xid++)}\n${body}\n)`;
  const display = (name, x, y) =>
    `  (DisplayInfo (Name (STRING "Name")) (Value (STRING ${quoted(name)})) (Position (INT ${x} ${y})) (OriginalPosition (INT 0 0)) (DisplayMode (INT 2)) (DisplayType (INT 0)) (DisplayAttr (INT 2)) (FontHeight (INT 15)) (FontAlign (INT 0)) (FontAngle (INT 0)) (Color (INT 0 0 0)) (EditType (INT 1)))`;
  const list = [];
  for (const c of circuit.components) {
    let body =
      scalar("Color", "INT", 0, 0, 255) +
      "\n" +
      scalar("Transform", "INT", c.rotation || 0, c.mirror ? -1 : 1, c.x, -c.y);
    if (c.kind === "GATE") {
      body +=
        "\n" +
        scalar("DescriberName", "STRING", c.symbol + "/symbol") +
        "\n" +
        scalar("SimulationModel", "INT", 0);
      for (const p of pinsFor(c, data))
        body += `\n  (InstPort (Name (STRING ${quoted(p.name)})) (Bubble (BOOLEAN ${(c.portBubbles || []).includes(p.name) ? "TRUE" : "FALSE"})))`;
      body += "\n" + display(c.name, c.x, -c.y - 20);
    } else
      body +=
        "\n" +
        scalar("Direction", "INT", c.kind === "INPUT" ? 1 : 2) +
        "\n" +
        scalar("Connection", "INT", connection([c.x, c.y])) +
        "\n" +
        display(c.name, c.x + (c.kind === "INPUT" ? -40 : 25), -c.y + 10);
    list.push(object(c.kind === "GATE" ? "InstImp" : "Port", c.name, body));
  }
  for (const w of circuit.wires)
    list.push(
      object(
        "NetSegment",
        w.name || "",
        scalar("Color", "INT", 128, 0, 0) +
          `\n  (Path (Size (INT ${w.points.length})) (Points (INT ${w.points.flatMap((p) => [p[0], -p[1]]).join(" ")})))\n` +
          scalar("FirstConnection", "INT", connection(w.points[0])) +
          "\n" +
          scalar("SecondConnection", "INT", connection(w.points.at(-1))),
      ),
    );
  for (const f of circuit.figures || []) {
    let body = scalar("Color", "INT", 0, 0, 0);
    if (f.kind === "Text")
      body +=
        "\n" +
        scalar("Position", "INT", f.x, -f.y) +
        "\n" +
        scalar("Content", "STRING", f.text) +
        "\n" +
        scalar("Height", "INT", f.size || 15) +
        "\n" +
        scalar("Align", "INT", 0);
    else if (f.kind === "Line" || f.kind === "Arc")
      body +=
        "\n" +
        scalar("StartPoint", "INT", f.x, -f.y) +
        "\n" +
        scalar("EndPoint", "INT", f.x2, -f.y2) +
        (f.kind === "Arc"
          ? "\n" +
            scalar(
              "ControlPoint",
              "INT",
              (f.x + f.x2) / 2,
              -Math.min(f.y, f.y2) - Math.abs(f.x2 - f.x) / 2,
            )
          : "");
    else body += "\n" + scalar("BoundRect", "INT", f.x, -f.y, f.x2, -f.y2);
    list.push(object(f.kind, "NoName", body));
  }
  return `[MFFT1.00-schematic-V300]\n(libName (STRING ${quoted(circuit.library || "User")}))\n(cellName (STRING ${quoted(circuit.name)}))\n(viewName (STRING "schematic"))\n${list.join("\n")}\n`;
}
export function makeSymbol(circuit, name) {
  const ins = circuit.components.filter((c) => c.kind === "INPUT"),
    outs = circuit.components.filter((c) => c.kind === "OUTPUT");
  if (!ins.length || !outs.length)
    throw Error("입력과 출력 포트가 필요합니다.");
  if (
    new Set([...ins, ...outs].map((c) => c.name)).size !==
    ins.length + outs.length
  )
    throw Error("포트 이름이 중복됩니다.");
  const h = Math.max(60, Math.max(ins.length, outs.length) * 20 + 20),
    obj = (type, body) => `(OBJECT (OBJECTTYPE (STRING "${type}")) ${body})`,
    graphics = [
      obj("Rect", `(BoundRect (INT -60 ${h / 2} 60 ${-h / 2}))`),
      obj(
        "Text",
        `(Position (INT 0 ${h / 2 + 15})) (Height (INT 15)) (Align (INT 1)) (Content (STRING ${quoted(name)}))`,
      ),
    ];
  for (const [ports, direction] of [
    [ins, 1],
    [outs, 2],
  ])
    ports.forEach((p, i) => {
      const x = direction === 1 ? -60 : 60,
        y = ((ports.length - 1) / 2 - i) * 20,
        end = x + (direction === 1 ? -20 : 20);
      graphics.push(
        obj(
          "SymbolPort",
          `(Direction (INT ${direction})) (StartPoint (INT ${x} ${y})) (EndPoint (INT ${end} ${y})) (Bubble (BOOLEAN FALSE)) (DisplayInfo (Name (STRING "Name")) (Value (STRING ${quoted(p.name)})) (Position (INT ${direction === 1 ? -50 : 50} ${y + 3})) (FontHeight (INT 10)) (FontAlign (INT ${direction === 1 ? 0 : 2})) (DisplayMode (INT 2)))`,
        ),
      );
    });
  const text = `[MFFT1.00-symbol-V300]\n(cellName (STRING ${quoted(name)}))\n${graphics.join("\n")}`;
  return { symbol: decodeSymbol(text, "USER/" + name.toUpperCase()), text };
}
