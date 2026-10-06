export function parseStimulus(text, names) {
  const s = { maxTime: 1000, clocks: {}, events: {}, vectors: {}, watch: [] };
  text = text.replace(/^\[[^\]]*\]/, "").replace(/\/\/[^\n]*/g, "");
  const exists = (n) => {
    if (!names.includes(n)) throw Error("존재하지 않는 입력: " + n);
  };
  for (const line of text
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    let m;
    if ((m = line.match(/^MAX_TIME\s+(\d+)$/i))) {
      s.maxTime = +m[1];
      continue;
    }
    if (
      (m = line.match(
        /^CLOCK\s+(\S+)\s+FROM\s*:\s*(\d+)\s+TO\s*:\s*(\d+)\s+STEPSIZE\s*:\s*(\d+)\s+([01XZ\s]+)$/i,
      ))
    ) {
      exists(m[1]);
      const v = {
        start: +m[2],
        end: +m[3],
        step: +m[4],
        values: m[5]
          .trim()
          .toUpperCase()
          .split(/\s+/)
          .map((v) => (/[01]/.test(v) ? +v : v)),
      };
      if (!v.step || v.end < v.start)
        throw Error("CLOCK 시간 범위를 확인하세요.");
      s.clocks[m[1]] = v;
      continue;
    }
    if ((m = line.match(/^GEN\s+(\S+)\s+(.+)$/i))) {
      exists(m[1]);
      const events = m[2]
        .trim()
        .toUpperCase()
        .split(/[\s,]+/)
        .map((e) => {
          const p = e.match(/^([01XZ])@(\d+)$/);
          if (!p) throw Error("GEN 문법: 0@0 1@10 X@100");
          return { time: +p[2], value: /[01]/.test(p[1]) ? +p[1] : p[1] };
        });
      s.events[m[1]] = [...(s.events[m[1]] || []), ...events].sort(
        (a, b) => a.time - b.time,
      );
      continue;
    }
    if ((m = line.match(/^VECTOR\s+(\S+)\s+(.+)$/i))) {
      s.vectors[m[1]] = m[2].trim().split(/\s+/);
      continue;
    }
    if ((m = line.match(/^WATCH\s+(.+)$/i))) {
      s.watch = m[1].trim().split(/\s+/);
      continue;
    }
    throw Error("지원하지 않거나 잘못된 입력 문법: " + line);
  }
  if (s.maxTime < 1) throw Error("MAX_TIME은 1 이상이어야 합니다.");
  return s;
}
export function stimulusAt(s, time, previous = {}) {
  const inputs = { ...previous };
  for (const [n, c] of Object.entries(s.clocks)) {
    if (time >= c.start && time <= c.end)
      inputs[n] =
        c.values[Math.floor((time - c.start) / c.step) % c.values.length];
  }
  for (const [n, ev] of Object.entries(s.events)) {
    const applicable = ev.filter((e) => e.time <= time).at(-1);
    if (applicable) {
      const clock = s.clocks[n],
        lastClock =
          clock && time >= clock.start && time <= clock.end
            ? clock.start +
              Math.floor((time - clock.start) / clock.step) * clock.step
            : -1;
      if (applicable.time >= lastClock) inputs[n] = applicable.value;
    }
  }
  return inputs;
}
