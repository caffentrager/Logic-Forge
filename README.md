# Logic Forge

MyLogic SV5.1의 실습 회로와 심벌을 브라우저에서 편집하고 시뮬레이션하는 웹 CAD입니다. 서버나 계정 없이 로컬에서 실행할 수 있습니다.

## 실행

Windows: `start-web.cmd`를 더블클릭합니다. Node.js가 설치되어 있어야 합니다. Codex 환경에서는 번들 Node.js도 자동으로 찾습니다.

```sh
git clone https://github.com/caffentrager/Logic-Forge.git
cd Logic-Forge
node server.mjs
```

http://127.0.0.1:5173 에 접속합니다. Node.js 22 이상을 사용합니다. 외부 의존성이 없어 npm install은 필요하지 않습니다. 서버가 시작할 때 `src/`와 `assets/`로부터 `dist/`를 생성합니다. 정적 배포는 `node scripts/build.mjs`로 생성한 `dist/`를 사용합니다. `dist/`를 직접 수정하지 않습니다.

비공개 웹 배포: https://mylogic-web.winterisgod0101.chatgpt.site

## 구현 기능

- 원본 심벌 600개, 실습 회로 10개, 라이브러리 넷리스트 523개를 번들로 포함합니다. 원본 실행 파일은 포함하지 않습니다.
- 원본의 File/Edit/View/Add/Shape/Layout/Tools/Window 메뉴 구성과 주요 단축키를 제공합니다.
- 부품 검색·배치, 이동, 다중 선택, 회전·대칭, 정렬·간격, 배선·분기, 삭제, 실행 취소·다시 실행.
- 선·사각형·원·원호·문자 편집. 선택 부품과 내부 배선 복사·붙여넣기.
- Make Symbol로 현재 회로를 사용자 계층 부품으로 제작. 사용자 심벌과 내부 회로를 JSON 파일에 함께 저장.
- 0/1/X/Z 신호, 조합 논리, D/JK/T 플립플롭, 기본 래치·레지스터·메모리·3상 버퍼 및 해석 가능한 계층 모델의 시뮬레이션.
- 입력 스위치, Step/Run, 파형, VECTOR 표시, WATCH 필터, 진리표(입력 10개 이하), 배선 검사, 7세그먼트 표시.
- `CLOCK`, `GEN`, `VECTOR`, `WATCH`, `MAX_TIME` 입력 패턴과 STIM.STM 가져오기·내보내기. 이벤트 시간으로 이동합니다.
- JSON 회로, 원본 MFFT schematic 가져오기·내보내기, 심벌 가져오기·내보내기, SVG 도면, CSV 진리표, VCD 파형.
- 지원되는 논리 모델의 Verilog/VHDL 및 일반 EDIF200 구조 넷리스트 내보내기. 계층 회로는 평탄화합니다.
- 브라우저 자동 저장. 작은 화면에서 **입출력** 버튼으로 속성 패널을 엽니다.

## 조작

| 키 | 동작 |
|---|---|
| V / W 또는 N | 선택 / 배선 |
| L / R / X / Y | 회전 / 대칭 |
| T / Ctrl+M | 문자 / 심벌 제작 |
| Shift+클릭 / Ctrl+A | 다중 선택 / 전체 부품 선택 |
| Ctrl+C / V / X | 복사 / 붙여넣기 / 잘라내기 |
| Ctrl+Z / Y | 실행 취소 / 다시 실행 |
| Ctrl+S / O | 저장 / 열기 |
| Home 또는 F / F5 | 전체 보기 / 실행·일시 정지 |
| Delete / Esc | 삭제 / 도구 종료 |

배선은 시작 핀 → 경유점 → 도착 핀 순으로 클릭합니다. 기존 배선에 연결해 분기할 수 있고, 빈 위치에서 더블클릭하면 배선을 끝냅니다. 계층 실습 부품을 더블클릭하면 내부 도면을 엽니다. 빈 도면 드래그 또는 Alt+드래그로 이동하고 마우스 휠로 확대합니다.

## 검증

```sh
node scripts/check.mjs
node scripts/build-data.mjs
node scripts/build.mjs
node --test tests/*.test.mjs
```

GitHub Actions가 Linux와 Windows에서 푸시마다 문법·데이터 빌드·전체 테스트를 실행합니다. 테스트는 원본 MyLogic 설치나 브라우저 설치 없이 실행됩니다. npm이 있다면 `npm run check`, `npm run build`, `npm test`를 사용해도 됩니다. `npm run test:regression`은 릴리스 기준·빌드·저장소·편집·UI controller 회귀 검사를 실행합니다.

