// Preserve LogicForge-2 payloads and the original localStorage fallback key.
export function loadLibrary(storage, data) {
  let library = { symbols: {}, circuits: {} };
  try {
    storage = typeof storage === "function" ? storage() : storage;
    library = JSON.parse(storage.getItem("logic-forge-library")) || library;
    Object.assign(data.symbols, library.symbols);
    Object.assign(data.circuits, library.circuits);
  } catch {}
  return library;
}
export function loadProject(storage, initial) {
  let circuit = initial;
  try {
    storage = typeof storage === "function" ? storage() : storage;
    const saved = JSON.parse(
      storage.getItem("logic-forge-project") ||
        storage.getItem("mylogic-web-project"),
    );
    if (saved && Array.isArray(saved.components) && Array.isArray(saved.wires))
      circuit = saved;
  } catch {}
  return circuit;
}
export function saveProject(storage, circuit, stimulusText, library) {
  storage.setItem(
    "logic-forge-project",
    JSON.stringify({ ...circuit, stimulusText }),
  );
  storage.setItem("logic-forge-library", JSON.stringify(library));
}
