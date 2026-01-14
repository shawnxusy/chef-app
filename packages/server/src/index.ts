import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

import { runMigrations } from './db/migrate.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import referenceRoutes from './routes/reference.js';
import recipeRoutes from './routes/recipes.js';
import mealRoutes from './routes/meals.js';
import uploadRoutes from './routes/upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for secure cookies behind Railway's reverse proxy
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? false  // Same origin in production
    : 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'chef-app-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Static files for uploaded media
const mediaPath = process.env.NODE_ENV === 'production' ? '/media' : path.join(__dirname, '../../media');
app.use('/media', express.static(mediaPath));

// Health check endpoint (before auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/reference', authMiddleware, referenceRoutes);
app.use('/api/recipes', authMiddleware, recipeRoutes);
app.use('/api/meals', authMiddleware, mealRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const webDistPath = path.join(__dirname, '../../web/dist');
  app.use(express.static(webDistPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(webDistPath, 'index.html'));
    }
  });
}

// Error handler
app.use(errorHandler);

// Run migrations on startup, then start server
async function startServer() {
  try {
    await runMigrations();
    console.log('Database ready');
  } catch (err) {
    console.error('Database migration failed:', err);
    // Continue anyway - migrations might already be done
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

startServer();

export default app;
