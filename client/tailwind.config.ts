import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aura: {
          // Theme-adaptive: stored as RGB triplets in CSS vars → supports opacity modifiers
          bg:           'rgb(var(--c-bg)    / <alpha-value>)',
          surface:      'rgb(var(--c-surf)  / <alpha-value>)',
          card:         'rgb(var(--c-card)  / <alpha-value>)',
          border:       'rgb(var(--c-bord)  / <alpha-value>)',
          text:         'rgb(var(--c-text)  / <alpha-value>)',
          muted:        'rgb(var(--c-muted) / <alpha-value>)',
          'muted-light':'rgb(var(--c-mutl)  / <alpha-value>)',
          // Brand — static (same in both themes)
          purple:        '#7C3AED',
          'purple-light':'#9F67FF',
          cyan:          '#06B6D4',
          'cyan-light':  '#22D3EE',
          green:         '#10B981',
          amber:         '#F59E0B',
          red:           '#EF4444',
        },
      },
      backgroundImage: {
        'aura-gradient':        'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
        'aura-gradient-subtle': 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(6,182,212,0.12) 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'display':  ['30px', { lineHeight: '1.2', fontWeight: '700' }],
        'heading':  ['20px', { lineHeight: '1.35', fontWeight: '600' }],
        'subhead':  ['16px', { lineHeight: '1.5',  fontWeight: '500' }],
        'body':     ['14px', { lineHeight: '1.6',  fontWeight: '400' }],
        'label':    ['12px', { lineHeight: '1.4',  fontWeight: '500' }],
        'caption':  ['11px', { lineHeight: '1.4',  fontWeight: '400' }],
      },
      animation: {
        'gradient-x': 'gradient-x 8s ease infinite',
        'float':      'float 6s ease-in-out infinite',
        'slide-up':   'slide-up 0.5s ease-out',
        'fade-in':    'fade-in 0.4s ease-out',
        'shimmer':    'shimmer 1.5s linear infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'card':        '0 2px 12px rgba(0,0,0,0.08)',
        'card-dark':   '0 4px 24px rgba(0,0,0,0.4)',
        'glow-purple': '0 0 20px rgba(124, 58, 237, 0.35)',
        'glow-cyan':   '0 0 20px rgba(6, 182, 212, 0.3)',
        'aura':        '0 0 40px rgba(124, 58, 237, 0.15)',
      },
    },
  },
  plugins: [],
}

export default config
