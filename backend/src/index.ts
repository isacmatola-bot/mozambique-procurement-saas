import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { pool } from './db.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import supplierRoutes from './routes/suppliers.js';
import tenderRoutes from './routes/tenders.js';
import contractRoutes from './routes/contracts.js';
import invoiceRoutes from './routes/invoices.js';
import aiRoutes from './routes/ai.js';
import reportRoutes from './routes/reports.js';
import aiRecommendationsRouter from './routes/aiRecommendations.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.get('/api/health', async (_req, res) => {
  await pool.query('select 1');
  res.json({ ok: true, service: 'mozambique-procurement-api', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/suppliers', requireAuth, supplierRoutes);
app.use('/api/tenders', requireAuth, tenderRoutes);
app.use('/api/contracts', requireAuth, contractRoutes);
app.use('/api/invoices', requireAuth, invoiceRoutes);
app.use('/api/ai', requireAuth, aiRecommendationsRouter);
app.use('/api/reports', requireAuth, reportRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Mozambique Procurement API listening on http://localhost:${config.port}`);
});