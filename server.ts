import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configFile = path.resolve(__dirname, 'firebase-applet-config.json');
let firebaseConfig = {};
try {
  const raw = fs.readFileSync(configFile, 'utf8');
  firebaseConfig = JSON.parse(raw);
  console.log('[Server] Loaded Firebase config from:', configFile);
} catch (e) {
  console.warn('[Server] Failed to load firebase-applet-config.json:', e);
}

const app = express();

let viteServer: any = null;

async function startServer() {
  console.log('[Server] Initializing Vite dev server...');
  try {
    viteServer = await createViteServer({
      root: __dirname,
      server: app,
    });
    console.log('[Server] Vite dev server ready!');
  } catch (e) {
    console.error('[Server] Failed to initialize Vite dev server:', e);
  }
}

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = parseInt(process.env.PORT || '3000', 10);
try {
  app.listen(PORT, (error?) => {
    if (error) {
      console.error('[Server] Failed to start http server:', error);
      process.exit(1);
    } else {
      console.log(`[Server] Running on http://localhost:${PORT}`);
      startServer().catch((err) => console.error('[Server] Startup error:', err));
  }
  });
} catch (e) {
  console.error('[Server] Failed to start server:', e);
  process.exit(1);
}
