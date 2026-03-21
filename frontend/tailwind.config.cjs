module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  prefix: 'tw-',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      boxShadow: {
        soft: '0 14px 30px -22px rgba(15, 23, 42, 0.35)',
      },
    },
  },
  plugins: [],
}
