import { getApiKey } from './session'

const TIMEOUT_MS = 4000
const RETRIES = 2

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST'
  body?: unknown
  timeoutMs?: number
  retries?: number
}

const isTransient = (e: unknown) =>
  (e instanceof DOMException && e.name === 'AbortError') ||
  e instanceof TypeError ||
  (e instanceof ApiError && e.status >= 500)

const readError = async (res: Response) => {
  try {
    const body = await res.json()
    return body.detail ?? body.title ?? body.error ?? res.statusText
  } catch {
    return res.statusText
  }
}

export const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = 'GET', body, timeoutMs = TIMEOUT_MS, retries = RETRIES } = options

  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(`/api${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': getApiKey() },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      })
      if (!res.ok) throw new ApiError(res.status, await readError(res))
      return await res.json() as T
    } catch (e) {
      if (attempt >= retries || !isTransient(e)) throw e
    } finally {
      clearTimeout(timer)
    }
  }
}

export const errorMessage = (e: unknown) => {
  if (e instanceof DOMException && e.name === 'AbortError') return 'The request timed out.'
  return e instanceof Error ? e.message : 'Something went wrong.'
}
