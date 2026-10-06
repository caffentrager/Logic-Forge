# Regression fixtures

`release-2.0-baseline.json` was captured **before** the module extraction from commit `31c11476cdea866cc313083530f07dfa3196708a`.

It freezes the bundled data hash/statistics, complete truth tables for all 10 exercises, hashes or errors for 40 schematic/Verilog/VHDL/EDIF exports, SVG hashes for all 600 original symbols, component/figure rendering cases, and menu actions/labels/shortcuts/order. Expected values are independent of the refactored implementation. They include the original FND digit-7 behavior.

`my-sim-recordings.json` contains the provided original MySim text recordings. The engine suite compares recorded output signals with web simulation, without needing the original installation.

Do not regenerate expected values during build or tests. To change an expectation intentionally, identify its exact old and new behavior, add a reproduction test, review the difference, and update only the affected fixture entry. For a new baseline, capture it from the explicitly reviewed reference release, record its commit and provenance here, and retain the old compatibility cases where applicable.

Golden file output checks preserve this release's output; they are **not** a substitute for native MyLogic reopening or external HDL compiler checks. Controller tests use a small Node DOM/event host. They do not verify actual browser layout, native downloads/file choosers, or drag event delivery.
