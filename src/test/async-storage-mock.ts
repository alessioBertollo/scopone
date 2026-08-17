/**
 * Sostituto in memoria di AsyncStorage, usato solo dai test.
 * Vitest lo rimpiazza al pacchetto vero tramite l'alias in vitest.config.mts,
 * così lo store resta testabile in Node senza il runtime React Native.
 */
const memory = new Map<string, string>()

export function clearMockStorage(): void {
  memory.clear()
}

export function seedMockStorage(key: string, value: string): void {
  memory.set(key, value)
}

export function readMockStorage(key: string): string | undefined {
  return memory.get(key)
}

const AsyncStorage = {
  getItem: async (key: string): Promise<string | null> => memory.get(key) ?? null,
  setItem: async (key: string, value: string): Promise<void> => {
    memory.set(key, value)
  },
  removeItem: async (key: string): Promise<void> => {
    memory.delete(key)
  },
}

export default AsyncStorage
