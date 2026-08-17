/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Deve restare 'class': con 'media' (che è anche il default quando il campo
  // è assente) il runtime web di NativeWind va in errore appena prova a
  // sincronizzare lo schema colori. I colori veri arrivano comunque dalle
  // variabili CSS in global.css.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        sunken: 'rgb(var(--color-surface-sunken) / <alpha-value>)',
        line: 'rgb(var(--color-border) / <alpha-value>)',
        ink: 'rgb(var(--color-text) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        felt: {
          DEFAULT: 'rgb(var(--color-felt) / <alpha-value>)',
          soft: 'rgb(var(--color-felt-soft) / <alpha-value>)',
        },
        brass: 'rgb(var(--color-brass) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        team: {
          a: 'rgb(var(--color-team-a) / <alpha-value>)',
          b: 'rgb(var(--color-team-b) / <alpha-value>)',
        },
      },
      borderRadius: {
        card: '18px',
      },
    },
  },
  plugins: [],
}
