import express from 'express';
import cors from 'cors';
import { initDatabase } from './db.js';
import volumesRouter from './routes/volumes.js';
import backupsRouter from './routes/backups.js';
import schedulesRouter from './routes/schedules.js';
import settingsRouter from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/volumes', volumesRouter);
app.use('/api/backups', backupsRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/settings', settingsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
