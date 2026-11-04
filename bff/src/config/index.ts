export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  paymentsApiUrl: process.env.PAYMENTS_API_URL || 'http://localhost:5080',
  surchargeServiceUrl: process.env.SURCHARGE_SERVICE_URL || 'http://localhost:9000',
  paymentListCacheTtlMs: parseInt(process.env.PAYMENT_LIST_CACHE_TTL_MS || '10000', 10),
  // under the terminal's 2s quote timeout, so the terminal gets our answer and falls back to no surcharge
  surchargeServiceTimeoutMs: parseInt(process.env.SURCHARGE_SERVICE_TIMEOUT_MS || '1500', 10),
  // long enough for a slow gateway charge (about 5s with the slow test card)
  paymentsApiTimeoutMs: parseInt(process.env.PAYMENTS_API_TIMEOUT_MS || '15000', 10),
};
