import { compile } from "./geometry.js";
import { simulate } from "./simulator.js";
export function truthTable(circuit, data) {
  const inputs = circuit.components
      .filter((c) => c.kind === "INPUT")
      .map((c) => c.name),
    outputs = circuit.components
      .filter((c) => c.kind === "OUTPUT")
      .map((c) => c.name);
  if (inputs.length > 10)
    throw Error("진리표는 입력 10개 이하에서 생성할 수 있습니다.");
  if (inputs.length !== new Set(inputs).size)
    throw Error("입력 이름이 중복됩니다.");
  const graph = compile(circuit, data),
    rows = [];
  for (let v = 0; v < 2 ** inputs.length; v++) {
    const ins = Object.fromEntries(
      inputs.map((n, i) => [n, (v >> (inputs.length - 1 - i)) & 1]),
    );
    rows.push({ ...ins, ...simulate(circuit, data, ins, { graph }).outputs });
  }
  return { inputs, outputs, rows };
}
