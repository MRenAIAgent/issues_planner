import { Request, Response } from 'express';
import { requestLogger } from '../requestLogger';
import logger from '../../../utils/logger';

// Mock the logger
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('Request Logger Middleware', () => {
  // Create mock request, response and next function
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      method: 'GET',
      path: '/test',
      query: { param: 'value' },
      ip: '127.0.0.1'
    };
    
    mockResponse = {
      statusCode: 200,
      send: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });
  
  it('should log incoming requests', () => {
    // Act
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
    
    // Assert
    expect(logger.info).toHaveBeenCalledWith('Incoming request', {
      method: 'GET',
      path: '/test',
      query: { param: 'value' },
      ip: '127.0.0.1'
    });
    expect(mockNext).toHaveBeenCalled();
  });
  
  it('should log response when send is called', () => {
    // Arrange
    const originalDateNow = Date.now;
    const mockDateNow = jest.fn()
      .mockReturnValueOnce(1000) // First call when middleware is invoked
      .mockReturnValueOnce(1200); // Second call when response.send is called
    Date.now = mockDateNow;
    
    // Act
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
    
    // Simulate sending a response
    (mockResponse.send as jest.Mock)('test response');
    
    // Assert
    expect(logger.info).toHaveBeenCalledWith('Response sent', {
      method: 'GET',
      path: '/test',
      statusCode: 200,
      duration: '200ms'
    });
    
    // Restore original Date.now
    Date.now = originalDateNow;
  });
  
  it('should preserve the original send functionality', () => {
    // Arrange
    const originalSend = jest.fn().mockReturnValue('original result');
    mockResponse.send = originalSend;
    
    // Act
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
    const result = (mockResponse.send as jest.Mock)('test body');
    
    // Assert
    expect(originalSend).toHaveBeenCalledWith('test body');
    expect(result).toBe('original result');
  });
}); 