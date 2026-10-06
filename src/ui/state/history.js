// Circuit snapshots only. Selection, simulation reset and persistence belong
// to the controller, which applies them after restoring a document.
export function createCircuitHistory() {
  const undo = [],
    redo = [];
  return {
    get canUndo() {
      return undo.length > 0;
    },
    get canRedo() {
      return redo.length > 0;
    },
    snapshot(circuit) {
      undo.push(JSON.stringify(circuit));
      if (undo.length > 60) undo.shift();
      redo.length = 0;
    },
    recordDrag(original) {
      // Preserve the original drag path: no 60-entry trimming here.
      undo.push(JSON.stringify(original));
      redo.length = 0;
    },
    undo(circuit) {
      if (!undo.length) return null;
      redo.push(JSON.stringify(circuit));
      return JSON.parse(undo.pop());
    },
    redo(circuit) {
      if (!redo.length) return null;
      undo.push(JSON.stringify(circuit));
      return JSON.parse(redo.pop());
    },
  };
}
