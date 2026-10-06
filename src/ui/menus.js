const menus = {
  file: [
    ["new", "새 회로", "Ctrl+N"],
    ["import", "회로 열기", "Ctrl+O"],
    ["save", "회로 저장", "Ctrl+S"],
    ["svg", "도면 SVG 내보내기", ""],
    ["csv", "진리표 CSV 내보내기", ""],
  ],
  edit: [
    ["undo", "실행 취소", "Ctrl+Z"],
    ["redo", "다시 실행", "Ctrl+Y"],
    ["duplicate", "선택 부품 복제", "Ctrl+D"],
    ["rotate", "90° 회전", "R"],
    ["delete", "삭제", "Delete"],
  ],
  view: [
    ["fit", "회로 전체 보기", "F"],
    ["zoomin", "확대", "+"],
    ["zoomout", "축소", "−"],
    ["grid", "격자 표시 / 숨기기", ""],
  ],
  draw: [
    ["mode:select", "선택 및 이동", "V"],
    ["mode:wire", "배선", "W"],
    ["mode:INPUT", "입력 포트", ""],
    ["mode:OUTPUT", "출력 포트", ""],
  ],
  simulate: [
    ["run", "실행 / 일시 정지", "Space"],
    ["step", "한 단계 실행", ""],
    ["reset", "초기화", ""],
    ["stimulus", "입력 CLOCK 설정", ""],
  ],
};
Object.assign(menus, {
  shape: [
    ["rotateleft", "Rotate Left · 왼쪽 회전", "L"],
    ["rotate", "Rotate Right · 오른쪽 회전", "R"],
    ["flipv", "Flip Vertical · 상하 대칭", "Y"],
    ["fliph", "Flip Horizontal · 좌우 대칭", "X"],
  ],
  layout: [
    ["alignleft", "Align Left · 왼쪽 정렬", "Ctrl+←"],
    ["alignright", "Align Right · 오른쪽 정렬", "Ctrl+→"],
    ["aligntop", "Align Top · 위쪽 정렬", "Ctrl+↑"],
    ["alignbottom", "Align Bottom · 아래쪽 정렬", "Ctrl+↓"],
    ["spaceacross", "Space Across · 가로 간격", "Alt+→"],
    ["spacedown", "Space Down · 세로 간격", "Alt+↑"],
  ],
  window: [
    ["examples", "Open Schematic · 실습 회로", ""],
    ["properties", "Properties · 속성", "Alt+Enter"],
    ["fit", "Whole Page · 전체 보기", "Home"],
  ],
});
menus.file.push(
  ["mfft", "MyLogic schematic 저장", ""],
  ["verilog", "Verilog 내보내기", ""],
  ["vhdl", "VHDL 내보내기", ""],
  ["edif", "EDIF200 내보내기", ""],
  ["vcd", "파형 VCD 내보내기", ""],
);
menus.draw.push(
  ["mode:FIG_Line", "Figure · 선", ""],
  ["mode:FIG_Rect", "Figure · 사각형", ""],
  ["mode:FIG_Circle", "Figure · 원", ""],
  ["mode:FIG_Arc", "Figure · 원호", ""],
  ["mode:FIG_Text", "Figure · 문자", "T"],
);
menus.simulate.push(["makesymbol", "Make Symbol · 심벌 제작", "Ctrl+M"]);
menus.edit.splice(
  2,
  0,
  ["cut", "Cut · 잘라내기", "Ctrl+X"],
  ["copy", "Copy · 부품 복사", "Ctrl+C"],
  ["paste", "Paste · 부품 붙여넣기", "Ctrl+V"],
  ["selectall", "Select All · 전체 선택", "Ctrl+A"],
  ["find", "Find · 부품 검색", "Ctrl+F"],
);
menus.simulate.unshift(["check", "Check Circuit · 회로 검사", "Ctrl+E"]);
menus.simulate[1] = ["run", "Simulator · 실행 / 일시 정지", "F5"];

export { menus };
