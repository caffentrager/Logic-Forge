export function expression(g, language) {
  const v = (p) =>
      p.inverse ? (language === "vhdl" ? "not " + p.net : "~" + p.net) : p.net,
    all = Object.entries(g.inputs),
    b = Number(g.type.match(/B(\d+)/)?.[1] || 0),
    args = all.map(([n, p]) => {
      const neg = /^I\d+$/.test(n) && +n.slice(1) < b;
      return v({ ...p, inverse: p.inverse !== neg });
    });
  const base = g.type.replace(/\d.*$/, "");
  let e;
  if (["AND", "NAND", "OR", "NOR", "XOR", "XNOR"].includes(base)) {
    const op = base.includes("AND")
      ? "and"
      : base.includes("XOR")
        ? "xor"
        : "or";
    e =
      "(" +
      args.join(
        language === "vhdl"
          ? ` ${op} `
          : ` ${{ and: "&", or: "|", xor: "^" }[op]} `,
      ) +
      ")";
    if (["NAND", "NOR", "XNOR"].includes(base))
      e = (language === "vhdl" ? "not " : "~") + e;
  } else if (/^(VCC|PULLUP)$/.test(g.type))
    e = language === "vhdl" ? "'1'" : "1'b1";
  else if (/^(GND|PULLDOWN)$/.test(g.type))
    e = language === "vhdl" ? "'0'" : "1'b0";
  else if (/^(INV|NOT|IV)$/.test(g.type))
    e = (language === "vhdl" ? "not " : "~") + args[0];
  else if (/^BUF|^[IO]BUF|^IDENTITY/.test(g.type)) e = args[0];
  else if (/^MUX[248]$|^M[248]_1$/.test(g.type)) {
    const ss = all.filter(([n]) => /^S\d*$/.test(n)).sort(),
      width = ss.length,
      ds = Array.from(
        { length: 2 ** width },
        (_, i) =>
          g.inputs["I" + i] || g.inputs["D" + i] || g.inputs["IN" + (i + 1)],
      );
    if (ds.some((p) => !p)) throw Error("MUX 데이터 핀이 없습니다.");
    e = v(ds.at(-1));
    for (let i = ds.length - 2; i >= 0; i--) {
      const condition = ss
        .map(([, p], j) =>
          language === "vhdl"
            ? `${v(p)} = '${(i >> j) & 1}'`
            : `${v(p)} == 1'b${(i >> j) & 1}`,
        )
        .join(language === "vhdl" ? " and " : " && ");
      e =
        language === "vhdl"
          ? `${v(ds[i])} when ${condition} else ${e}`
          : `(${condition} ? ${v(ds[i])} : ${e})`;
    }
  } else return null;
  return e;
}
