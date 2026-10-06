import { flattenCircuit } from "./flatten.js";
import { id } from "./common.js";
export function exportEDIF(circuit, data) {
  const m = flattenCircuit(circuit, data),
    cellTypes = new Map();
  for (const g of m.gates) {
    if (Object.values({ ...g.inputs, ...g.outputs }).some((p) => p.inverse))
      throw Error("EDIF: 반전 핀은 별도 인버터로 배치한 후 내보내세요.");
    const key = id(g.type);
    if (!cellTypes.has(key)) cellTypes.set(key, g);
  }
  const lib = [...cellTypes]
    .map(
      ([key, g]) =>
        `(cell ${key} (cellType GENERIC) (view netlist (viewType NETLIST) (interface ${[...Object.keys(g.inputs).map((n) => `(port ${id(n)} (direction INPUT))`), ...Object.keys(g.outputs).map((n) => `(port ${id(n)} (direction OUTPUT))`)].join(" ")})))`,
    )
    .join("\n");
  const links = new Map(),
    add = (net, p) => {
      if (!links.has(net)) links.set(net, []);
      links.get(net).push(p);
    };
  const aliases = new Map(),
    root = (n) => {
      if (!aliases.has(n)) aliases.set(n, n);
      if (aliases.get(n) !== n) aliases.set(n, root(aliases.get(n)));
      return aliases.get(n);
    };
  for (const [a, b] of m.assignments) {
    if (typeof b !== "string")
      throw Error("EDIF의 반전 별칭을 지원하지 않습니다.");
    aliases.set(root(a), root(b));
  }
  for (const p of m.ports) add(root(p.name), `(portRef ${p.name})`);
  for (const g of m.gates)
    for (const [n, p] of Object.entries({ ...g.inputs, ...g.outputs }))
      add(root(p.net), `(portRef ${id(n)} (instanceRef ${g.name}))`);
  return `(edif ${m.name} (edifVersion 2 0 0) (edifLevel 0) (keywordMap (keywordLevel 0)) (library LogicForge (edifLevel 0) (technology (numberDefinition)) ${lib} (cell ${m.name} (cellType GENERIC) (view netlist (viewType NETLIST) (interface ${m.ports.map((p) => `(port ${p.name} (direction ${p.direction === "INPUT" ? "INPUT" : "OUTPUT"}))`).join(" ")}) (contents ${m.gates.map((g) => `(instance ${g.name} (viewRef netlist (cellRef ${id(g.type)} (libraryRef LogicForge))))`).join(" ")} ${[...links].map(([n, ps]) => `(net ${n} (joined ${ps.join(" ")}))`).join(" ")})))) (design ${m.name} (cellRef ${m.name} (libraryRef LogicForge))))\n`;
}
