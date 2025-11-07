import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { initDatabase } from './db.js';
import volumesRouter from './routes/volumes.js';
import backupsRouter from './routes/backups.js';
import schedulesRouter from './routes/schedules.js';
import settingsRouter from './routes/settings.js';
import authRouter from './routes/auth.js';
import { mountCifsAtStartup } from './utils/cifs-mount.js';
import { startBackupSync, syncOrphanedBackups } from './utils/backup-sync.js';
import { authMiddleware } from './auth.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use('/auth', authRouter);
app.use('/api/volumes', authMiddleware, volumesRouter);
app.use('/api/backups', authMiddleware, backupsRouter);
app.use('/api/schedules', authMiddleware, schedulesRouter);
app.use('/api/settings', authMiddleware, settingsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const startServer = async () => {
  try {
    await initDatabase();
    await mountCifsAtStartup();
    await syncOrphanedBackups();
    startBackupSync();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
