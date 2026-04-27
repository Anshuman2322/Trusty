const token = (name) => `hsl(var(${name}) / <alpha-value>)`

module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  prefix: 'tw-',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        border: token('--tw-border'),
        input: token('--tw-input'),
        ring: token('--tw-ring'),
        background: token('--tw-background'),
        foreground: token('--tw-foreground'),
        primary: {
          DEFAULT: token('--tw-primary'),
          foreground: token('--tw-primary-foreground'),
        },
        secondary: {
          DEFAULT: token('--tw-secondary'),
          foreground: token('--tw-secondary-foreground'),
        },
        muted: {
          DEFAULT: token('--tw-muted'),
          foreground: token('--tw-muted-foreground'),
        },
        accent: {
          DEFAULT: token('--tw-accent'),
          foreground: token('--tw-accent-foreground'),
        },
        destructive: {
          DEFAULT: token('--tw-destructive'),
          foreground: token('--tw-destructive-foreground'),
        },
        card: {
          DEFAULT: token('--tw-card'),
          foreground: token('--tw-card-foreground'),
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        soft: '0 14px 30px -22px rgba(15, 23, 42, 0.35)',
      },
    },
  },
  plugins: [],
}
