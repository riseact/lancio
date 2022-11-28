/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./**/*.html"
  ],
  theme: {
    extend: {
      container: {
        // you can configure the container to be centered
        center: true,
  
        // or have default horizontal padding
        padding: '1rem',
  
        // default breakpoints but with 40px removed
        screens: {
          sm: '600px',
          md: '728px',
          lg: '984px',
          xl: '1280px',
          '2xl': '1320px',
        }
      }
    }
  },
  plugins: [],
}
