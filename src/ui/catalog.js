export const names = {
  HA: "반가산기",
  FA: "전가산기",
  FA2: "전가산기 · 게이트 구성",
  DA: "가산기 실습",
  ADDER2BIT: "2비트 가산기",
  ADDER4BIT: "4비트 가산기",
  XOR3_PARITY: "3입력 패리티",
  FND: "7세그먼트 디코더",
  FND16: "16진수 디코더",
  "2024100035_1006": "FND 실습 회로",
};
export const description = (t) =>
  t.startsWith("AND")
    ? "논리곱 게이트"
    : t.startsWith("OR")
      ? "논리합 게이트"
      : t.startsWith("XOR")
        ? "배타적 논리합"
        : t.startsWith("NAND")
          ? "부정 논리곱"
          : t.startsWith("NOR")
            ? "부정 논리합"
            : t.startsWith("XNOR")
              ? "배타적 부정 논리합"
              : /^FD|DFF/.test(t)
                ? "D 플립플롭"
                : names[t] || "원본 라이브러리 심벌";
export const basic = [
  "AND2",
  "OR2",
  "XOR2",
  "INV",
  "NAND2",
  "NOR2",
  "XNOR2",
  "BUF",
  "AND3",
  "OR3",
  "AND4",
  "OR4",
  "AND2B1",
  "AND3B2",
  "MUX2",
  "FD",
  "FDC",
  "VCC",
  "GND",
];
