import { LLMClientFactory, LLMClientOptions, LLMClientType } from '../LLMClientFactory';
import { MockLLMClient } from '../MockLLMClient';
import { RetryableLLMClient } from '../RetryableLLMClient';

// Mock the implementations
jest.mock('../MockLLMClient');
jest.mock('../RetryableLLMClient');

describe('LLMClientFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a MockLLMClient when type is "mock"', () => {
    // Arrange
    const options: LLMClientOptions = {
      type: 'mock',
      enableRetry: false
    };

    // Act
    const client = LLMClientFactory.createClient(options);

    // Assert
    expect(MockLLMClient).toHaveBeenCalledTimes(1);
    expect(RetryableLLMClient).not.toHaveBeenCalled();
    expect(client).toBeInstanceOf(MockLLMClient);
  });

  it('should create a RetryableLLMClient wrapping MockLLMClient when enableRetry is true', () => {
    // Arrange
    const options: LLMClientOptions = {
      type: 'mock',
      enableRetry: true,
      retryConfig: {
        maxRetries: 5,
        initialDelayMs: 200
      }
    };

    // Act
    const client = LLMClientFactory.createClient(options);

    // Assert
    expect(MockLLMClient).toHaveBeenCalledTimes(1);
    expect(RetryableLLMClient).toHaveBeenCalledTimes(1);
    expect(RetryableLLMClient).toHaveBeenCalledWith(
      expect.any(MockLLMClient),
      options.retryConfig
    );
    expect(client).toBeInstanceOf(RetryableLLMClient);
  });

  it('should throw error when type is "real" (not implemented)', () => {
    // Arrange
    const options: LLMClientOptions = {
      type: 'real'
    };

    // Act & Assert
    expect(() => {
      LLMClientFactory.createClient(options);
    }).toThrow('Real LLMClient not implemented yet');
  });

  it('should throw error for unknown client type', () => {
    // Arrange
    const invalidType = 'unknown' as LLMClientType; // Type assertion to fix error
    const options: LLMClientOptions = {
      type: invalidType
    };

    // Act & Assert
    expect(() => {
      LLMClientFactory.createClient(options);
    }).toThrow('Unknown LLMClient type: unknown');
  });
}); 