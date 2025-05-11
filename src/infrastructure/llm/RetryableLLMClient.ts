import { LLMClient, LLMAnalysisResponse, LLMIssuePlanResponse } from '../../domain/interfaces/LLMClient';
import { Issue } from '../../domain/models/Issue';
import logger from '../../utils/logger';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  backoffFactor: number;
  maxDelayMs: number;
}

export class RetryableLLMClient implements LLMClient {
  private readonly defaultConfig: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 500,
    backoffFactor: 2,
    maxDelayMs: 10000
  };

  constructor(
    private readonly llmClient: LLMClient,
    private readonly config: Partial<RetryConfig> = {}
  ) {
    // Merge default config with provided config
    this.config = {
      ...this.defaultConfig,
      ...config
    };
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    issueId: string
  ): Promise<T> {
    const config = this.config as RetryConfig;
    let lastError: Error = new Error('Unknown error'); // Initialize with a default error
    let delayMs = config.initialDelayMs;

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        // Attempt the operation
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // If this was our last attempt, propagate the error
        if (attempt > config.maxRetries) {
          logger.error(`${operationName} failed after ${config.maxRetries + 1} attempts`, {
            issueId,
            error: lastError.message
          });
          throw lastError;
        }

        // Log retry attempt
        logger.warn(`${operationName} failed (attempt ${attempt}/${config.maxRetries + 1}), retrying in ${delayMs}ms`, {
          issueId,
          error: error.message
        });

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        // Exponential backoff for next retry
        delayMs = Math.min(delayMs * config.backoffFactor, config.maxDelayMs);
      }
    }

    // This should never be reached due to the throw in the loop
    throw lastError;
  }

  async analyzeIssue(input: Issue): Promise<LLMAnalysisResponse> {
    return this.retryOperation(
      () => this.llmClient.analyzeIssue(input),
      'LLM Analysis',
      input.id
    );
  }

  async planIssue(input: Issue): Promise<LLMIssuePlanResponse> {
    return this.retryOperation(
      () => this.llmClient.planIssue(input),
      'LLM Planning',
      input.id
    );
  }
} 