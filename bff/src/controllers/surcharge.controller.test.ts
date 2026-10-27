import request from 'supertest';
import { Express } from 'express';

const API_KEY = 'sk_test_harbor_8d1e6b03c7';

const HARBOR = { id: 'mer_002', name: 'Harbor Dental Group', currency: 'USD', surchargeRate: 2.5 };

const QUOTE = {
  merchantId: 'mer_002',
  currency: 'USD',
  network: 'VISA',
  cardType: 'CREDIT',
  surchargeable: true,
  rate: 2.5,
  amount: 100,
  surcharge: 2.5,
  total: 102.5,
};

let app: Express;
let fetchMock: jest.Mock;

function fetchResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(async () => {
  // fresh modules so the merchant cache starts empty
  jest.resetModules();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  fetchMock = jest.fn(async (url: URL) =>
    url.pathname === '/api/merchants/me' ? fetchResponse(200, HARBOR) : fetchResponse(200, QUOTE),
  );
  global.fetch = fetchMock as unknown as typeof fetch;

  app = (await import('../app')).default;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /api/surcharge/quote', () => {
  it('asks the surcharge service to quote for the merchant behind the API key', async () => {
    await request(app).post('/api/surcharge/quote').set('X-Api-Key', API_KEY).send({ amount: 100, bin: '41111111' });

    const [url, opts] = fetchMock.mock.calls[1];
    expect(String(url)).toBe('http://localhost:9000/v1/quotes');
    expect(JSON.parse((opts as RequestInit).body as string)).toEqual({ merchantId: 'mer_002', amount: 100, bin: '41111111' });
  });

  it('returns the quote without merchantId and currency', async () => {
    const res = await request(app)
      .post('/api/surcharge/quote')
      .set('X-Api-Key', API_KEY)
      .send({ amount: 100, bin: '41111111' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      network: 'VISA',
      cardType: 'CREDIT',
      surchargeable: true,
      rate: 2.5,
      amount: 100,
      surcharge: 2.5,
      total: 102.5,
    });
  });

  it('looks the merchant up once per API key', async () => {
    await request(app).post('/api/surcharge/quote').set('X-Api-Key', API_KEY).send({ amount: 100, bin: '41111111' });
    await request(app).post('/api/surcharge/quote').set('X-Api-Key', API_KEY).send({ amount: 50, bin: '41111111' });

    const merchantLookups = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/api/merchants/me'));
    expect(merchantLookups).toHaveLength(1);
  });

  it.each([
    [{ amount: 0, bin: '41111111' }],
    [{ amount: -5, bin: '41111111' }],
    [{ amount: '100', bin: '41111111' }],
    [{ amount: 100, bin: '4111' }],
    [{ amount: 100, bin: '4111abcd' }],
    [{}],
  ])('returns 400 for %j without calling upstream', async (body) => {
    const res = await request(app).post('/api/surcharge/quote').set('X-Api-Key', API_KEY).send(body);

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
