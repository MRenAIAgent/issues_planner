import { IssueService } from '../IssueService';
import { IssueRepository } from '../../domain/interfaces/IssueRepository';
import { LLMClient, LLMAnalysisResponse, LLMIssuePlanResponse } from '../../domain/interfaces/LLMClient';
import { Issue, IssueComment } from '../../domain/models/Issue';

// Mock implementation of IssueRepository for testing
class MockIssueRepository implements IssueRepository {
  private issues: Map<string, Issue> = new Map();
  private comments: Map<string, any> = new Map();

  async findAll(): Promise<Issue[]> {
    return Array.from(this.issues.values());
  }

  async findById(id: string): Promise<Issue | null> {
    return this.issues.get(id) || null;
  }

  async save(issue: Issue): Promise<Issue> {
    this.issues.set(issue.id, { ...issue });
    return issue;
  }

  async update(id: string, issue: Partial<Issue>): Promise<Issue | null> {
    const existingIssue = this.issues.get(id);
    if (!existingIssue) return null;
    
    const updatedIssue = { ...existingIssue, ...issue };
    this.issues.set(id, updatedIssue);
    return updatedIssue;
  }

  async delete(id: string): Promise<boolean> {
    return this.issues.delete(id);
  }

  async addComment(comment: any): Promise<any> {
    this.comments.set(comment.id, comment);
    return comment;
  }

  async findCommentsByIssueId(issueId: string): Promise<any[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.issueId === issueId);
  }

  async findCommentById(id: string): Promise<any | null> {
    return this.comments.get(id) || null;
  }

  async deleteComment(id: string): Promise<boolean> {
    return this.comments.delete(id);
  }
}

// Mock implementation of LLMClient for testing
class MockLLMClientForTest implements LLMClient {
  async analyzeIssue(input: Issue): Promise<LLMAnalysisResponse> {
    return {
      labels: ['test-label'],
      assignedTo: 'test@example.com',
      confidence: 0.9,
      priority: 'medium'
    };
  }

  async planIssue(input: Issue): Promise<LLMIssuePlanResponse> {
    return {
      plan: 'Test plan for ' + input.title
    };
  }
}

