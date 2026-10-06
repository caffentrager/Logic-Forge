import { compile } from "./geometry.js";
import { primitive, invert } from "./primitives.js";
export function simulate(circuit, data, inputs = {}, options = {}) {
  const graph = options.graph || compile(circuit, data),
    netValues = new Map(),
    warnings = new Set(),
    state = options.state || {},
    clocks = options.clocks || {},
    pending = {};
  const drivers = new Map();
  const drive = (net, id, v) => {
    if (!drivers.has(net)) drivers.set(net, new Map());
    drivers.get(net).set(id, v);
    const vs = [...drivers.get(net).values()].filter((v) => v !== "Z"),
      known = vs.filter((v) => v !== "X");
    const next = !vs.length
      ? "Z"
      : known.length === vs.length && new Set(known).size === 1
        ? known[0]
        : "X";
    const old = netValues.get(net) ?? "X";
    netValues.set(net, next);
    return old !== next;
  };
  graph.pins
    .filter(
      (p) =>
        circuit.components.find((c) => c.id === p.component)?.kind === "INPUT",
    )
    .forEach((p) => drive(p.net, p.component, inputs[p.name] ?? 0));
  const components = circuit.components.filter((c) => c.kind === "GATE");
  let stable = false;
  for (let pass = 0; pass < components.length + 5; pass++) {
    let changed = false;
    for (const c of components) {
      const pp = graph.pins.filter((p) => p.component === c.id),
        ins = {};
      if (!pp.some((p) => p.direction === 2)) {
        if (!pp.length) warnings.add(`${c.symbol}: 시뮬레이션 모델 미지원`);
        continue;
      }
      for (const p of pp.filter((p) => p.direction === 1)) {
        ins[p.name] = netValues.get(p.net) ?? "X";
        if (p.bubble && c.symbol.startsWith("PRIMITIVE/"))
          ins[p.name] = invert(ins[p.name]);
      }
      for (const n of c.portBubbles || [])
        if (n in ins) ins[n] = invert(ins[n]);
      const type = c.symbol.split("/").at(-1),
        path = (options.path || "") + c.id;
      let outputs = primitive(type, ins, state, clocks, path);
      if (!outputs) {
        const sub = data.circuits[type] || data.models?.[c.symbol];
        if (sub && (options.depth || 0) < 24) {
          const r = simulate(sub, data, ins, {
            depth: (options.depth || 0) + 1,
            path: path + "/",
            state,
            clocks,
            graph: sub._graph,
          });
          outputs = r.outputs;
          r.warnings.forEach((w) => warnings.add(w));
          Object.assign(pending, r.pending);
        } else {
          warnings.add(`${type}: 시뮬레이션 모델 미지원`);
          outputs = {};
        }
      }
      if (outputs._clock !== undefined)
        pending[path] = { clock: outputs._clock, state: outputs._state };
      for (const p of pp.filter((p) => p.direction === 2)) {
        let v = outputs[p.name] ?? outputs._value ?? "X";
        if ((c.portBubbles || []).includes(p.name)) v = invert(v);
        changed = drive(p.net, c.id + ":" + p.name, v) || changed;
      }
    }
    if (!changed) {
      stable = true;
      break;
    }
  }
  if (!stable)
    warnings.add("회로가 안정화되지 않았습니다. 피드백 배선을 확인하세요.");
  for (const [net, p] of graph.nets) {
    if (!drivers.has(net) && p.some((p) => p.direction === 1))
      warnings.add("연결되지 않은 입력 핀이 있습니다 (X).");
    if ((drivers.get(net)?.size || 0) > 1)
      warnings.add("하나의 배선에 여러 출력이 연결되어 있습니다.");
  }
  const outputs = {};
  for (const c of circuit.components.filter((c) => c.kind === "OUTPUT"))
    outputs[c.name] = netValues.get(graph.root([c.x, c.y])) ?? "X";
  return { outputs, netValues, graph, warnings: [...warnings], pending };
}
