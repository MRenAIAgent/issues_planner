import { MockLLMClient } from '../MockLLMClient';
import { Issue } from '../../../domain/models/Issue';

describe('MockLLMClient', () => {
  let client: MockLLMClient;
  
  // Helper to create a test issue
  const createTestIssue = (title: string = 'Test Issue'): Issue => ({
    id: 'test-issue-id',
    title,
    description: 'Test Description',
    author: 'test-author',
    createdAt: '2024-01-01T00:00:00Z'
  });
  
  beforeEach(() => {
    client = new MockLLMClient();
    
    // Mock setTimeout to avoid delays in tests
    jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
      callback();
      return {} as NodeJS.Timeout;
    });
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('analyzeIssue', () => {
    it('should generate labels based on issue title with "bug" keyword', async () => {
      // Arrange
      const issue = createTestIssue('Fix bug in authentication');
      
      // Act
      const result = await client.analyzeIssue(issue);
      
      // Assert
      expect(result.labels).toContain('bug');
      expect(result.assignedTo).toBe('bob@example.com'); // Bug issues go to Bob
    });
    
    it('should generate labels based on issue title with "fix" keyword', async () => {
      // Arrange
      const issue = createTestIssue('Fix the login screen');
      
      // Act
      const result = await client.analyzeIssue(issue);
      
      // Assert
      expect(result.labels).toContain('bug');
    });
    
    it('should generate labels based on issue title with "feature" keyword', async () => {
      // Arrange
      const issue = createTestIssue('Add new feature for users');
      
      // Act
      const result = await client.analyzeIssue(issue);
      
      // Assert
      expect(result.labels).toContain('feature');
      expect(result.assignedTo).toBe('carol@example.com'); // Feature issues go to Carol
    });
    
    it('should generate labels based on issue title with "add" keyword', async () => {
      // Arrange
      const issue = createTestIssue('Add login functionality');
      
      // Act
      const result = await client.analyzeIssue(issue);
      
      // Assert
      expect(result.labels).toContain('feature');
    });
    
    it('should generate labels based on issue title with "performance" keyword', async () => {
      // Arrange
      const issue = createTestIssue('Improve performance of database queries');
      
      // Act
      const result = await client.analyzeIssue(issue);
      
      // Assert
      expect(result.labels).toContain('performance');
    });
    
    it('should generate labels based on issue title with "speed" keyword', async () => {
      // Arrange
      const issue = createTestIssue('Increase speed of page loading');
      
      // Act
      const result = await client.analyzeIssue(issue);
      
      // Assert
      expect(result.labels).toContain('performance');
    });
    
    it('should generate labels based on issue title with "documentation" keyword', async () => {
      // Arrange
      const issue = createTestIssue('Update documentation for API');
      
      // Act
      const result = await client.analyzeIssue(issue);
      
      // Assert
      expect(result.labels).toContain('documentation');
      expect(result.assignedTo).toBe('dave@example.com'); // Documentation issues go to Dave
    });
    
    it('should generate labels based on issue title with "docs" keyword', async () => {
      // Arrange
      const issue = createTestIssue('Update docs for new features');
      
      // Act
      const result = await client.analyzeIssue(issue);
      
      // Assert
      expect(result.labels).toContain('documentation');
    });
    
    it('should generate labels based on issue title with "retry" keyword', async () => {
      // Arrange
      const issue = createTestIssue('Implement retry logic');
      
      // Act
      const result = await client.analyzeIssue(issue);
      
      // Assert
      expect(result.labels).toContain('networking');
    });
    
    it('should generate labels based on issue title with "network" keyword', async () => {
      // Arrange
      const issue = createTestIssue('Fix network connection issues');
      
      // Act
      const result = await client.analyzeIssue(issue);
      
      // Assert
      expect(result.labels).toContain('networking');
      // Since it contains "fix" it might also have "bug" label
    });
    
    it('should generate labels based on issue title with "api" keyword', async () => {
      // Arrange
      const issue = createTestIssue('Extend API endpoints');
      
      // Act
      const result = await client.analyzeIssue(issue);
      
      // Assert
      expect(result.labels).toContain('api');
      expect(result.assignedTo).toBe('alice@example.com'); // API/Networking issues go to Alice
    });
    
    it('should generate labels based on issue title with "http" keyword', async () => {
      // Arrange
      const issue = createTestIssue('Fix HTTP client issues');
      
      // Act
      const result = await client.analyzeIssue(issue);
      
      // Assert
      expect(result.labels).toContain('api');
    });
    
    it('should add "task" label if no keywords match', async () => {
      // Arrange
      const issue = createTestIssue('Some random task without keywords');
      
      // Act
      const result = await client.analyzeIssue(issue);
      
      // Assert
      expect(result.labels).toContain('task');
      expect(result.assignedTo).toBe('team@example.com'); // Default assignee
    });
    
    it('should generate confidence between 0.5 and 1.0', async () => {
      // Arrange
      const issue = createTestIssue();
      
      // Act
      const result = await client.analyzeIssue(issue);
      
      // Assert
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
    
    it('should generate priority as low, medium or high', async () => {
      // Arrange
      const issue = createTestIssue();
      
      // Act
      const result = await client.analyzeIssue(issue);
      
      // Assert
      expect(['low', 'medium', 'high']).toContain(result.priority);
    });
  });
  
  describe('planIssue', () => {
    it('should create plan for bug issues', async () => {
      // Arrange
      const issue = createTestIssue();
      issue.labels = ['bug'];
      
      // Act
      const result = await client.planIssue(issue);
      
      // Assert
      expect(result.plan).toContain('Action Plan for: Test Issue');
      expect(result.plan).toContain('Reproduce the issue');
      expect(result.plan).toContain('Identify the root cause');
    });
    
    it('should create plan for feature issues', async () => {
      // Arrange
      const issue = createTestIssue();
      issue.labels = ['feature'];
      
      // Act
      const result = await client.planIssue(issue);
      
      // Assert
      expect(result.plan).toContain('Action Plan for: Test Issue');
      expect(result.plan).toContain('Gather detailed requirements');
      expect(result.plan).toContain('Design the API/interface');
    });
    
    it('should create plan for networking or API issues', async () => {
      // Arrange
      const issue = createTestIssue();
      issue.labels = ['networking', 'api'];
      
      // Act
      const result = await client.planIssue(issue);
      
      // Assert
      expect(result.plan).toContain('Action Plan for: Test Issue');
      expect(result.plan).toContain('Review current HTTP client implementation');
      expect(result.plan).toContain('Research best practices for retry mechanisms');
    });
    
    it('should create default plan for other issues', async () => {
      // Arrange
      const issue = createTestIssue();
      issue.labels = ['task'];
      
      // Act
      const result = await client.planIssue(issue);
      
      // Assert
      expect(result.plan).toContain('Action Plan for: Test Issue');
      expect(result.plan).toContain('Analyze requirements for this task');
      expect(result.plan).toContain('Create implementation plan');
    });
    
    it('should use labels from title if not provided in issue', async () => {
      // Arrange
      const issue = createTestIssue('Fix bug in login screen');
      // No labels provided
      
      // Act
      const result = await client.planIssue(issue);
      
      // Assert
      expect(result.plan).toContain('Action Plan for: Fix bug in login screen');
      // Should detect it's a bug issue from title
      expect(result.plan).toContain('Reproduce the issue');
    });
    
    it('should include estimated effort in the plan', async () => {
      // Arrange
      const issue = createTestIssue();
      
      // Act
      const result = await client.planIssue(issue);
      
      // Assert
      expect(result.plan).toMatch(/Estimated effort: \d+ days/);
    });
  });
}); 