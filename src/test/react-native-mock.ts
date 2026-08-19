/**
 * Sostituto di `react-native` per i test in Node.
 *
 * Il pacchetto vero è scritto in Flow e il parser di Vitest non lo digerisce,
 * ma diversi moduli non di interfaccia lo importano comunque: `supabase.ts`
 * per `AppState`, `expo-localization` per i moduli nativi. Alias in
 * `vitest.config.mts`, così il finto vive in un posto solo invece che
 * duplicato in ogni file di test.
 */
export const AppState = {
  currentState: 'active' as const,
  addEventListener: () => ({ remove: () => {} }),
}

export const Platform = {
  OS: 'ios' as const,
  select: <T>(scelte: { default?: T }) => scelte.default,
}

export const NativeModules: Record<string, unknown> = {}
