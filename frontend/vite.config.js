import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendTarget = process.env.VITE_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/uploads': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/.test(id)) return 'vendor-react';
          if (/[\\/]node_modules[\\/]firebase[\\/]/.test(id) || /[\\/]node_modules[\\/]@firebase[\\/]/.test(id)) return 'vendor-firebase';
          if (/[\\/]node_modules[\\/](react-hot-toast|date-fns|lucide-react)[\\/]/.test(id)) return 'vendor-ui';
          if (/[\\/]node_modules[\\/]recharts[\\/]/.test(id)) return 'vendor-charts';
          return undefined;
        },
      },
    },
  },
});
