import app from './app';
import { config } from './config';

const server = app.listen(config.port, () => {
  console.log(`Terminal BFF listening on port ${config.port}`);
  console.log(`Payments API: ${config.paymentsApiUrl}`);
  console.log(`Surcharge service: ${config.surchargeServiceUrl}`);
});

const shutdown = () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
