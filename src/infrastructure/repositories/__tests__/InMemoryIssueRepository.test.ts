import { InMemoryIssueRepository } from '../InMemoryIssueRepository';
import { Issue, IssueComment } from '../../../domain/models/Issue';

describe('InMemoryIssueRepository', () => {
  let repository: InMemoryIssueRepository;
  
  // Helper to create a test issue
  const createTestIssue = (): Issue => ({
    id: 'test-issue-id',
    title: 'Test Issue',
    description: 'Test Description',
    author: 'test-author',
    createdAt: '2024-01-01T00:00:00Z',
    comments: []
  });
  
  // Helper to create a test comment
  const createTestComment = (issueId: string): IssueComment => ({
    id: 'test-comment-id',
    issueId,
    content: 'Test comment content',
    author: 'test-commenter',
    createdAt: '2024-01-01T00:00:00Z'
  });
  
  beforeEach(() => {
    repository = new InMemoryIssueRepository();
  });
  
  describe('findAll', () => {
    it('should return an empty array when no issues exist', async () => {
      // Act
      const result = await repository.findAll();
      
      // Assert
      expect(result).toEqual([]);
    });
    
    it('should return all issues with their comments', async () => {
      // Arrange
      const issue1 = { ...createTestIssue(), id: 'issue-1' };
      const issue2 = { ...createTestIssue(), id: 'issue-2' };
      
      await repository.save(issue1);
      await repository.save(issue2);
      
      const comment1 = { ...createTestComment('issue-1'), id: 'comment-1' };
      const comment2 = { ...createTestComment('issue-1'), id: 'comment-2' };
      const comment3 = { ...createTestComment('issue-2'), id: 'comment-3' };
      
      await repository.addComment(comment1);
      await repository.addComment(comment2);
      await repository.addComment(comment3);
      
      // Act
      const result = await repository.findAll();
      
      // Assert
      expect(result).toHaveLength(2);
      
      const resultIssue1 = result.find(issue => issue.id === 'issue-1');
      const resultIssue2 = result.find(issue => issue.id === 'issue-2');
      
      expect(resultIssue1?.comments).toHaveLength(2);
      expect(resultIssue2?.comments).toHaveLength(1);
    });
  });
  
  describe('findById', () => {
    it('should return null for non-existent issue', async () => {
      // Act
      const result = await repository.findById('non-existent-id');
      
      // Assert
      expect(result).toBeNull();
    });
    
    it('should return the issue with its comments', async () => {
      // Arrange
      const issue = createTestIssue();
      await repository.save(issue);
      
      const comment1 = { ...createTestComment(issue.id), id: 'comment-1' };
      const comment2 = { ...createTestComment(issue.id), id: 'comment-2' };
      
      await repository.addComment(comment1);
      await repository.addComment(comment2);
      
      // Act
      const result = await repository.findById(issue.id);
      
      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(issue.id);
      expect(result?.comments).toHaveLength(2);
    });
  });
  
  describe('save', () => {
    it('should generate an ID if not provided', async () => {
      // Arrange
      const issue: Partial<Issue> = {
        title: 'Test Issue',
        description: 'Test Description',
        author: 'test-author',
        createdAt: '2024-01-01T00:00:00Z',
        comments: []
      };
      
      // Act
      const result = await repository.save(issue as Issue);
      
      // Assert
      expect(result.id).toBeDefined();
    });
    
    it('should set default status if not provided', async () => {
      // Arrange
      const issue = createTestIssue();
      delete (issue as any).status;
      
      // Act
      const result = await repository.save(issue);
      
      // Assert
      expect(result.status).toBe('open');
    });
    
    it('should initialize comments array if not provided', async () => {
      // Arrange
      const issue: Partial<Issue> = {
        id: 'test-issue-id',
        title: 'Test Issue',
        description: 'Test Description',
        author: 'test-author',
        createdAt: '2024-01-01T00:00:00Z'
      };
      
      // Act
      const result = await repository.save(issue as Issue);
      
      // Assert
      expect(result.comments).toEqual([]);
    });
  });
  
  describe('update', () => {
    it('should return null when updating non-existent issue', async () => {
      // Act
      const result = await repository.update('non-existent-id', { title: 'Updated Title' });
      
      // Assert
      expect(result).toBeNull();
    });
    
    it('should update the issue and return it with comments', async () => {
      // Arrange
      const issue = createTestIssue();
      await repository.save(issue);
      
      const comment = createTestComment(issue.id);
      await repository.addComment(comment);
      
      // Act
      const result = await repository.update(issue.id, { 
        title: 'Updated Title',
        labels: ['label1', 'label2']
      });
      
      // Assert
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Updated Title');
      expect(result?.labels).toEqual(['label1', 'label2']);
      expect(result?.comments).toHaveLength(1);
      expect(result?.updatedAt).toBeDefined();
    });
  });
  
  describe('delete', () => {
    it('should return false when deleting non-existent issue', async () => {
      // Act
      const result = await repository.delete('non-existent-id');
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should delete the issue and all related comments', async () => {
      // Arrange
      const issue = createTestIssue();
      await repository.save(issue);
      
      const comment1 = { ...createTestComment(issue.id), id: 'comment-1' };
      const comment2 = { ...createTestComment(issue.id), id: 'comment-2' };
      
      await repository.addComment(comment1);
      await repository.addComment(comment2);
      
      // Act
      const deleteResult = await repository.delete(issue.id);
      const findResult = await repository.findById(issue.id);
      const comments = await repository.findCommentsByIssueId(issue.id);
      
      // Assert
      expect(deleteResult).toBe(true);
      expect(findResult).toBeNull();
      expect(comments).toHaveLength(0);
    });
  });
  
  describe('addComment', () => {
    it('should throw an error when adding comment to non-existent issue', async () => {
      // Arrange
      const comment = createTestComment('non-existent-id');
      
      // Act & Assert
      await expect(repository.addComment(comment)).rejects.toThrow(
        'Issue with ID non-existent-id not found'
      );
    });
    
    it('should generate ID for comment if not provided', async () => {
      // Arrange
      const issue = createTestIssue();
      await repository.save(issue);
      
      const comment: Partial<IssueComment> = {
        issueId: issue.id,
        content: 'Test comment content',
        author: 'test-commenter',
        createdAt: '2024-01-01T00:00:00Z'
      };
      
      // Act
      const result = await repository.addComment(comment as IssueComment);
      
      // Assert
      expect(result.id).toBeDefined();
    });
  });
  
  describe('findCommentsByIssueId', () => {
    it('should return empty array for non-existent issue', async () => {
      // Act
      const result = await repository.findCommentsByIssueId('non-existent-id');
      
      // Assert
      expect(result).toEqual([]);
    });
    
    it('should return all comments for the issue', async () => {
      // Arrange
      const issue1 = { ...createTestIssue(), id: 'issue-1' };
      const issue2 = { ...createTestIssue(), id: 'issue-2' };
      
      await repository.save(issue1);
      await repository.save(issue2);
      
      await repository.addComment({ ...createTestComment('issue-1'), id: 'comment-1' });
      await repository.addComment({ ...createTestComment('issue-1'), id: 'comment-2' });
      await repository.addComment({ ...createTestComment('issue-2'), id: 'comment-3' });
      
      // Act
      const result = await repository.findCommentsByIssueId('issue-1');
      
      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('comment-1');
      expect(result[1].id).toBe('comment-2');
    });
  });
  
  describe('findCommentById', () => {
    it('should return null for non-existent comment', async () => {
      // Act
      const result = await repository.findCommentById('non-existent-id');
      
      // Assert
      expect(result).toBeNull();
    });
    
    it('should return the comment if found', async () => {
      // Arrange
      const issue = createTestIssue();
      await repository.save(issue);
      
      const comment = { ...createTestComment(issue.id), id: 'comment-id' };
      await repository.addComment(comment);
      
      // Act
      const result = await repository.findCommentById('comment-id');
      
      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('comment-id');
      expect(result?.issueId).toBe(issue.id);
    });
  });
  
  describe('deleteComment', () => {
    it('should return false when deleting non-existent comment', async () => {
      // Act
      const result = await repository.deleteComment('non-existent-id');
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should delete the comment and return true', async () => {
      // Arrange
      const issue = createTestIssue();
      await repository.save(issue);
      
      const comment = { ...createTestComment(issue.id), id: 'comment-id' };
      await repository.addComment(comment);
      
      // Act
      const deleteResult = await repository.deleteComment('comment-id');
      const findResult = await repository.findCommentById('comment-id');
      
      // Assert
      expect(deleteResult).toBe(true);
      expect(findResult).toBeNull();
    });
  });
}); 