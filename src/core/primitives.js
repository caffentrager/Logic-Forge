export const invert = (v) => (v === 0 ? 1 : v === 1 ? 0 : "X");
export function primitive(type, ins, state = {}, clockState = {}, path = "") {
  const entries = Object.entries(ins),
    list = entries
      .filter(([k]) => !["CE", "C", "CLK", "R", "S", "CLR", "PRE"].includes(k))
      .map(([, v]) => v),
    b = Number(type.match(/B(\d+)/)?.[1] || 0);
  const args = entries.map(([n, v]) =>
    /^I\d+$/.test(n) && Number(n.slice(1)) < b ? invert(v) : v,
  );
  let v = "X";
  if (/^(AND|NAND)(\d+)?(B\d+)?$/.test(type))
    v = args.includes(0) ? 0 : args.every((a) => a === 1) ? 1 : "X";
  else if (/^(OR|NOR)(\d+)?(B\d+)?$/.test(type))
    v = args.includes(1) ? 1 : args.every((a) => a === 0) ? 0 : "X";
  else if (/^(XOR|XNOR)(\d+)?(B\d+)?$/.test(type))
    v = args.some((a) => a !== "0" && a !== 0 && a !== 1)
      ? "X"
      : args.reduce((a, b) => a ^ b, 0);
  else if (/^(INV|NOT|IV)$/.test(type)) v = invert(list[0]);
  else if (/^(BUF|IBUF|OBUF|BUFG|IDENTITY)$/.test(type)) v = list[0] ?? "X";
  else if (/^(VCC|PULLUP)$/.test(type)) v = 1;
  else if (/^(GND|PULLDOWN)$/.test(type)) v = 0;
  else if (/^MUX[2348]$/.test(type) || /^M[248]_1$/.test(type)) {
    const select = Object.entries(ins)
      .filter(([n]) => /^S\d*$/.test(n))
      .sort()
      .map(([, v]) => v);
    if (!select.includes("X")) {
      const index = select.reduce((s, v, i) => s + (v << i), 0);
      v =
        ins["I" + index] ?? ins["D" + index] ?? ins["IN" + (index + 1)] ?? "X";
    }
  } else if (/^(TRI|BUFT|OBUFT|IBUFT)$/.test(type)) {
    const enable =
      ins.EN ?? ins.ENB ?? (ins.T === undefined ? "X" : invert(ins.T));
    v = enable === 1 ? (ins.IN ?? ins.I ?? "X") : enable === 0 ? "Z" : "X";
  } else if (/^(CMPRATOR|COMPARATOR)$/.test(type)) {
    const a = ins.INA ?? ins.A,
      b = ins.INB ?? ins.B;
    const known = typeof a === "number" && typeof b === "number";
    return {
      AGTB: known ? +(a > b) : "X",
      AEQB: known ? +(a === b) : "X",
      ALTB: known ? +(a < b) : "X",
    };
  } else if (/^LATCH/.test(type) || /^LD(CE|PE|C|P|E)?$/.test(type)) {
    v = state[path] ?? 0;
    const reset = ins.R ?? ins.CLR ?? 0,
      set = ins.S ?? ins.PRE ?? 0;
    if (reset === 1 && set === 1) v = "X";
    else if (reset === 1) v = 0;
    else if (set === 1) v = 1;
    else if ((ins.EN ?? ins.G ?? 0) === 1 && (ins.GE ?? 1) === 1)
      v = ins.D ?? "X";
    return { Q: v, QB: invert(v), _state: v, _clock: 0 };
  } else if (
    /^(G?JKFF|TFF)$/.test(type) ||
    /^FD(C|P|R|S|E|CE|PE|RE|SE)?$/.test(type) ||
    type === "DFF" ||
    /^REG(CKE|RS|RSCOMP|RSCOMP2)?$/.test(type)
  ) {
    const ck = ins.C ?? ins.CLK ?? ins.CK ?? 0,
      rise = (clockState[path] ?? 0) === 0 && ck === 1;
    v = state[path] ?? 0;
    const asyncReset = ins.CLR ?? (/^REG|JKFF/.test(type) ? ins.R : 0) ?? 0,
      asyncSet = ins.PRE ?? (/^REG|JKFF/.test(type) ? ins.S : 0) ?? 0;
    if (asyncReset === 1 && asyncSet === 1) v = "X";
    else if (asyncReset === 1) v = 0;
    else if (asyncSet === 1) v = 1;
    else if (rise && (ins.CE ?? ins.EN ?? 1) === 1) {
      if (ins.R === 1) v = 0;
      else if (ins.S === 1) v = 1;
      else if (/JKFF/.test(type)) {
        const j = ins.J ?? "X",
          k = ins.K ?? "X";
        v =
          j === 0 && k === 0
            ? v
            : j === 1 && k === 0
              ? 1
              : j === 0 && k === 1
                ? 0
                : j === 1 && k === 1
                  ? invert(v)
                  : "X";
      } else if (type === "TFF")
        v = ins.T === 1 ? invert(v) : ins.T === 0 ? v : "X";
      else v = ins.D ?? "X";
    }
    return { O: v, Q: v, QB: invert(v), _clock: ck, _state: v };
  } else if (type === "MEMORY") {
    const memory = { ...(state[path] || {}) };
    if (ins.MR === 1) for (const k of Object.keys(memory)) delete memory[k];
    const a = ins.A;
    if (
      ins.CS === 1 &&
      ins.WE === 1 &&
      Number.isInteger(a) &&
      a >= 0 &&
      a < 65536
    )
      memory[a] = ins.I ?? "X";
    v = ins.CS === 0 ? "Z" : Number.isInteger(a) ? (memory[a] ?? 0) : "X";
    return { T: v, OUT: v, _state: memory, _clock: 0 };
  } else return null;
  if (/^(NAND|NOR|XNOR)/.test(type)) v = invert(v);
  return { O: v, OUT: v, Q: v, _value: v };
}
