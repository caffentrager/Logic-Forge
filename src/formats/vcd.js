export function exportVCD(history, signals, name = "Logic Forge") {
  const ids = signals.map((_, i) => "s" + i),
    header = `$version ${name} $end\n$timescale 1ns $end\n$scope module circuit $end\n${signals.map((n, i) => `$var wire 1 ${ids[i]} ${n.replace(/\s+/g, "_")} $end`).join("\n")}\n$upscope $end\n$enddefinitions $end\n`;
  return (
    header +
    history
      .map(
        (s) =>
          `#${s.time}\n` +
          signals
            .map((n, i) => String(s.values[n] ?? "X").toLowerCase() + ids[i])
            .join("\n"),
      )
      .join("\n") +
    "\n"
  );
}
