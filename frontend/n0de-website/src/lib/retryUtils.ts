// Utility functions for handling retries with exponential backoff

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (error: any, attempt: number) => void;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    onRetry = () => {}
  } = options;

  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on non-retryable errors
      if (error.response?.status && ![429, 502, 503, 504].includes(error.response.status)) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = Math.min(
          initialDelay * Math.pow(backoffMultiplier, attempt),
          maxDelay
        );
        
        onRetry(error, attempt + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Request queue to prevent concurrent requests
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private minInterval = 500; // Minimum interval between requests
  
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.process();
    });
  }
  
  private async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const fn = this.queue.shift();
      if (fn) {
        await fn();
        await new Promise(resolve => setTimeout(resolve, this.minInterval));
      }
    }
    
    this.processing = false;
  }
}

export const billingRequestQueue = new RequestQueue();