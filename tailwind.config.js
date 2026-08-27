/** @type {import('tailwindcss').Config} */
module.exports = {
  // Le quattro cartelle in cui vive il markup del tema, non `./**/*.html`.
  // Il glob generico prendeva anche node_modules, la suite in `test/`, le copie
  // di lavoro (`/master/`, `/lancio-prova/`) e `to_migrate/`: classi di altri
  // temi finivano in main.css, e senza nessun errore da nessuna parte.
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
        // you can configure the container to be centered
        center: true,
  
        // or have default horizontal padding
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
