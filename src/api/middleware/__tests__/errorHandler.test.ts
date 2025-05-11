import { Request, Response } from 'express';
import { errorHandler, ApiError } from '../errorHandler';

// Mock the logger to prevent console output during tests
jest.mock('../../../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
}));

describe('Error Handler Middleware', () => {
  // Create mock request and response objects
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  
  beforeEach(() => {
    mockRequest = {
      path: '/test/path',
      method: 'GET'
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    mockNext = jest.fn();
  });
  
  it('should handle errors with statusCode and return appropriate response', () => {
    // Arrange
    const testError: ApiError = new Error('Test error message') as ApiError;
    testError.statusCode = 400;
    testError.details = { field: 'test' };
    
    // Act
    errorHandler(testError, mockRequest as Request, mockResponse as Response, mockNext);
    
    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Test error message',
      details: { field: 'test' }
    });
  });
  
  it('should default to 500 status code if not provided', () => {
    // Arrange
    const testError: ApiError = new Error('Internal error') as ApiError;
    
    // Act
    errorHandler(testError, mockRequest as Request, mockResponse as Response, mockNext);
    
    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Internal error',
      details: undefined
    });
  });
  
  it('should use default message if error message is empty', () => {
    // Arrange
    const testError: ApiError = new Error() as ApiError;
    testError.message = '';
    
    // Act
    errorHandler(testError, mockRequest as Request, mockResponse as Response, mockNext);
    
    // Assert
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Internal Server Error'
      })
    );
  });
}); 