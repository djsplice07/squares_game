import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        accent: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(59, 130, 246, 0.15)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.2)',
        'glow-lg': '0 0 30px rgba(59, 130, 246, 0.25)',
        'glow-green': '0 0 15px rgba(34, 197, 94, 0.15)',
        'glow-amber': '0 0 15px rgba(245, 158, 11, 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
