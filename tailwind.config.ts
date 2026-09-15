import type { Config } from 'tailwindcss'

/**
 * Tailwind sees the same tokens `globals.css` defines, by reference rather than
 * by copy — `text-muted` and `var(--muted)` can never drift apart, and a utility
 * written in a hurry lands on the palette instead of beside it.
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-ui)'],
        display: ['var(--font-display)'],
        marathi: ['Noto Sans Devanagari', 'Nirmala UI', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: 'var(--ink)',
        paper: 'var(--paper)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        sunk: 'var(--surface-sunk)',
        edge: 'var(--edge)',
        'edge-strong': 'var(--edge-strong)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        muted: 'var(--muted)',
        secondary: 'var(--text-secondary)',
        faint: 'var(--faint)',
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        hold: 'var(--hold)',
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        DEFAULT: 'var(--r-md)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      maxWidth: {
        shell: '80rem',
      },
    },
  },
  plugins: [],
} satisfies Config
