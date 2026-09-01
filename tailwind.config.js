/** @type {import('tailwindcss').Config} */
module.exports = {
  // The four directories holding the theme markup. A generic `./**/*.html` also
  // matches node_modules, `test/`, working copies and `to_migrate/`, leaking
  // other themes' classes into main.css.
  content: [
    "./layout/**/*.html",
    "./sections/**/*.html",
    "./snippets/**/*.html",
    "./templates/**/*.html"
  ],
  safelist: [
    {
      pattern: /ql-.*/,
    },
  ],
  theme: {
    fontFamily: {
      'sans': ['Quicksand', 'sans-serif'],
      'serif': ['Merriweather', 'serif'],
    },
    extend: {
      container: {
        center: true,
        padding: '1rem',
  
        screens: {
          sm: '600px',
          md: '984px',
          lg: '1180px',
          xl: '1180px',
        }
      }
    }
  },
  plugins: [],
}
