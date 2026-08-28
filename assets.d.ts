/**
 * Metro trasforma un'immagine importata in un identificativo del registro
 * degli asset, che `Image` accetta come `source`. Expo dichiara i CSS ma non
 * le immagini, quindi senza questo file un `import` di un PNG non compila.
 *
 * Sta accanto a `expo-env.d.ts` e `nativewind-env.d.ts`, ma a differenza di
 * quelli è scritto a mano e va tenuto: non lo rigenera nessuno.
 */
declare module '*.png' {
  const source: number
  export default source
}
