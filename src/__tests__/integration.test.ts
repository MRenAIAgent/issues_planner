import { IssueService } from '../services/IssueService';
import { InMemoryIssueRepository } from '../infrastructure/repositories/InMemoryIssueRepository';
import { MockLLMClient } from '../infrastructure/llm/MockLLMClient';
import { IssueEvent } from '../domain/models/Issue';

describe('Issue Integration Tests', () => {
  let issueService: IssueService;
  let repository: InMemoryIssueRepository;
  let llmClient: MockLLMClient;

  beforeEach(() => {
    repository = new InMemoryIssueRepository();
    llmClient = new MockLLMClient();
    issueService = new IssueService(repository, llmClient);
  });

  it('should process an issue event, analyze, and generate a plan', async () => {
    // Arrange
    const event: IssueEvent = {
      id: 'issue-123',
      title: 'Add retry logic to HTTP client',
      description: 'Requests to external APIs sometimes fail. We need to add automatic retries.',
      author: 'alice@example.com',
      createdAt: '2024-04-01T10:15:00Z'
    };

    // Act - Process event
    const issue = await issueService.processIssueEvent(event);

    // Assert - Issue is created
    expect(issue).toBeDefined();
    expect(issue.id).toBe(event.id);
    expect(issue.title).toBe(event.title);
    expect(issue.status).toBe('open');
    
    // The initial issue may not have comments array populated
    expect(issue.comments).toBeDefined();

    // Act - Analyze issue
    const analyzedIssue = await issueService.analyzeIssue(issue.id);

    // Assert - Issue has analysis data
    expect(analyzedIssue).toBeDefined();
    expect(analyzedIssue?.labels).toBeDefined();
    expect(analyzedIssue?.assignedTo).toBeDefined();
    expect(analyzedIssue?.confidence).toBeGreaterThan(0);
    expect(analyzedIssue?.confidence).toBeLessThanOrEqual(1);
    expect(['low', 'medium', 'high']).toContain(analyzedIssue?.priority);
    
    // Verify labels contain "networking" and "api" for this specific title
    expect(analyzedIssue?.labels).toContain('networking');
    expect(analyzedIssue?.labels).toContain('api');
    
    // Check the comments
    const commentsAfterAnalysis = await repository.findCommentsByIssueId(issue.id);
    expect(commentsAfterAnalysis.length).toBeGreaterThan(0);
    expect(commentsAfterAnalysis[0].author).toBe('system');

    // Act - Generate plan
    const plannedIssue = await issueService.planIssue(issue.id);

    // Assert - Issue has plan
    expect(plannedIssue).toBeDefined();
    expect(plannedIssue?.plan).toBeDefined();
    expect(plannedIssue?.plan).toContain('Action Plan for: Add retry logic to HTTP client');
    
    // For MockLLMClient, the plan might vary based on the labels detected
    // It might use the feature plan instead of networking plan based on random priority
    // Check for any typical content that would be in the plan
    const planText = plannedIssue?.plan || '';
    const hasFeaturePlan = planText.includes('Gather detailed requirements');
    const hasNetworkingPlan = planText.includes('Review current HTTP client');
    expect(hasFeaturePlan || hasNetworkingPlan).toBeTruthy();
    
    // Check for comments after planning
    const commentsAfterPlanning = await repository.findCommentsByIssueId(issue.id);
    expect(commentsAfterPlanning.length).toBeGreaterThan(1);
    expect(commentsAfterPlanning[1].author).toBe('system');
    expect(commentsAfterPlanning[1].content).toBe('Issue plan generated');
  });

  it('should handle missing or invalid issues gracefully', async () => {
    // Arrange
    const nonExistentId = 'non-existent-id';

    // Act & Assert - Analysis
    const analyzedIssue = await issueService.analyzeIssue(nonExistentId);
    expect(analyzedIssue).toBeNull();

    // Act & Assert - Planning
    const plannedIssue = await issueService.planIssue(nonExistentId);
    expect(plannedIssue).toBeNull();
  });

  it('should process multiple issues and maintain separate state', async () => {
    // Arrange
    const events = [
      {
        id: 'issue-1',
        title: 'Fix bug in login screen',
        description: 'Users cannot log in after update.',
        author: 'bob@example.com',
        createdAt: '2024-04-01T11:00:00Z'
      },
      {
        id: 'issue-2',
        title: 'Add documentation for API',
        description: 'Developer docs are missing for new API endpoints.',
        author: 'carol@example.com',
        createdAt: '2024-04-01T12:30:00Z'
      }
    ];

    // Act - Process both events
    await Promise.all(events.map(event => issueService.processIssueEvent(event)));

    // Act - Analyze and plan both issues
    for (const event of events) {
      await issueService.analyzeIssue(event.id);
      await issueService.planIssue(event.id);
    }

    // Act - Get all issues
    const allIssues = await issueService.getAllIssues();

    // Assert
    expect(allIssues).toHaveLength(2);
    
    // Verify first issue (bug)
    const bugIssue = allIssues.find(issue => issue.id === 'issue-1');
    expect(bugIssue).toBeDefined();
    expect(bugIssue?.labels).toContain('bug');
    expect(bugIssue?.plan).toBeDefined();
    
    // Verify second issue (documentation)
    const docIssue = allIssues.find(issue => issue.id === 'issue-2');
    expect(docIssue).toBeDefined();
    expect(docIssue?.labels).toContain('documentation');
    expect(docIssue?.plan).toBeDefined();
    
    // Check comments for each issue
    const bugIssueComments = await repository.findCommentsByIssueId('issue-1');
    const docIssueComments = await repository.findCommentsByIssueId('issue-2');
    
    expect(bugIssueComments.length).toBe(2);
    expect(docIssueComments.length).toBe(2);
  });
}); 