import request from 'supertest';
import { Express } from 'express';

const API_KEY = 'sk_test_harbor_8d1e6b03c7';
const EMPTY_PAGE = { items: [], page: 1, pageSize: 25, totalCount: 0 };

let app: Express;
let fetchMock: jest.Mock;

function fetchResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(async () => {
  // fresh modules so the list cache starts empty
  jest.resetModules();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;

  app = (await import('../app')).default;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/payments', () => {
  it('returns 401 when the API key is missing', async () => {
    const res = await request(app).get('/api/payments');

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards the API key and query string to the payments API', async () => {
    fetchMock.mockResolvedValueOnce(fetchResponse(200, EMPTY_PAGE));

    const res = await request(app).get('/api/payments?page=2&pageSize=10').set('X-Api-Key', API_KEY);

    expect(res.status).toBe(200);
    const [url, opts] = fetchMock.mock.calls[0];
    const headers = (opts as RequestInit).headers as Record<string, string>;
    expect(String(url)).toBe('http://localhost:5080/api/payments?page=2&pageSize=10');
    expect(headers['X-Api-Key']).toBe(API_KEY);
  });

  it('serves a repeat request from the cache', async () => {
    fetchMock.mockResolvedValueOnce(fetchResponse(200, EMPTY_PAGE));

    await request(app).get('/api/payments?page=1').set('X-Api-Key', API_KEY);
    const res = await request(app).get('/api/payments?page=1').set('X-Api-Key', API_KEY);

    expect(res.body).toEqual(EMPTY_PAGE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/payments', () => {
  it('clears the cached list', async () => {
    fetchMock
      .mockResolvedValueOnce(fetchResponse(200, EMPTY_PAGE))
      .mockResolvedValueOnce(fetchResponse(201, { id: 'pay_1', status: 'APPROVED' }))
      .mockResolvedValueOnce(fetchResponse(200, EMPTY_PAGE));

    await request(app).get('/api/payments').set('X-Api-Key', API_KEY);
    await request(app).post('/api/payments').set('X-Api-Key', API_KEY).send({ amount: 10 });
    await request(app).get('/api/payments').set('X-Api-Key', API_KEY);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('GET /api/payments/:id', () => {
  it('passes a 404 from the payments API through', async () => {
    fetchMock.mockResolvedValueOnce(fetchResponse(404, { title: 'Not Found', status: 404 }));

    const res = await request(app).get('/api/payments/pay_missing').set('X-Api-Key', API_KEY);

    expect(res.status).toBe(404);
  });

  it('returns 502 when the payments API is unreachable', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    const res = await request(app).get('/api/payments/pay_1').set('X-Api-Key', API_KEY);

    expect(res.status).toBe(502);
  });
});
