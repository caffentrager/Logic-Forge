import { compile } from "../core/geometry.js";
import { id, gateType } from "./common.js";
export function flattenCircuit(circuit, data) {
  const ports = [],
    gates = [],
    nets = new Set(),
    assignments = [];
  let serial = 0;
  function walk(c, prefix, bindings = {}, depth = 0) {
    if (depth > 24) throw Error("계층 회로가 순환하거나 너무 깊습니다.");
    const g = compile(c, data),
      mapping = new Map(),
      get = (n) => {
        if (!mapping.has(n)) {
          mapping.set(n, "w" + serial++);
          nets.add(mapping.get(n));
        }
        return mapping.get(n);
      };
    for (const part of c.components.filter((p) => p.kind !== "GATE")) {
      const local = get(g.root([part.x, part.y]));
      if (prefix === "top") {
        const name = id(part.name);
        ports.push({ name, original: part.name, direction: part.kind });
        assignments.push(part.kind === "INPUT" ? [local, name] : [name, local]);
      } else if (bindings[part.name])
        assignments.push(
          part.kind === "INPUT"
            ? [local, bindings[part.name]]
            : [bindings[part.name], local],
        );
    }
    for (const part of c.components.filter((p) => p.kind === "GATE")) {
      const pins = g.pins.filter((p) => p.component === part.id),
        inputs = {},
        outputs = {},
        type = part.symbol.split("/").at(-1);
      for (const p of pins) {
        const net = get(p.net);
        if (p.direction === 1) {
          let inverse =
            (part.portBubbles || []).includes(p.name) !==
            (!!p.bubble && part.symbol.startsWith("PRIMITIVE/"));
          inputs[p.name] = { net, inverse };
        } else
          outputs[p.name] = {
            net,
            inverse: (part.portBubbles || []).includes(p.name),
          };
      }
      if (!Object.keys(outputs).length) {
        if (!pins.length) throw Error("HDL 모델 미지원: " + type);
        continue;
      }
      if (
        gateType(type) ||
        /^FD(C|P|R|S|E|CE|PE|RE|SE)?$|^DFF$|^REG(CKE|RS)?$/.test(type)
      )
        gates.push({ name: id(prefix + "_" + part.id), type, inputs, outputs });
      else {
        const sub = data.circuits[type] || data.models?.[part.symbol];
        if (!sub) throw Error("HDL 모델 미지원: " + type);
        const map = {};
        for (const [name, p] of Object.entries({ ...inputs, ...outputs })) {
          if (p.inverse) {
            const inverted = "w" + serial++;
            nets.add(inverted);
            assignments.push(
              name in inputs
                ? [inverted, { net: p.net, inverse: true }]
                : [p.net, { net: inverted, inverse: true }],
            );
            map[name] = inverted;
          } else map[name] = p.net;
        }
        walk(sub, prefix + "_" + part.id, map, depth + 1);
      }
    }
  }
  walk(circuit, "top");
  if (ports.length !== new Set(ports.map((p) => p.name)).size)
    throw Error("포트 이름이 중복되거나 HDL 식별자로 변환할 수 없습니다.");
  return { name: id(circuit.name), ports, gates, nets: [...nets], assignments };
}
