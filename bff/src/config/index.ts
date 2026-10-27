export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  paymentsApiUrl: process.env.PAYMENTS_API_URL || 'http://localhost:5080',
  surchargeServiceUrl: process.env.SURCHARGE_SERVICE_URL || 'http://localhost:9000',
  paymentListCacheTtlMs: parseInt(process.env.PAYMENT_LIST_CACHE_TTL_MS || '10000', 10),
};
