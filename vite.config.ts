import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import fs from 'fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  let firebaseConfigJson = env.VITE_FIREBASE_CONFIG;
  if (!firebaseConfigJson) {
    try {
      firebaseConfigJson = fs.readFileSync(
        path.resolve(__dirname, 'firebase-applet-config.json'),
        'utf8'
      );
    } catch {
      firebaseConfigJson = '{}';
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    define: {
      'import.meta.env.VITE_FIREBASE_CONFIG': JSON.stringify(firebaseConfigJson),
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
