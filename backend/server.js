import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import { initDatabase } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';

const app = express();
app.set('etag', false);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(morgan('dev'));

// API Routes
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
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`[Backend] School ERP Express Server running on http://localhost:${PORT}`);
  });
});
