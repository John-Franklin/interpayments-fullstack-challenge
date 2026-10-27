import { ResponseCache } from './responseCache';

describe('ResponseCache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the value until the ttl is up', () => {
    const cache = new ResponseCache<string>(1000);
    cache.set('a', 'first');

    jest.advanceTimersByTime(999);
    expect(cache.get('a')).toBe('first');

    jest.advanceTimersByTime(1);
    expect(cache.get('a')).toBeUndefined();
  });

  it('restarts the ttl when a key is set again', () => {
    const cache = new ResponseCache<string>(1000);
    cache.set('a', 'first');
    jest.advanceTimersByTime(600);
    cache.set('a', 'second');
    jest.advanceTimersByTime(600);

    expect(cache.get('a')).toBe('second');
  });

  it('drops every entry on clear', () => {
    const cache = new ResponseCache<string>(1000);
    cache.set('a', 'first');
    cache.set('b', 'second');

    cache.clear();

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });
});
