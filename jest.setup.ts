function createStorageMock() {
  let storage: Record<string, string> = {};
  return {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => {
      storage[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      storage = {};
    },
    key: (index: number) => Object.keys(storage)[index] ?? null,
    get length() {
      return Object.keys(storage).length;
    },
  };
}

const mockSessionStorage = createStorageMock();
const mockLocalStorage = createStorageMock();

if (typeof window === "undefined") {
  (globalThis as any).window = {
    location: { pathname: "/", search: "", hash: "" },
    history: { pushState: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    sessionStorage: mockSessionStorage,
    localStorage: mockLocalStorage,
  };
}

if (!globalThis.sessionStorage) {
  (globalThis as any).sessionStorage = mockSessionStorage;
}

if (!globalThis.localStorage) {
  (globalThis as any).localStorage = mockLocalStorage;
}
