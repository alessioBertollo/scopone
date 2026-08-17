/** Concatena classi Tailwind ignorando i rami disattivati. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
