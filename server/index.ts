import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { initDatabase } from './db.js';
import volumesRouter from './routes/volumes.js';
import backupsRouter from './routes/backups.js';
import schedulesRouter from './routes/schedules.js';
import scheduleGroupsRouter from './routes/schedule-groups.js';
import settingsRouter from './routes/settings.js';
import authRouter from './routes/auth.js';
import logsRouter from './routes/logs.js';
import { mountCifsAtStartup } from './utils/cifs-mount.js';
import { startBackupSync, syncOrphanedBackups } from './utils/backup-sync.js';
import { startScheduler } from './utils/scheduler.js';
import { authMiddleware } from './auth.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

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
app.use('/api/schedule-groups', authMiddleware, scheduleGroupsRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/logs', authMiddleware, logsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const startServer = async () => {
  try {
    console.log('Starting server initialization...');

    try {
      await initDatabase();
      console.log('✓ Database initialized');
    } catch (error) {
      console.error('⚠ Database initialization failed:', error);
      console.log('Server will start anyway, but database operations will fail');
    }

    try {
      await mountCifsAtStartup();
      console.log('✓ CIFS mount checked');
    } catch (error) {
      console.error('⚠ CIFS mount failed:', error);
    }

    try {
      await syncOrphanedBackups();
      console.log('✓ Backup sync completed');
    } catch (error) {
      console.error('⚠ Backup sync failed:', error);
    }

    try {
      startBackupSync();
      console.log('✓ Backup sync started');
    } catch (error) {
      console.error('⚠ Backup sync start failed:', error);
    }

    try {
      startScheduler();
      console.log('✓ Backup scheduler started');
    } catch (error) {
      console.error('⚠ Scheduler start failed:', error);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ Server running on http://0.0.0.0:${PORT}`);
      console.log(`  Health check: http://0.0.0.0:${PORT}/health`);
      console.log(`  Auth endpoint: http://0.0.0.0:${PORT}/auth/check-setup`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
