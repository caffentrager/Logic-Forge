// Minimal event/DOM host for exercising the real browser controller in Node.
// Rendering itself is checked against the frozen release markup separately.
export function browserHost(data) {
  const elements = new Map(),
    listeners = new Map(),
    downloads = [],
    values = new Map();
  function element(selector) {
    if (elements.has(selector)) return elements.get(selector);
    const classes = new Set(),
      handlers = new Map();
    const e = {
      innerHTML: "",
      textContent: "",
      value: "",
      clientWidth: 980,
      clientHeight: 500,
      style: {},
      dataset: {},
      hidden: false,
      open: false,
      classList: {
        add: (k) => classes.add(k),
        remove: (k) => classes.delete(k),
        toggle(k, force) {
          const on = force ?? !classes.has(k);
          if (on) classes.add(k);
          else classes.delete(k);
          return on;
        },
      },
      setAttribute() {},
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        bottom: 30,
        right: 980,
      }),
      focus() {},
      click() {},
      setPointerCapture() {},
      addEventListener: (name, handler) => handlers.set(name, handler),
      showModal() {
        e.open = true;
      },
      close() {
        e.open = false;
      },
      createSVGPoint: () => ({
        x: 0,
        y: 0,
        matrixTransform() {
          return { x: this.x, y: this.y };
        },
      }),
      getScreenCTM: () => ({ inverse: () => ({}) }),
      dispatch: (name, event) => handlers.get(name)?.(event),
    };
    elements.set(selector, e);
    return e;
  }
  const document = {
    querySelector: element,
    querySelectorAll: () => [],
    addEventListener: (name, handler) => listeners.set(name, handler),
    createElement() {
      const a = {
        click() {
          downloads.push({ name: a.download, url: a.href });
        },
      };
      return a;
    },
  };
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const originalFetch = globalThis.fetch,
    globals = {
      document,
      localStorage: storage,
      innerWidth: 1440,
      ResizeObserver: class {
        observe() {}
      },
      fetch: async (url) =>
        url === "data.json"
          ? { json: async () => structuredClone(data) }
          : originalFetch(url),
      setTimeout: () => 1,
      clearTimeout() {},
    };
  const originals = new Map(
    Object.keys(globals).map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  return {
    elements,
    downloads,
    storage,
    element,
    install() {
      for (const [key, value] of Object.entries(globals))
        Object.defineProperty(globalThis, key, {
          value,
          writable: true,
          configurable: true,
        });
    },
    restore() {
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
      for (const d of downloads) URL.revokeObjectURL(d.url);
    },
    action(name) {
      listeners.get("click")({
        target: {
          closest: (selector) =>
            selector === "[data-action]" ? { dataset: { action: name } } : null,
        },
      });
    },
    input(name, value) {
      listeners.get("click")({
        target: {
          closest: (selector) =>
            selector === "[data-input]"
              ? { dataset: { input: name, value: String(value) } }
              : null,
        },
      });
    },
    example(name) {
      listeners.get("click")({
        target: {
          closest: (selector) =>
            selector === "[data-example]"
              ? { dataset: { example: name } }
              : null,
        },
      });
    },
    key(key, options = {}) {
      listeners.get("keydown")({
        key,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        target: { tagName: "BODY" },
        preventDefault() {},
        ...options,
      });
    },
    pointer(x, y) {
      element("#canvas").dispatch("pointerdown", {
        button: 0,
        altKey: false,
        clientX: x,
        clientY: y,
        pointerId: 1,
        target: { closest: () => null },
      });
    },
    saved() {
      return JSON.parse(values.get("logic-forge-project"));
    },
  };
}
