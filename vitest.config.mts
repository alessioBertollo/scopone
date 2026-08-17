import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // Lo store persiste su AsyncStorage, che esiste solo nel runtime React
      // Native: nei test lo sostituiamo con un'implementazione in memoria.
      '@react-native-async-storage/async-storage': fileURLToPath(
        new URL('./src/test/async-storage-mock.ts', import.meta.url),
      ),
    },
  },
  test: {
    // Il dominio è TypeScript puro: nessun bisogno di jsdom o del runtime React Native.
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // `src/store/hooks.ts` è escluso di proposito: è collegamento a React e
      // richiede un renderer, quindi si verifica facendo girare l'app.
      include: ['src/domain/**/*.ts', 'src/store/match-store.ts'],
      exclude: ['src/domain/index.ts'],
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
})
