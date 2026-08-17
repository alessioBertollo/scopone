import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Il dominio è TypeScript puro: nessun bisogno di jsdom o del runtime React Native.
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts'],
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
