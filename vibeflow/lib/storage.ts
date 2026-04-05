type Validator<T> = (value: unknown) => value is T;

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class LocalStorageAdapter implements StorageAdapter {
  private getStore() {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  getItem(key: string) {
    const store = this.getStore();
    if (!store) return null;
    try {
      return store.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string) {
    const store = this.getStore();
    if (!store) return;
    try {
      store.setItem(key, value);
    } catch {
      // no-op
    }
  }

  removeItem(key: string) {
    const store = this.getStore();
    if (!store) return;
    try {
      store.removeItem(key);
    } catch {
      // no-op
    }
  }
}

export const storageAdapter: StorageAdapter = new LocalStorageAdapter();

export function readValue(key: string): string | null {
  return storageAdapter.getItem(key);
}

export function writeValue(key: string, value: string) {
  storageAdapter.setItem(key, value);
}

export function removeValue(key: string) {
  storageAdapter.removeItem(key);
}

export function readJSON<T>(key: string, fallback: T, validate?: Validator<T>): T {
  const raw = readValue(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (validate && !validate(parsed)) return fallback;
    return (parsed as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T) {
  writeValue(key, JSON.stringify(value));
}

export function readNumber(key: string, fallback = 0): number {
  const raw = readValue(key);
  if (raw === null) return fallback;
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
}

export function writeNumber(key: string, value: number) {
  writeValue(key, String(value));
}
