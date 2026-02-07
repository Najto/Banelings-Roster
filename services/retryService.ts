export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  exponentialBase?: number;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const fetchWithRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> => {
  const {
    maxRetries = 2,
    initialDelayMs = 1000,
    maxDelayMs = 4000,
    exponentialBase = 2
  } = options;

  let lastError: Error | undefined;
  let attempts = 0;

  for (let i = 0; i <= maxRetries; i++) {
    attempts++;

    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (i < maxRetries) {
        const delay = Math.min(
          initialDelayMs * Math.pow(exponentialBase, i),
          maxDelayMs
        );

        console.log(
          `Retry attempt ${i + 1}/${maxRetries} after ${delay}ms delay. Error: ${lastError.message}`
        );

        await sleep(delay);
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts
  };
};

export class RateLimiter {
  private queue: Array<() => void> = [];
  private running = 0;
  private lastRequestTime = 0;
  private requestCount = 0;
  private windowStart = Date.now();

  constructor(
    private maxConcurrent: number,
    private requestsPerSecond: number
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForSlot();

    this.running++;

    try {
      const result = await fn();
      return result;
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  private async waitForSlot(): Promise<void> {
    const now = Date.now();

    if (now - this.windowStart >= 1000) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    if (this.running >= this.maxConcurrent || this.requestCount >= this.requestsPerSecond) {
      await new Promise<void>(resolve => {
        this.queue.push(resolve);
      });
    }

    const timeSinceLastRequest = now - this.lastRequestTime;
    const minTimeBetweenRequests = 1000 / this.requestsPerSecond;

    if (timeSinceLastRequest < minTimeBetweenRequests) {
      await sleep(minTimeBetweenRequests - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const resolve = this.queue.shift();
      if (resolve) {
        resolve();
      }
    }
  }
}
