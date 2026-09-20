/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      colors: {
        zinc: {
          850: '#1e1e24',
        },
        background: {
          light: '#ffffff',
          subtle: '#fafafa',
          muted: '#f4f4f5',
          dark: '#09090b',
          'dark-subtle': '#121215',
          'dark-muted': '#18181b',
        },
        border: {
          light: '#e4e4e7',
          muted: '#f4f4f5',
          dark: '#27272a',
          'dark-subtle': '#1e1e24',
        },
      },
    },
  },
  plugins: [],
}