기존 17개 논리·파일 검사를 유지하고, 리팩터링 전 릴리스의 실습 10개 진리표·40개 파일 출력·심벌 600개 SVG·메뉴·렌더링 결과를 고정 기준으로 비교합니다. 입력 스위치, 복사/붙여넣기, undo/redo, 문자 편집, JSON 저장, 15 ns GEN 이벤트와 VECTOR/WATCH, 회로 전환은 실제 UI controller를 Node DOM/event host에서 실행해 검사합니다. clean build와 예전 배포 모듈 URL, 저장 키 fallback도 검사합니다. 기준값은 테스트 실행 중 재생성하지 않습니다. 자세한 출처는 [회귀 데이터 설명](tests/fixtures/README.md)에 있습니다.

Node DOM host는 실제 브라우저 layout·file chooser·다운로드 검증을 대체하지 않습니다. 후속 검증과 큰 기능의 순서는 [ROADMAP.md](ROADMAP.md)에 정리했습니다. 이번 리팩터링은 입력 스위치 뒤 발생하던 잘못된 변수 참조 예외 하나를 제거했으며, 기존 입출력·시간 증가 방식은 유지합니다.

## 호환 범위

실습용 회로 편집·논리 시뮬레이션을 재현한 버전입니다. 원본 MyLogic 전체 제품과 동일한 버전은 아닙니다. 523개 넷리스트를 읽지만 모든 라이브러리 소자의 동작이 검증되거나 지원되는 것은 아닙니다. 미지원 모델, 부동 입력, 충돌은 X와 진단으로 표시합니다. 진리표는 조합 논리용입니다.

MySim의 실제 게이트 지연·타이밍 검사, 다비트 물리 버스, SPICE 아날로그 해석, FPGA 소자별 매핑·배치·배선·비트스트림 생성은 포함하지 않습니다. Verilog/VHDL은 구조 내보내기이며 외부 컴파일러로 검증하지 않았습니다. EDIF는 범용 논리 셀 정의를 사용하며 FPGA 공급업체 전용 넷리스트를 보장하지 않습니다. MFFT 저장은 앱 내 왕복 검증을 통과했으나 원본 Windows 프로그램에서 다시 여는 검증은 완료하지 못했습니다. 원본의 FND 숫자 7 회로에서 F 세그먼트가 켜지는 동작은 그대로 유지합니다.

## 데이터와 소스

- `src/core/`: MFFT 파서, 배선 연결, 기본 소자, 시뮬레이터, 진리표. `engine.js`는 공개 API입니다.
- `src/editor/`: 배선이 붙은 부품 이동·회전·정렬, 클립보드.
- `src/simulation/`, `src/formats/`: 입력 패턴, 원본 파일·심벌, VCD.
- `src/export/`: 계층 평탄화, Verilog/VHDL/EDIF.
- `src/storage/`: 저장 형식과 localStorage 호환.
- `src/ui/`: DOM 이벤트·편집 상태를 연결하는 `app.js`, 메뉴, 설명, HTML/CSS, SVG 렌더러.
- `src/compat/`: 예전 배포 URL을 유지하는 진입점. 빌드 시 `dist/` 루트에 배치됩니다.
- `assets/data.json`: 원본 데이터 번들. `tests/fixtures/`: 원본 시뮬레이션 기록과 리팩터링 전 기준값.
- `scripts/build-data.mjs`, `build.mjs`, `check.mjs`: 데이터 재생성, 배포 결과 생성, 전체 JS 문법 검사.

core/editor/formats/export 모듈은 DOM에 의존하지 않습니다. UI renderer는 필요한 편집 상태를 인자로 받고, UI controller가 기존 이벤트 순서·undo·시뮬레이션 상태를 관리합니다. controller의 추가 분리는 다음 단계이며 새로운 기능과 함께 한꺼번에 바꾸지 않습니다.

원본이 `../MyLogic`, `../MyLogicSV51`에 있다면 `node scripts/build-data.mjs`로 `assets/data.json`을 재생성합니다. 다른 위치는 `node scripts/build-data.mjs <원본 폴더>`로 지정합니다. 원본이 없으면 포함된 `assets/data.json`을 사용합니다. 이후 `node scripts/build.mjs`로 배포 결과를 만듭니다. CP949/EUC-KR 원본과 UTF-8 저장 파일을 읽습니다.

원본 MyLogic 라이브러리 심벌·넷리스트와 실습 데이터는 사용자가 제공한 파일에서 추출했습니다. 해당 데이터의 권리는 원 저작권자에게 있으며, 이 저장소는 그 데이터에 대한 재배포 라이선스를 부여하지 않습니다. 저장소는 비공개로 생성했습니다.
