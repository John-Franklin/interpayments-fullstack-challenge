import { Response } from 'express';
import { config } from '../config';
import { AuthenticatedRequest, UpstreamError } from '../types';
import { upstreamFetch, UpstreamResponse } from './upstream';

function forwardedHeaders(req: AuthenticatedRequest): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Api-Key': req.apiKey ?? '',
  };
}

// For callers that need the body rather than piping it to res. path is relative to /api. Throws an UpstreamError
// if the payments API is unreachable, too slow or doesn't answer with JSON
export async function fetchFromPaymentsApi(
  req: AuthenticatedRequest,
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<UpstreamResponse> {
  return upstreamFetch('Payments API', new URL(`/api${path}`, config.paymentsApiUrl), {
    method,
    headers: forwardedHeaders(req),
    body: body === undefined ? undefined : JSON.stringify(body),
  }, config.paymentsApiTimeoutMs);
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
    if (!(err instanceof UpstreamError)) throw err;
    // a timed out charge or refund may still have gone through, so retrying blindly could do it twice
    const error = err.status === 504 && method === 'POST'
      ? "The payments API didn't respond in time. Check the payments list before trying again."
      : err.message;
    res.status(err.status).json({ error });
  }
}
