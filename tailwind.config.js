/**
 * Tailwind yapılandırması — prebuilt (statik) CSS üretmek için.
 * Site CDN'siz çalışır: `npm run build:css` ile assets/tailwind.css üretilir,
 * public sayfalar bu dosyayı <link> ile yükler (render-blocking JIT yok = hızlı).
 *
 * Yeniden üret:  npx tailwindcss -i src/tailwind-input.css -o assets/tailwind.css --minify
 */
module.exports = {
  // Class'ları tarayacağı kaynaklar (eksik class = eksik stil).
  content: [
    './index.html',
    './404.html',
    './*.html',
    './script.js'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4',
          400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e',
          800: '#115e59', 900: '#134e4a'
        },
        secondary: {
          50: '#fafaf9', 100: '#f5f5f4', 200: '#e7e5e4', 300: '#d6d3d1',
          400: '#a8a29e', 500: '#78716c', 600: '#57534e', 700: '#44403c',
          800: '#292524', 900: '#1c1917'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif']
      }
    }
  },
  plugins: []
};
