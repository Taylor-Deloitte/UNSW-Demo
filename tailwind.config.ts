import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // v2 design tokens (per docs/design-v2/handoff.md)
        'unsw-yellow': '#FFD100',
        ink: '#000000',
        paper: '#FFFFFF',
        mist: '#f4f4f4',
        rule: '#e0e0e0',
        'rule-soft': '#ededed',
        muted: '#55565a',
        'muted-soft': '#8f9296',
        'chart-soft': '#c8c8c8',
        'ok-border': '#1ac987',
        'ok-text': '#0d7a54',
        // retained from v1, unused in these screens per handoff
        'unsw-navy': '#001A2C',
        'unsw-slate': '#55565a', // alias for muted, kept so v1 leftovers still compile
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
        mono: ['"Roboto Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        // handoff: radius 0 everywhere — this is deliberate
      },
    },
  },
  plugins: [],
};

export default config;
