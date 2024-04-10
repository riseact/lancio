/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./**/*.html"
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
