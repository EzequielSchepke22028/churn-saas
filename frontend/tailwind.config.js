import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#FAFAFA',
        surface: {
          DEFAULT: '#FFFFFF',
          raised: '#FFFFFF',
        },
        border: {
          DEFAULT: '#E4E4E7',
          strong: '#D4D4D8',
          subtle: '#F0F0F1',
        },
        ink: {
          DEFAULT: '#18181B',
          muted: '#71717A',
          subtle: '#A1A1AA',
        },
        accent: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
          active: '#3730A3',
          subtle: '#EEF2FF',
          border: '#C7D2FE',
        },
        danger: {
          DEFAULT: '#DC2626',
          subtle: '#FEF2F2',
          border: '#FECACA',
        },
        success: {
          DEFAULT: '#16A34A',
          subtle: '#F0FDF4',
          border: '#BBF7D0',
        },
        warning: {
          DEFAULT: '#D97706',
          subtle: '#FFFBEB',
          border: '#FDE68A',
        },
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: [
          '"Geist Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          ...defaultTheme.fontFamily.mono,
        ],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem', letterSpacing: '0' }],
        base: ['0.875rem', { lineHeight: '1.375rem', letterSpacing: '-0.006em' }],
        lg: ['1rem', { lineHeight: '1.5rem', letterSpacing: '-0.011em' }],
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.014em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.017em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        sm: '0.375rem',
        DEFAULT: '0.5rem',
        md: '0.625rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgb(24 24 27 / 0.04)',
        card: '0 1px 2px 0 rgb(24 24 27 / 0.04), 0 1px 6px -2px rgb(24 24 27 / 0.06)',
        raised: '0 4px 16px -4px rgb(24 24 27 / 0.10), 0 2px 6px -2px rgb(24 24 27 / 0.06)',
        'focus-ring': '0 0 0 3px rgb(79 70 229 / 0.15)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slide: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
        slide: 'slide 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}