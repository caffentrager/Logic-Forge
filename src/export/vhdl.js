import { flattenCircuit } from "./flatten.js";
import { expression } from "./expression.js";
export function exportVHDL(circuit, data) {
  const m = flattenCircuit(circuit, data),
    sequential = m.gates.filter((g) => expression(g, "vhdl") === null);
  const lines = [
    "library ieee;",
    "use ieee.std_logic_1164.all;",
    `entity ${m.name} is`,
    m.ports.length
      ? `  port (${m.ports.map((p) => `${p.name}: ${p.direction === "INPUT" ? "in" : "out"} std_logic`).join("; ")});`
      : "",
    `end ${m.name};`,
    `architecture structural of ${m.name} is`,
    ...m.nets.map((n) => `  signal ${n}: std_logic;`),
    ...sequential.map((g) => `  signal q_${g.name}: std_logic := '0';`),
    "begin",
  ];
  const ref = (p) => (p.inverse ? "(not " + p.net + ")" : p.net);
  for (const [a, b] of m.assignments)
    lines.push(`  ${a} <= ${typeof b === "string" ? b : ref(b)};`);
  for (const g of m.gates) {
    const e = expression(g, "vhdl");
    if (e !== null) {
      for (const p of Object.values(g.outputs)) {
        if (p.inverse && e.includes(" when "))
          throw Error("VHDL: MUX 출력에 별도 인버터를 배치하세요.");
        lines.push(`  ${p.net} <= ${p.inverse ? "not (" + e + ")" : e};`);
      }
      continue;
    }
    const q = "q_" + g.name,
      ins = g.inputs,
      clk = ins.C || ins.CK || ins.CLK,
      d = ins.D;
    if (!clk || !d) throw Error("D/클록 핀이 없는 순차 소자: " + g.type);
    if (clk.inverse) throw Error("반전 클록에 별도 인버터를 배치하세요.");
    const ar = ins.CLR,
      as = ins.PRE,
      en = ins.CE || ins.EN;
    lines.push(
      `  ${g.name}: process(${[clk.net, ar?.net, as?.net].filter(Boolean).join(", ")}) begin`,
    );
    if (ar) lines.push(`    if ${ref(ar)} = '1' then ${q} <= '0';`);
    if (as)
      lines.push(`    ${ar ? "els" : ""}if ${ref(as)} = '1' then ${q} <= '1';`);
    lines.push(`    ${ar || as ? "els" : ""}if rising_edge(${clk.net}) then`);
    if (ins.R) lines.push(`      if ${ref(ins.R)} = '1' then ${q} <= '0';`);
    if (ins.S)
      lines.push(
        `      ${ins.R ? "els" : ""}if ${ref(ins.S)} = '1' then ${q} <= '1';`,
      );
    if (en)
      lines.push(
        `      ${ins.R || ins.S ? "els" : ""}if ${ref(en)} = '1' then ${q} <= ${ref(d)};`,
      );
    else lines.push(`      ${ins.R || ins.S ? "else " : ""}${q} <= ${ref(d)};`);
    if (en || ins.R || ins.S) lines.push("      end if;");
    lines.push("    end if;", "  end process;");
    for (const [name, p] of Object.entries(g.outputs))
      lines.push(
        `  ${p.net} <= ${p.inverse !== (name === "QB") ? "not " : ""}${q};`,
      );
  }
  lines.push("end structural;");
  return lines.filter(Boolean).join("\n") + "\n";
}
