/**
 * Fetch with exponential backoff retry for 503/429 errors.
 * Reduces Supabase overload by retrying failed requests gracefully.
 */
export async function fetchRetry(
  url: string,
  options?: RequestInit,
  maxRetries = 3,
  baseDelay = 500
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);

      // Retry on 503 (overloaded) or 429 (rate limited)
      if ((res.status === 503 || res.status === 429) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 200;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      return res;
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 200;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error("fetchRetry: max retries exceeded");
}

/**
 * Stagger multiple Supabase calls to avoid 503.
 * Runs promises in batches of `batchSize` with `delayMs` between batches.
 */
export async function staggeredFetch<T>(
  tasks: (() => Promise<T>)[],
  batchSize = 3,
  delayMs = 100
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(fn => fn()));
    for (const r of batchResults) {
      results.push(r.status === "fulfilled" ? r.value : (null as any));
    }
    if (i + batchSize < tasks.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return results;
}
