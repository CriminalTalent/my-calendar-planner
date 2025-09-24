/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system','BlinkMacSystemFont','"Segoe UI"','Roboto','Oxygen',
          'Ubuntu','Cantarell','"Fira Sans"','"Droid Sans"','"Helvetica Neue"',
          'Arial','"Apple SD Gothic Neo"','"Noto Sans KR"','sans-serif'
        ]
      },
      borderColor: {
        DEFAULT: 'rgb(229 231 235 / 1)',
      }
    }
  },
  plugins: []
}
