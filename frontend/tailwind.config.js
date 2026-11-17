/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Modern Enterprise Blue & Slate theme
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // Royal Blue Primary
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        primary: {
          DEFAULT: '#2563eb',
          soft: '#eff6ff',
          strong: '#1d4ed8',
        },
        sidebar: {
          DEFAULT: '#0f172a', // Deep Slate / Navy
          soft: '#1e293b',
        },
        app: '#f8fafc',
        surface: '#ffffff',
        subtle: '#f1f5f9',
        heading: '#0f172a',
        body: '#334155',
        muted: '#64748b',
        faint: '#94a3b8',
        border: {
          light: '#f1f5f9',
          DEFAULT: '#e2e8f0',
          strong: '#cbd5e1',
        },
        success: { DEFAULT: '#10b981', soft: '#ecfdf5' },
        warning: { DEFAULT: '#f59e0b', soft: '#fef3c7' },
        danger: { DEFAULT: '#ef4444', soft: '#fee2e2' },
        info: { DEFAULT: '#0ea5e9', soft: '#e0f2fe' },
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(15 23 42 / 0.05), 0 1px 2px -1px rgb(15 23 42 / 0.05)',
        pop: '0 10px 25px -5px rgb(15 23 42 / 0.1), 0 8px 10px -6px rgb(15 23 42 / 0.1)',
      },
    },
  },
  plugins: [],
}
