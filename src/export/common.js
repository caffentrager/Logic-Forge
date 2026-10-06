export const id = (s) =>
  "n_" +
  String(s)
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
export const gateType = (t) =>
  /^(AND|NAND|OR|NOR|XOR|XNOR)(\d+)?(B\d+)?$/.test(t) ||
  /^(INV|NOT|IV|BUF|IBUF|OBUF|BUFG|IDENTITY|VCC|GND|PULLUP|PULLDOWN)$/.test(
    t,
  ) ||
  /^MUX[248]$|^M[248]_1$/.test(t);
