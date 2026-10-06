/** @type {import('tailwindcss').Config} */
const slateShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        slate: Object.fromEntries(
          slateShades.map((shade) => [
            shade,
            `rgb(var(--color-slate-${shade}) / <alpha-value>)`,
          ])
        ),
      },
    },
  },
  plugins: [],
};
