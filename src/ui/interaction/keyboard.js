// Keyboard routing only; document changes stay in controller actions.
export function registerKeyboard(
  document,
  { actions, isModalOpen, setMode, clearSelection, fit },
) {
  const onKeyDown = (e) => {
    if (
      ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) ||
      isModalOpen()
    )
      return;
    const k = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey) {
      const a = {
        s: "save",
        o: "import",
        n: "new",
        z: e.shiftKey ? "redo" : "undo",
        y: "redo",
        d: "duplicate",
        a: "selectall",
        c: "copy",
        v: "paste",
        x: "cut",
        f: "find",
        e: "check",
        m: "makesymbol",
        arrowleft: "alignleft",
        arrowright: "alignright",
        arrowup: "aligntop",
        arrowdown: "alignbottom",
      }[k];
      if (a) {
        e.preventDefault();
        actions[a]();
      }
      return;
    }
    if (e.altKey) {
      const a = {
        arrowright: "spaceacross",
        arrowup: "spacedown",
        enter: "properties",
      }[k];
      if (a) {
        e.preventDefault();
        actions[a]();
        return;
      }
    }
    if (k === "escape") {
      clearSelection();
    } else if (k === "v") setMode("select");
    else if (k === "w" || k === "n") setMode("wire");
    else if (k === "t") setMode("FIG_Text");
    else if (k === "r") actions.rotate();
    else if (k === "l") actions.rotateleft();
    else if (k === "x") actions.fliph();
    else if (k === "y") actions.flipv();
    else if (k === "f" || k === "home") fit();
    else if (k === "delete" || k === "backspace") {
      e.preventDefault();
      actions.delete();
    } else if (k === " " || k === "f5") {
      e.preventDefault();
      actions.run();
    } else if (k === "+" || k === "=") actions.zoomin();
    else if (k === "-") actions.zoomout();
  };
  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}
