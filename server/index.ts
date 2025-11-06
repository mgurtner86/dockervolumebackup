import express from 'express';
import cors from 'cors';
import { initDatabase } from './db';
import volumesRouter from './routes/volumes';
import backupsRouter from './routes/backups';
import schedulesRouter from './routes/schedules';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/volumes', volumesRouter);
app.use('/api/backups', backupsRouter);
app.use('/api/schedules', schedulesRouter);

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
