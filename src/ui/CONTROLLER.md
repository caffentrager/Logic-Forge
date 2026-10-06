# UI controller 분리 계획과 1단계 결과

## 현재 책임

| 위치 | 책임 |
|---|---|
| `state/history.js` | 회로 JSON snapshot, undo/redo 스택, 새 편집 시 redo 폐기. DOM·저장소·시뮬레이터에 의존하지 않음. |
| `interaction/keyboard.js` | keydown 등록/해제, modifier와 단축키 매핑, 입력 필드/modal 보호, 기본 브라우저 동작 취소. 회로를 직접 변경하지 않고 주입된 명령을 호출. |
| `app.js` | 부팅과 모듈 연결; 회로·선택·도구·view 상태; 편집 명령; pointer·배선; 시뮬레이션 session; 파일·modal; 패널 렌더링과 자동 저장. |
| `render/` | 기존 심벌·부품·도형·신호 SVG 생성. 이번에 변경하지 않음. |

## 작은 단계로 나누는 순서

1. **완료:** 독립적인 회로 history와 keyboard routing을 분리. 일반 snapshot, drag 기록, undo/redo 연결 및 keyboard guard를 검사.
2. **다음 제안:** simulation session의 reset/evaluate/record를 분리. state·clocks·time·파형 history를 하나의 책임으로 묶되 편집 history와 구분. 현재 commit의 inputs 유지, run 정지 정책, stimulus 처리 순서는 변경하지 않음. 순차 회로와 입력 패턴의 복원 테스트부터 추가.
3. 편집 명령이 circuit을 변경하고 controller가 commit하는 경계를 정리. 선택·삭제·변환을 작은 단위로 이동.
4. pointer와 wiring을 분리. 좌표 변환·snap·drag의 시작/종료·취소를 실제 브라우저에서 확인.
5. 파일/modal 및 properties/signals/waveform 패널을 각각 분리.

후속 단계는 이번 작업에 포함하지 않음. 전체 상태를 거대한 context로 넘기거나 전면 rewrite하지 않으며, 각 단계마다 필요한 데이터와 callback만 전달.

## 보존한 동작

- 일반 snapshot은 push 후 60개를 넘으면 한 개를 제거. 기존 drag 기록에는 이 제한을 적용하지 않았으므로 별도 `recordDrag`로 그대로 보존.
- undo/redo 스택에는 기존과 같이 circuit만 저장. inputs·stimulus·custom library·dirty 정책을 새로 정의하지 않음.
- 복원 순서: 스택 유무 검사 → stop → 현재 circuit을 반대 스택에 기록/복원 → selection 해제 → commit. commit의 compile·simulation 초기화·persist·refresh 순서는 그대로 유지.
- Escape는 기존과 같이 select 모드로 전환하고 selection/selectedIds를 비운 뒤 refresh. 다른 key/modifier와 preventDefault 위치도 유지.
- MFFT·LogicForge-2·localStorage 키·compat 배포 URL·회귀 baseline은 변경하지 않음.

## 검증과 안정성 평가

분리 전 기존 UI/릴리스 회귀 32개가 통과. 분리 후 동일 기준에 더해 snapshot 독립성·redo 분기 폐기·60개 제한·drag 기록·keyboard guard/modifier/해제를 검사. 실제 controller 통합 검사에서 실행 중 undo/redo의 stop-before-persist와 시간축 초기화도 확인.

1단계 완료 검사: `node scripts/check.mjs` (48개 모듈), `node scripts/build-data.mjs` (600 심벌·10 회로·523 모델), `node scripts/build.mjs`, `node --test tests/*.test.mjs` (61개 통과). 회귀 fixture와 데이터 번들 변경 없음.

이 단계는 외부 동작 변경 없이 책임 두 개만 이동했으므로 다음 작은 분리를 시작할 기반이 됨. 단, Node DOM host는 실제 브라우저 layout·pointer·파일 chooser 검증을 대체하지 않음. simulation/pointer 후속 단계에서 해당 검증을 확대해야 함.
