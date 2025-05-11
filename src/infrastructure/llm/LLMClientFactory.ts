import { LLMClient } from '../../domain/interfaces/LLMClient';
import { MockLLMClient } from './MockLLMClient';
import { RetryableLLMClient, RetryConfig } from './RetryableLLMClient';

export type LLMClientType = 'mock' | 'real'; // 'real' would be the actual implementation

export interface LLMClientOptions {
  type: LLMClientType;
  enableRetry?: boolean;
  retryConfig?: Partial<RetryConfig>;
}

export class LLMClientFactory {
  /**
   * Create an LLMClient instance based on the specified options
   */
  static createClient(options: LLMClientOptions): LLMClient {
    let client: LLMClient;

    // Create the base client based on type
    switch (options.type) {
      case 'mock':
        client = new MockLLMClient();
        break;
      case 'real':
        // In a real implementation, this would create the actual LLMClient
        throw new Error('Real LLMClient not implemented yet');
      default:
        throw new Error(`Unknown LLMClient type: ${options.type}`);
    }

    // Wrap with RetryableLLMClient if retry is enabled
    if (options.enableRetry) {
      return new RetryableLLMClient(client, options.retryConfig);
    }

    return client;
  }
} 