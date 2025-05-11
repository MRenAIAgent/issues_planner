import { Request, Response, NextFunction } from 'express';
import { IssueController } from '../IssueController';
import { IssueService } from '../../../services/IssueService';
import { Issue, IssueEvent } from '../../../domain/models/Issue';

// Mock the IssueService
jest.mock('../../../services/IssueService');

describe('IssueController', () => {
  let controller: IssueController;
  let mockIssueService: jest.Mocked<IssueService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    // Create mock service
    mockIssueService = {
      processIssueEvent: jest.fn(),
      getAllIssues: jest.fn(),
      getIssueById: jest.fn(),
      analyzeIssue: jest.fn(),
      planIssue: jest.fn(),
      addComment: jest.fn(),
    } as unknown as jest.Mocked<IssueService>;

    // Create controller with mock service
    controller = new IssueController(mockIssueService);

    // Reset mocks for each test
    mockRequest = {
      body: {},
      params: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('processEvent', () => {
    it('should process a valid issue event', async () => {
      // Arrange
      const issueEvent: IssueEvent = {
        id: 'issue-123',
        title: 'Test Issue',
        description: 'Test description',
        author: 'test@example.com',
        createdAt: new Date().toISOString(),
      };
      
      const mockIssue: Issue = {
        ...issueEvent,
        status: 'open',
        comments: [],
        updatedAt: issueEvent.createdAt,
      };
      
      mockRequest.body = issueEvent;
      mockIssueService.processIssueEvent.mockResolvedValue(mockIssue);

      // Act
      await controller.processEvent(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockIssueService.processIssueEvent).toHaveBeenCalledWith(issueEvent);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { issue: mockIssue },
      });
    });

    it('should handle invalid issue event', async () => {
      // Arrange
      mockRequest.body = { id: 'issue-123' }; // Missing required fields

      // Act
      await controller.processEvent(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockIssueService.processIssueEvent).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      expect(mockNext.mock.calls[0][0]).toHaveProperty('statusCode', 400);
    });
  });

  describe('listIssues', () => {
    it('should return all issues', async () => {
      // Arrange
      const mockIssues: Issue[] = [
        {
          id: 'issue-1',
          title: 'Issue 1',
          description: 'Description 1',
          author: 'author1@example.com',
          createdAt: new Date().toISOString(),
          status: 'open',
        },
        {
          id: 'issue-2',
          title: 'Issue 2',
          description: 'Description 2',
          author: 'author2@example.com',
          createdAt: new Date().toISOString(),
          status: 'open',
        },
      ];
      
      mockIssueService.getAllIssues.mockResolvedValue(mockIssues);

      // Act
      await controller.listIssues(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockIssueService.getAllIssues).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { issues: mockIssues },
      });
    });
  });

  describe('getIssue', () => {
    it('should return a specific issue when it exists', async () => {
      // Arrange
      const issueId = 'issue-123';
      const mockIssue: Issue = {
        id: issueId,
        title: 'Test Issue',
        description: 'Test description',
        author: 'test@example.com',
        createdAt: new Date().toISOString(),
        status: 'open',
      };
      
      mockRequest.params = { issueId };
      mockIssueService.getIssueById.mockResolvedValue(mockIssue);

      // Act
      await controller.getIssue(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockIssueService.getIssueById).toHaveBeenCalledWith(issueId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { issue: mockIssue },
      });
    });

    it('should handle non-existent issue', async () => {
      // Arrange
      const issueId = 'non-existent';
      mockRequest.params = { issueId };
      mockIssueService.getIssueById.mockResolvedValue(null);

      // Act
      await controller.getIssue(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockIssueService.getIssueById).toHaveBeenCalledWith(issueId);
      expect(mockNext).toHaveBeenCalled();
      expect(mockNext.mock.calls[0][0]).toHaveProperty('statusCode', 404);
    });
  });

  describe('analyzeIssue', () => {
    it('should analyze an issue and return results', async () => {
      // Arrange
      const issueId = 'issue-123';
      const mockIssue: Issue = {
        id: issueId,
        title: 'Test Issue',
        description: 'Test description',
        author: 'test@example.com',
        createdAt: new Date().toISOString(),
        status: 'open',
        labels: ['feature'],
        assignedTo: 'dev@example.com',
        confidence: 0.85,
        priority: 'medium',
      };
      
      mockRequest.params = { issueId };
      mockIssueService.analyzeIssue.mockResolvedValue(mockIssue);

      // Act
      await controller.analyzeIssue(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockIssueService.analyzeIssue).toHaveBeenCalledWith(issueId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { issue: mockIssue },
      });
    });

    it('should handle analysis of non-existent issue', async () => {
      // Arrange
      const issueId = 'non-existent';
      mockRequest.params = { issueId };
      mockIssueService.analyzeIssue.mockResolvedValue(null);

      // Act
      await controller.analyzeIssue(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockIssueService.analyzeIssue).toHaveBeenCalledWith(issueId);
      expect(mockNext).toHaveBeenCalled();
      expect(mockNext.mock.calls[0][0]).toHaveProperty('statusCode', 404);
    });
  });

  describe('planIssue', () => {
    it('should generate a plan for an issue', async () => {
      // Arrange
      const issueId = 'issue-123';
      const mockIssue: Issue = {
        id: issueId,
        title: 'Test Issue',
        description: 'Test description',
        author: 'test@example.com',
        createdAt: new Date().toISOString(),
        status: 'open',
        plan: 'Step 1: Analyze\nStep 2: Implement\nStep 3: Test',
      };
      
      mockRequest.params = { issueId };
      mockIssueService.planIssue.mockResolvedValue(mockIssue);

      // Act
      await controller.planIssue(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockIssueService.planIssue).toHaveBeenCalledWith(issueId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { issue: mockIssue },
      });
    });

    it('should handle planning of non-existent issue', async () => {
      // Arrange
      const issueId = 'non-existent';
      mockRequest.params = { issueId };
      mockIssueService.planIssue.mockResolvedValue(null);

      // Act
      await controller.planIssue(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockIssueService.planIssue).toHaveBeenCalledWith(issueId);
      expect(mockNext).toHaveBeenCalled();
      expect(mockNext.mock.calls[0][0]).toHaveProperty('statusCode', 404);
    });
  });
}); 