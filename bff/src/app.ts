import express from 'express';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';

const app = express();

app.disable('x-powered-by');

// Global middleware
app.use(requestLogger);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', routes);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
