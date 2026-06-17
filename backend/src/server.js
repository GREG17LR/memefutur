import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { apiRouter } from './routes/api.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'memefutur-backend',
    dryRun: env.dryRun,
    timestamp: new Date().toISOString()
  });
});

app.use('/api', apiRouter);
app.use('/webhook/tradingview', apiRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, error: `route not found: ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ success: false, error: 'internal server error' });
});

app.listen(env.port, () => {
  console.log(`MemeFutur backend listening on port ${env.port}`);
  console.log(`DRY_RUN=${env.dryRun}`);
});
