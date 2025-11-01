/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        tiris: {
          primary: {
            50: '#F4F7FB',
            100: '#E3E9F4',
            200: '#CBD5EA',
            300: '#A9BBDC',
            400: '#7E9AC8',
            500: '#5678B2',
            600: '#3F5E98',
            700: '#31497A',
            800: '#25375D',
            900: '#1B2947',
          },
          secondary: '#6366F1',  // indigo-500  
          accent: '#10B981',     // emerald-500
          success: '#22C55E',    // green-500
          warning: '#F59E0B',    // amber-500
          error: '#EF4444',      // red-500
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      }
    },
  },
}
