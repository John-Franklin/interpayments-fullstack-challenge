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

// Last resort. Routes go through asyncHandler, so a rejection getting here is a bug: log it loudly (alert on
// this line), but one stray promise mustn't restart the BFF and drop every terminal's requests with it (INC-4493)
process.on('unhandledRejection', (reason) => {
  console.error(JSON.stringify({
    '@timestamp': new Date().toISOString(),
    level: 'ERROR',
    logger_name: 'process',
    message: `unhandledRejection: ${reason instanceof Error ? reason.stack : String(reason)}`,
  }));
});

// a synchronous throw outside a request leaves the process in an unknown state, so exit, but let in-flight requests finish
process.on('uncaughtException', (err) => {
  console.error(JSON.stringify({
    '@timestamp': new Date().toISOString(),
    level: 'ERROR',
    logger_name: 'process',
    message: `uncaughtException, shutting down: ${err.stack}`,
  }));
  server.close(() => process.exit(1));
  setTimeout(() => process.exit(1), 10_000).unref();
});
