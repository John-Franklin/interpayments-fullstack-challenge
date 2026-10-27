interface CacheEntry<T> {
  value: T;
  expiresAt: number; // epoch ms
}

export class ResponseCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry || entry.expiresAt <= Date.now()) return undefined;
    return entry.value;
  }

  set(key: string, value: T): void {
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.entries.clear();
  }
}
