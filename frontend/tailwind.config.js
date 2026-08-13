/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta "Barrio": azulejo de Santiago, marigold de feria, papel de boleta.
        ink: '#1B2A22',       // texto principal — verde-tinta casi negro
        paper: '#EFEDE2',     // fondo — papel de boleta, no crema genérico
        paper2: '#E4E1D2',    // fondo secundario, tarjetas alternas
        azulejo: {
          DEFAULT: '#2F6B57',
          dark: '#204A3C',
          light: '#3E8B70',
        },
        marigold: {
          DEFAULT: '#E7A33E',
          dark: '#C6822A',
        },
        ladrillo: {
          DEFAULT: '#B94A3B',
          light: '#F4E1DC',
        },
        linea: '#C9CBB8',
      },
      fontFamily: {
        display: ['Archivo', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        card: '0.9rem',
      },
      boxShadow: {
        stamp: '0 2px 0 rgba(27,42,34,0.08)',
      },
    },
  },
  plugins: [],
}
