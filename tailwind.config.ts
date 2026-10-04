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
        /* The public news page (`/news`): Poppins headings — Marathi falls
           through to Noto where Poppins has no glyph — and Mukta for reading. */
        'nr-head': ['var(--font-poppins)', 'Noto Sans Devanagari', 'Nirmala UI', 'sans-serif'],
        'nr-body': ['var(--font-mukta)', 'Noto Sans Devanagari', 'Nirmala UI', 'system-ui', 'sans-serif'],
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
        saffron: 'var(--saffron)',
        'saffron-soft': 'var(--saffron-soft)',
        'saffron-ink': 'var(--saffron-ink)',
        place: 'var(--place)',
        'place-soft': 'var(--place-soft)',
        /* The public news page's palette — see `.nr` in globals.css. Its own
           names, because its crimson is not the desk's maroon. */
        nr: {
          ground: 'var(--nr-ground)',
          primary: 'var(--nr-primary)',
          'primary-soft': 'var(--nr-primary-soft)',
          deep: 'var(--nr-deep)',
          accent: 'var(--nr-accent)',
          'accent-soft': 'var(--nr-accent-soft)',
          'accent-ink': 'var(--nr-accent-ink)',
          place: 'var(--nr-place)',
          'place-soft': 'var(--nr-place-soft)',
          chip: 'var(--nr-chip)',
          'chip-ink': 'var(--nr-chip-ink)',
          text: 'var(--nr-text)',
          text2: 'var(--nr-text2)',
          muted: 'var(--nr-muted)',
          line: 'var(--nr-line)',
          line2: 'var(--nr-line2)',
          peach: 'var(--nr-peach)',
          blush: 'var(--nr-blush)',
          night: 'var(--nr-night)',
        },
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
        card: 'var(--shadow-card)',
      },
      maxWidth: {
        shell: '80rem',
      },
    },
  },
  plugins: [],
} satisfies Config
