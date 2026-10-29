// Each caller owns its lease. Finishing an obsolete request cannot finish another.
// Keep this small contract equivalent in both independently runnable frontends.
export function createLoadingStore() {
  const tasks = new Set<symbol>();
  const listeners = new Set<() => void>();
  let pending = false;
  function publish() {
    const next = tasks.size > 0;
    if (next === pending) return;
    pending = next;
    listeners.forEach((listener) => listener());
  }
  return {
    getSnapshot: () => pending,
    getServerSnapshot: () => false,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    begin() {
      const token = Symbol();
      tasks.add(token);
      publish();
      return () => {
        tasks.delete(token);
        publish();
      };
    },
    reset() {
      tasks.clear();
      publish();
    },
  };
}

export type LoadingStore = ReturnType<typeof createLoadingStore>;
