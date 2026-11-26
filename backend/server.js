import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

if (!process.env.JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET is not set. Add it to backend/.env before starting the server.');
  process.exit(1);
}

import { initDatabase } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';

const app = express();
app.set('etag', false);
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  })
);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// API Routes — all routers are mounted once inside routes/index.js
app.use('/api', apiRouter);

// Health check / Root
app.get('/', (_req, res) => {
  res.json({
    name: 'School ERP Backend API',
    version: '1.0.0',
    database: 'MySQL',
    status: 'online',
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize DB and start server
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[Backend] School ERP Express Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('[FATAL] Database initialization failed:', error.message);
    process.exit(1);
  });
