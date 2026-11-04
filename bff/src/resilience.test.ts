import request from 'supertest';
import { Express } from 'express';

// INC-4493: one failed upstream call crashed the BFF, and with it every terminal. No route should let a failing,
// slow or garbled dependency do more than fail that one request.

const API_KEY = 'sk_test_harbor_8d1e6b03c7';
const HARBOR = { id: 'mer_002', name: 'Harbor Dental Group', currency: 'USD', surchargeRate: 2.5 };
const QUOTE = {
  merchantId: 'mer_002', currency: 'USD', network: 'VISA', cardType: 'CREDIT',
  surchargeable: true, rate: 2.5, amount: 185, surcharge: 4.63, total: 189.63,
};

// the error from the ticket
const enotfound = (host: string) =>
  Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error(`getaddrinfo ENOTFOUND ${host}`), { code: 'ENOTFOUND' }) });
const timedOut = () => new DOMException('The operation was aborted due to timeout', 'TimeoutError');

type Failure = 'unreachable' | 'timeout' | 'not json';
type Upstream = 'payments' | 'surcharge';

let app: Express;
let failing: Partial<Record<Upstream, Failure>>;

const respond = (upstream: Upstream, ok: () => Response): Promise<Response> => {
  switch (failing[upstream]) {
    case 'unreachable': return Promise.reject(enotfound(upstream === 'payments' ? 'payments-api' : 'surcharge-service'));
    case 'timeout': return Promise.reject(timedOut());
    case 'not json': return Promise.resolve(new Response('<html>502 Bad Gateway</html>', { status: 502 }));
    default: return Promise.resolve(ok());
  }
};

beforeEach(async () => {
  jest.resetModules();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  failing = {};

  global.fetch = jest.fn(async (url: URL) => {
    const path = new URL(String(url)).pathname;
    if (path === '/v1/quotes') return respond('surcharge', () => Response.json(QUOTE));
    if (path === '/api/merchants/me') return respond('payments', () => Response.json(HARBOR));
    return respond('payments', () => Response.json({ items: [], page: 1, pageSize: 25, totalCount: 0 }));
  }) as unknown as typeof fetch;

  app = (await import('./app')).default;
});

afterEach(() => {
  jest.restoreAllMocks();
});

const routes: [string, (agent: request.SuperTest<request.Test>) => request.Test][] = [
  ['POST /api/surcharge/quote', a => a.post('/api/surcharge/quote').send({ amount: 185, bin: '41111111' })],
  ['GET /api/merchants/me', a => a.get('/api/merchants/me')],
  ['GET /api/payments', a => a.get('/api/payments?page=1&pageSize=25')],
  ['GET /api/payments/:id', a => a.get('/api/payments/pay_1')],
  ['POST /api/payments', a => a.post('/api/payments').send({ amount: 185 })],
  ['POST /api/payments/:id/refund', a => a.post('/api/payments/pay_1/refund')],
];

const call = (route: (agent: request.SuperTest<request.Test>) => request.Test) =>
  route(request(app) as unknown as request.SuperTest<request.Test>).set('X-Api-Key', API_KEY);

describe.each<[Upstream, Failure, number]>([
  ['payments', 'unreachable', 502],
  ['payments', 'timeout', 504],
  ['payments', 'not json', 502],
])('when the payments API is %s (%s)', (upstream, failure, expected) => {
  it.each(routes)('%s fails that request with a %s and the BFF keeps serving', async (_name, route) => {
    failing[upstream] = failure;
    const res = await call(route);
    expect(res.status).toBe(expected);
    expect(res.body.error).toEqual(expect.any(String));

    failing = {};
    expect((await request(app).get('/health')).status).toBe(200);
  });
});

describe.each<[Failure, number]>([
  ['unreachable', 502],
  ['timeout', 504],
  ['not json', 502],
])('when the surcharge service is %s', (failure, expected) => {
  it(`fails the quote with a ${expected} and the next quote still works`, async () => {
    failing.surcharge = failure;
    const res = await call(routes[0][1]);
    expect(res.status).toBe(expected);
    expect(res.body.error).toEqual(expect.any(String));

    failing = {};
    const next = await call(routes[0][1]);
    expect(next.status).toBe(200);
    expect(next.body.total).toBe(189.63);
  });

  it('does not affect routes that only need the payments API', async () => {
    failing.surcharge = failure;
    expect((await call(routes[2][1])).status).toBe(200);
  });
});
