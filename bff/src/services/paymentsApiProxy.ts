import { Response } from 'express';
import { config } from '../config';
import { AuthenticatedRequest } from '../types';

function forwardedHeaders(req: AuthenticatedRequest): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Api-Key': req.apiKey ?? '',
  };
}

// For callers that need the body rather than piping it to res. path is relative to /api
export async function fetchFromPaymentsApi(
  req: AuthenticatedRequest,
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<{ status: number; body: any }> {
  const response = await fetch(new URL(`/api${path}`, config.paymentsApiUrl), {
    method,
    headers: forwardedHeaders(req),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : undefined };
}

export async function proxyGet(req: AuthenticatedRequest, res: Response, path: string): Promise<void> {
  await proxyRequest(req, res, 'GET', path);
}

export async function proxyPost(req: AuthenticatedRequest, res: Response, path: string): Promise<void> {
  await proxyRequest(req, res, 'POST', path);
}

async function proxyRequest(req: AuthenticatedRequest, res: Response, method: string, path: string): Promise<void> {
  try {
    const { status, body } = await fetchFromPaymentsApi(req, path, method, method === 'POST' ? req.body : undefined);
    if (body === undefined) {
      res.status(status).end();
    } else {
      res.status(status).json(body);
    }
  } catch (err) {
    console.error(`Payments API request failed: method=${method} path=${path} error=${err}`);
    res.status(502).json({ error: 'Payments API unavailable' });
  }
}
