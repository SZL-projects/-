import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        // פיצול קוד לחבילות נפרדות לטעינה מהירה יותר
        manualChunks: {
          // ספריות MUI בחבילה נפרדת
          'mui-core': ['@mui/material', '@emotion/react', '@emotion/styled'],
          'mui-icons': ['@mui/icons-material'],
          // ספריות גרפים
          'charts': ['recharts'],
          // ניווט
          'router': ['react-router-dom'],
          // axios
          'http': ['axios'],
        }
      }
    },
    // הגדלת גודל אזהרה ל-1MB
    chunkSizeWarningLimit: 1000,
    // דחיסה מקסימלית
    minify: 'esbuild',
    // הסרת console.log בפרודקשן
    esbuild: {
      drop: ['console', 'debugger'],
    },
    // יצירת source maps רק ב-development
    sourcemap: false,
  },
  // אופטימיזציה של dependencies
  optimizeDeps: {
    include: ['@mui/material', '@mui/icons-material', 'recharts', 'axios', 'react-router-dom'],
  },
})
