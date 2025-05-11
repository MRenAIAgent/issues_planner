import { RetryableLLMClient, RetryConfig } from '../RetryableLLMClient';
import { LLMClient, LLMAnalysisResponse, LLMIssuePlanResponse } from '../../../domain/interfaces/LLMClient';
import { Issue } from '../../../domain/models/Issue';

// Mock the setTimeout function globally
jest.mock('timers', () => ({
  setTimeout: (callback: Function, ms: number) => {
    callback();
    return null;
  }
}));

describe('RetryableLLMClient', () => {
  // Test issue
  const testIssue: Issue = {
    id: 'test-123',
    title: 'Test Issue',
    description: 'Test Description',
    author: 'test@example.com',
    createdAt: new Date().toISOString()
  };

  // Mock responses
  const mockAnalysisResponse: LLMAnalysisResponse = {
    labels: ['test'],
    assignedTo: 'dev@example.com',
    confidence: 0.9,
    priority: 'medium'
  };

  const mockPlanResponse: LLMIssuePlanResponse = {
    plan: 'Test plan'
  };

  // Create a mock implementation for the base LLMClient
  class FailingLLMClient implements LLMClient {
    private failuresRemaining: { [method: string]: number } = {};

    constructor(failureConfig: { [method: string]: number }) {
      this.failuresRemaining = { ...failureConfig };
    }

    async analyzeIssue(input: Issue): Promise<LLMAnalysisResponse> {
      if (this.failuresRemaining['analyzeIssue'] > 0) {
        this.failuresRemaining['analyzeIssue']--;
        throw new Error('Simulated failure in analyzeIssue');
      }
      return mockAnalysisResponse;
    }

    async planIssue(input: Issue): Promise<LLMIssuePlanResponse> {
      if (this.failuresRemaining['planIssue'] > 0) {
        this.failuresRemaining['planIssue']--;
        throw new Error('Simulated failure in planIssue');
      }
      return mockPlanResponse;
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeIssue', () => {
    it('should succeed immediately if base client succeeds', async () => {
      // Arrange
      const baseClient = new FailingLLMClient({ analyzeIssue: 0 });
      const client = new RetryableLLMClient(baseClient);
      
      // Act
      const response = await client.analyzeIssue(testIssue);
      
      // Assert
      expect(response).toEqual(mockAnalysisResponse);
    });

    it('should retry when base client fails and then succeed', async () => {
      // Arrange
      const baseClient = new FailingLLMClient({ analyzeIssue: 1 });
      const retryConfig: Partial<RetryConfig> = {
        maxRetries: 3,
        initialDelayMs: 100,
        backoffFactor: 2
      };
      const client = new RetryableLLMClient(baseClient, retryConfig);
      
      // Create a spy to track method calls
      const analyzeIssueSpy = jest.spyOn(baseClient, 'analyzeIssue');
      
      // Act & Assert
      const response = await client.analyzeIssue(testIssue);
      
      // Should have been called twice (once failing, once succeeding)
      expect(analyzeIssueSpy).toHaveBeenCalledTimes(2);
      expect(response).toEqual(mockAnalysisResponse);
    });

    it('should throw an error when max retries is exceeded', async () => {
      // Arrange
      const baseClient = new FailingLLMClient({ analyzeIssue: 5 }); // Will always fail
      const retryConfig: Partial<RetryConfig> = {
        maxRetries: 2,
        initialDelayMs: 100,
        backoffFactor: 1.5
      };
      const client = new RetryableLLMClient(baseClient, retryConfig);

      // Act & Assert
      await expect(client.analyzeIssue(testIssue)).rejects.toThrow('Simulated failure in analyzeIssue');
    });
  });

  describe('planIssue', () => {
    it('should succeed immediately if base client succeeds', async () => {
      // Arrange
      const baseClient = new FailingLLMClient({ planIssue: 0 });
      const client = new RetryableLLMClient(baseClient);
      
      // Act
      const response = await client.planIssue(testIssue);
      
      // Assert
      expect(response).toEqual(mockPlanResponse);
    });

    it('should retry when base client fails and then succeed', async () => {
      // Arrange
      const baseClient = new FailingLLMClient({ planIssue: 1 });
      const retryConfig: Partial<RetryConfig> = {
        maxRetries: 3,
        initialDelayMs: 100,
        backoffFactor: 2
      };
      const client = new RetryableLLMClient(baseClient, retryConfig);
      
      // Create a spy to track method calls
      const planIssueSpy = jest.spyOn(baseClient, 'planIssue');
      
      // Act & Assert
      const response = await client.planIssue(testIssue);
      
      // Should have been called twice (once failing, once succeeding)
      expect(planIssueSpy).toHaveBeenCalledTimes(2);
      expect(response).toEqual(mockPlanResponse);
    });
  });
}); 