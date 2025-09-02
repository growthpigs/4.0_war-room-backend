import { mentionlyticsApiToken } from "./config";
import { checkRateLimit } from "./rate_limiter";
import log from "encore.dev/log";

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class MentionlyticsClient {
  private baseUrl = "https://api.mentionlytics.com/v1/";
  private apiToken: string;
  private defaultTimeout = 30000; // 30 seconds
  private defaultRetries = 3;

  constructor() {
    this.apiToken = mentionlyticsApiToken();
  }

  async makeRequest<T>(
    endpoint: string,
    params: Record<string, any> = {},
    options: RequestOptions = {}
  ): Promise<T> {
    checkRateLimit();

    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = 1000
    } = options;

    const url = new URL(endpoint, this.baseUrl);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    let lastError: Error;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        log.info(`Making request to Mentionlytics API`, {
          endpoint,
          attempt,
          params
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'WarRoom/1.0'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay * Math.pow(2, attempt - 1);
            
            log.warn(`Rate limited by Mentionlytics API, retrying after ${delay}ms`, {
              attempt,
              status: response.status
            });
            
            if (attempt < retries) {
              await this.sleep(delay);
              continue;
            }
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        log.info(`Successful response from Mentionlytics API`, {
          endpoint,
          attempt,
          dataSize: JSON.stringify(data).length
        });

        return data;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        log.error(`Request attempt ${attempt} failed`, {
          endpoint,
          attempt,
          error: lastError.message
        });

        if (attempt < retries && this.isRetryableError(lastError)) {
          const delay = retryDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
          continue;
        }

        break;
      }
    }

    throw lastError;
  }

  private isRetryableError(error: Error): boolean {
    const retryableMessages = [
      'fetch failed',
      'network error',
      'timeout',
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED'
    ];

    return retryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isConfigured(): boolean {
    return !!this.apiToken && this.apiToken.length > 0;
  }
}

export const mentionlyticsClient = new MentionlyticsClient();
