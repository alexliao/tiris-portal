/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        tiris: {
          primary: '#3B82F6',    // blue-500
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