describe('IssueService', () => {
  let issueService: IssueService;
  let mockRepository: jest.Mocked<IssueRepository>;
  let mockLLMClient: jest.Mocked<LLMClient>;
  
  // Helper to create a test issue
  const createTestIssue = (): Issue => ({
    id: 'test-issue-id',
    title: 'Test Issue',
    description: 'Test Description',
    author: 'test-author',
    createdAt: '2024-01-01T00:00:00Z',
    comments: []
  });
  
  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addComment: jest.fn(),
      findCommentsByIssueId: jest.fn(),
      findCommentById: jest.fn(),
      deleteComment: jest.fn()
    } as unknown as jest.Mocked<IssueRepository>;
    
    // Create mock LLM client
    mockLLMClient = {
      analyzeIssue: jest.fn(),
      planIssue: jest.fn()
    } as unknown as jest.Mocked<LLMClient>;
    
    // Create service with mocks
    issueService = new IssueService(mockRepository, mockLLMClient);
    
    // Mock Date.now to return a consistent timestamp
    jest.spyOn(Date, 'now').mockImplementation(() => 1672531200000); // 2023-01-01T00:00:00Z
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('processIssueEvent', () => {
    it('should create a new issue in the repository', async () => {
      // Arrange
      const event = {
        id: 'test-issue-id',
        title: 'Test Issue',
        description: 'Test description',
        author: 'test@example.com',
        createdAt: '2023-01-01T00:00:00Z'
      };
      
      // Mock the implementation
      mockRepository.findById.mockResolvedValue(null);
      mockRepository.save.mockImplementation(async (issue) => issue);
      
      // Act
      const result = await issueService.processIssueEvent(event);
      
      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(event.id);
      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        id: event.id,
        title: event.title,
        description: event.description,
        author: event.author,
        createdAt: event.createdAt,
        status: 'open',
        comments: [],
        updatedAt: expect.any(String)
      }));
      expect(result).toEqual(expect.objectContaining({
        id: event.id,
        title: event.title,
        description: event.description,
        author: event.author,
        createdAt: event.createdAt
      }));
    });
    
    it('should update an existing issue when event has existing id', async () => {
      // Arrange
      const existingIssue = createTestIssue();
      const updatedEvent = {
        id: existingIssue.id,
        title: 'Updated Title',
        description: 'Updated description',
        author: existingIssue.author,
        createdAt: existingIssue.createdAt
      };
      
      // Mock repository behavior
      mockRepository.findById.mockResolvedValue(existingIssue);
      mockRepository.update.mockImplementation(async (id, data) => ({
        ...existingIssue,
        ...data
      }));
      
      // Act
      const result = await issueService.processIssueEvent(updatedEvent);
      
      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(updatedEvent.id);
      expect(mockRepository.update).toHaveBeenCalledWith(
        updatedEvent.id,
        expect.objectContaining({
          title: updatedEvent.title,
          description: updatedEvent.description,
          updatedAt: expect.any(String)
        })
      );
      expect(result).toEqual(expect.objectContaining({
        ...existingIssue,
        title: updatedEvent.title,
        description: updatedEvent.description
      }));
    });
    
    it('should handle repository errors during save', async () => {
      // Arrange
      const event = {
        id: 'test-issue-id',
        title: 'Test Issue',
        description: 'Test description',
        author: 'test@example.com',
        createdAt: '2023-01-01T00:00:00Z'
      };
      
      mockRepository.findById.mockResolvedValue(null);
      const error = new Error('Save error');
      mockRepository.save.mockRejectedValue(error);
      
      // Act & Assert
      await expect(issueService.processIssueEvent(event))
        .rejects
        .toThrow('Save error');
    });
    
    it('should handle repository errors during update', async () => {
      // Arrange
      const existingIssue = createTestIssue();
      const updatedEvent = {
        id: existingIssue.id,
        title: 'Updated Title',
        description: 'Updated description',
        author: existingIssue.author,
        createdAt: existingIssue.createdAt
      };
      
      mockRepository.findById.mockResolvedValue(existingIssue);
      const error = new Error('Update error');
      mockRepository.update.mockRejectedValue(error);
      
      // Act & Assert
      await expect(issueService.processIssueEvent(updatedEvent))
        .rejects
        .toThrow('Update error');
    });
  });
  
  describe('getAllIssues', () => {
    it('should return all issues from repository', async () => {
      // Arrange
      const issues = [createTestIssue(), createTestIssue()];
      mockRepository.findAll.mockResolvedValue(issues);
      
      // Act
      const result = await issueService.getAllIssues();
      
      // Assert
      expect(result).toBe(issues);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });
    
    it('should handle repository errors and rethrow them', async () => {
      // Arrange
      const error = new Error('Database error');
      mockRepository.findAll.mockRejectedValue(error);
      
      // Act & Assert
      await expect(issueService.getAllIssues())
        .rejects
        .toThrow('Database error');
    });
  });
  
  describe('getIssueById', () => {
    it('should return issue from repository if found', async () => {
      // Arrange
      const issue = createTestIssue();
      mockRepository.findById.mockResolvedValue(issue);
      
      // Act
      const result = await issueService.getIssueById(issue.id);
      
      // Assert
      expect(result).toBe(issue);
      expect(mockRepository.findById).toHaveBeenCalledWith(issue.id);
    });
    
    it('should throw error when issue is not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);
      
      // Mock the implementation to throw an error
      mockRepository.findById.mockImplementation(async (id) => {
        if (id === 'non-existent-id') {
          throw new Error(`Issue with ID ${id} not found`);
        }
        return null;
      });
      
      // Act & Assert
      await expect(issueService.getIssueById('non-existent-id'))
        .rejects
        .toThrow('Issue with ID non-existent-id not found');
    });
    
    it('should handle repository errors and rethrow them', async () => {
      // Arrange
      const error = new Error('Repository error');
      mockRepository.findById.mockRejectedValue(error);
      
      // Act & Assert
      await expect(issueService.getIssueById('any-id'))
        .rejects
        .toThrow('Repository error');
    });
  });
  
  describe('addComment', () => {
    it('should add comment to issue and return it', async () => {
      // Arrange
      const issueId = 'test-issue-id';
      const content = 'Test comment content';
      const author = 'test-author';
      
      // Mock finding the issue first
      mockRepository.findById.mockResolvedValue(createTestIssue());
      
      const savedComment = {
        id: 'generated-comment-id',
        issueId,
        content,
        author,
        createdAt: '2023-01-01T00:00:00Z' // Using the mocked date
      };
      
      mockRepository.addComment.mockResolvedValue(savedComment as IssueComment);
      
      // Act
      const result = await issueService.addComment(issueId, content, author);
      
      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(issueId);
      expect(result).toBe(savedComment);
      expect(mockRepository.addComment).toHaveBeenCalledWith(expect.objectContaining({
        issueId,
        content,
        author,
        createdAt: expect.any(String)
      }));
    });
    
    it('should handle repository errors and rethrow them', async () => {
      // Arrange
      // Mock finding the issue first
      mockRepository.findById.mockResolvedValue(createTestIssue());
      
      const error = new Error('Comment error');
      mockRepository.addComment.mockRejectedValue(error);
      
      // Act & Assert
      await expect(issueService.addComment('test-issue-id', 'content', 'author'))
        .rejects
        .toThrow('Comment error');
    });
  });
  
  describe('analyzeIssue', () => {
    it('should analyze issue using LLM client and update the issue', async () => {
      // Arrange
      const issue = createTestIssue();
      mockRepository.findById.mockResolvedValue(issue);
      
      const analysisResponse: LLMAnalysisResponse = {
        labels: ['bug', 'critical'],
        assignedTo: 'developer@example.com',
        confidence: 0.95,
        priority: 'high'
      };
      
      mockLLMClient.analyzeIssue.mockResolvedValue(analysisResponse);
      
      const updatedIssue = {
        ...issue,
        ...analysisResponse,
        updatedAt: '2023-01-01T00:00:00Z' // Using the mocked date
      };
      
      mockRepository.update.mockResolvedValue(updatedIssue as Issue);
      
      // Act
      const result = await issueService.analyzeIssue(issue.id);
      
      // Assert
      expect(result).toBe(updatedIssue);
      expect(mockRepository.findById).toHaveBeenCalledWith(issue.id);
      expect(mockLLMClient.analyzeIssue).toHaveBeenCalledWith(issue);
      // The update call should include all fields from analysisResponse plus updatedAt
      expect(mockRepository.update).toHaveBeenCalledWith(
        issue.id, 
        expect.objectContaining({
          ...analysisResponse,
          updatedAt: expect.any(String)
        })
      );
    });
    
    it('should throw error when issue to analyze is not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);
      
      // Mock implementation to throw error
      mockRepository.findById.mockImplementation(async (id) => {
        if (id === 'non-existent-id') {
          throw new Error(`Issue with ID ${id} not found`);
        }
        return null;
      });
      
      // Act & Assert
      await expect(issueService.analyzeIssue('non-existent-id'))
        .rejects
        .toThrow('Issue with ID non-existent-id not found');
    });
    
    it('should handle LLM client errors and rethrow them', async () => {
      // Arrange
      const issue = createTestIssue();
      mockRepository.findById.mockResolvedValue(issue);
      
      const error = new Error('LLM analysis error');
      mockLLMClient.analyzeIssue.mockRejectedValue(error);
      
      // Act & Assert
      await expect(issueService.analyzeIssue(issue.id))
        .rejects
        .toThrow('LLM analysis error');
    });
    
    it('should handle repository update errors and rethrow them', async () => {
      // Arrange
      const issue = createTestIssue();
      mockRepository.findById.mockResolvedValue(issue);
      
      const analysisResponse: LLMAnalysisResponse = {
        labels: ['bug'],
        assignedTo: 'developer@example.com',
        confidence: 0.9,
        priority: 'medium'
      };
      
      mockLLMClient.analyzeIssue.mockResolvedValue(analysisResponse);
      
      const error = new Error('Update error');
      mockRepository.update.mockRejectedValue(error);
      
      // Act & Assert
      await expect(issueService.analyzeIssue(issue.id))
        .rejects
        .toThrow('Update error');
    });
  });
  
  describe('planIssue', () => {
    it('should generate plan for issue using LLM client and add it to comments', async () => {
      // Arrange
      const issue = createTestIssue();
      mockRepository.findById.mockResolvedValue(issue);
      
      const planResponse: LLMIssuePlanResponse = {
        plan: 'Test plan for the issue'
      };
      
      mockLLMClient.planIssue.mockResolvedValue(planResponse);
      
      const updatedIssue = {
        ...issue,
        plan: planResponse.plan,
        updatedAt: '2023-01-01T00:00:00Z' // Using the mocked date
      };
      
      mockRepository.update.mockResolvedValue(updatedIssue as Issue);
      
      // Mock the addSystemComment behavior
      mockRepository.addComment.mockResolvedValue({
        id: expect.any(String),
        issueId: issue.id,
        content: 'Issue plan generated',
        author: 'system',
        createdAt: expect.any(String)
      } as IssueComment);
      
      // Act
      const result = await issueService.planIssue(issue.id);
      
      // Assert
      expect(result).toBe(updatedIssue);
      expect(mockRepository.findById).toHaveBeenCalledWith(issue.id);
      expect(mockLLMClient.planIssue).toHaveBeenCalledWith(issue);
      expect(mockRepository.update).toHaveBeenCalledWith(
        issue.id,
        expect.objectContaining({
          plan: planResponse.plan,
          updatedAt: expect.any(String)
        })
      );
      expect(mockRepository.addComment).toHaveBeenCalledWith(
        expect.objectContaining({
          issueId: issue.id,
          content: 'Issue plan generated',
          author: 'system',
          createdAt: expect.any(String)
        })
      );
    });
    
    it('should throw error when issue to plan is not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);
      
      // Act
      const result = await issueService.planIssue('non-existent-id');
      
      // Assert
      expect(result).toBeNull();
      expect(mockRepository.findById).toHaveBeenCalledWith('non-existent-id');
      expect(mockLLMClient.planIssue).not.toHaveBeenCalled();
    });
    
    it('should handle LLM client errors and rethrow them', async () => {
      // Arrange
      const issue = createTestIssue();
      mockRepository.findById.mockResolvedValue(issue);
      
      const error = new Error('LLM planning error');
      mockLLMClient.planIssue.mockRejectedValue(error);
      
      // Act & Assert
      await expect(issueService.planIssue(issue.id))
        .rejects
        .toThrow('LLM planning error');
    });
    
    it('should handle repository add comment errors and rethrow them', async () => {
      // Arrange
      const issue = createTestIssue();
      mockRepository.findById.mockResolvedValue(issue);
      
      const planResponse: LLMIssuePlanResponse = {
        plan: 'Test plan for the issue'
      };
      
      mockLLMClient.planIssue.mockResolvedValue(planResponse);
      
      const error = new Error('Add comment error');
      mockRepository.addComment.mockRejectedValue(error);
      
      // Act & Assert
      await expect(issueService.planIssue(issue.id))
        .rejects
        .toThrow('Add comment error');
    });
  });
}); 