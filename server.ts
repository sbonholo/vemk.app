import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configFile = path.resolve(__dirname, 'firebase-applet-config.json');
let firebaseConfigJson = '{}';
try {
  firebaseConfigJson = fs.readFileSync(configFile, 'utf8');
  console.log('[Server] Loaded Firebase config from:', configFile);
} catch (e) {
  console.warn('[Server] Failed to load firebase-applet-config.json:', e);
}
process.env.VITE_FIREBASE_CONFIG = firebaseConfigJson;

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isDev = process.env.NODE_ENV !== 'production';

async function start() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: __dirname,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Server] Vite dev server ready');
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('[Server] Startup error:', err);
  process.exit(1);
});
