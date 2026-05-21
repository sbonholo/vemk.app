import 'dotenv/config';
import path from 'path';
import fs from 'fs';

const root = path.resolve(process.cwd());

function resolvePath(p: string) {
  return path.isAbsolute(p) ? p : path.join(root, p);
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'beija-dev-secret-change-me',
  otpTtlSeconds: parseInt(process.env.OTP_TTL_SECONDS || '300', 10),
  devReturnOtp: (process.env.DEV_RETURN_OTP || 'true') === 'true',
  databaseFile: resolvePath(process.env.DATABASE_FILE || './data/beija.db'),
  uploadDir: resolvePath(process.env.UPLOAD_DIR || './uploads'),
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:4000',
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  smsProvider: process.env.SMS_PROVIDER || 'mock',
};

fs.mkdirSync(path.dirname(config.databaseFile), { recursive: true });
fs.mkdirSync(config.uploadDir, { recursive: true });
