import { UpstreamError } from '../types';

export type UpstreamResponse = { status: number; body: any };

// AbortSignal.timeout rejects with a DOMException named TimeoutError. Checked by name, as a DOMException isn't
// always an instanceof Error
const isTimeout = (err: unknown) => {
  const name = (err as { name?: unknown } | null)?.name;
  return name === 'TimeoutError' || name === 'AbortError';
};

// One call to a dependency, with a deadline. Whatever goes wrong (unreachable, slow, or an error page instead of
// JSON) comes back as an UpstreamError for this request alone: 504 if it timed out, 502 otherwise.
// Responses with a JSON body are returned whatever their status, so callers can pass 4xx errors through.
export async function upstreamFetch(name: string, url: URL, init: RequestInit, timeoutMs: number): Promise<UpstreamResponse> {
  let response: Response;
  let text: string;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    text = await response.text();
  } catch (err) {
    if (isTimeout(err)) {
      console.error(`${name} timed out after ${timeoutMs}ms: ${init.method ?? 'GET'} ${url.pathname}`);
      throw new UpstreamError(504, `${name} timed out`);
    }
    const cause = (err as { cause?: { code?: string } }).cause?.code;
    console.error(`${name} unreachable: ${init.method ?? 'GET'} ${url.pathname} error=${err}${cause ? ` cause=${cause}` : ''}`);
    throw new UpstreamError(502, `${name} unavailable`);
  }

  if (!text) return { status: response.status, body: undefined };
  try {
    return { status: response.status, body: JSON.parse(text) };
  } catch {
    // typically a load balancer's HTML error page while the service restarts
    console.error(`${name} sent a non-JSON ${response.status}: ${init.method ?? 'GET'} ${url.pathname}`);
    throw new UpstreamError(502, `${name} unavailable`);
  }
}
