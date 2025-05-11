import { IssueService, IssueSearchParams } from '../services/IssueService';
import { InMemoryIssueRepository } from '../infrastructure/repositories/InMemoryIssueRepository';
import { InMemoryEventStore } from '../infrastructure/repositories/InMemoryEventStore';
import { MockLLMClient } from '../infrastructure/llm/MockLLMClient';
import { Issue, IssueEvent } from '../domain/models/Issue';
import { archiveOldIssues } from '../infrastructure/background/backgroundTasks';

describe('Issue Integration Tests', () => {
  let issueService: IssueService;
  let repository: InMemoryIssueRepository;
  let llmClient: MockLLMClient;
  let eventStore: InMemoryEventStore;

  beforeEach(() => {
    repository = new InMemoryIssueRepository();
    llmClient = new MockLLMClient();
    issueService = new IssueService(repository, llmClient);
    // Create event store after service since it depends on service
    eventStore = new InMemoryEventStore(repository, issueService);
    // Set the event store on the service
    Object.defineProperty(issueService, 'eventStore', {
      value: eventStore,
      writable: true
    });
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

  // New tests for the added bonus features

  it('should search and filter issues with various criteria', async () => {
    // Arrange - Create several issues with different properties
    const events = [
      {
        id: 'issue-1',
        title: 'Fix login bug',
        description: 'Critical login bug',
        author: 'alice@example.com',
        createdAt: '2024-04-01T10:00:00Z'
      },
      {
        id: 'issue-2',
        title: 'Add retry mechanism',
        description: 'Network resilience',
        author: 'bob@example.com',
        createdAt: '2024-04-02T11:00:00Z'
      },
      {
        id: 'issue-3',
        title: 'Improve documentation',
        description: 'Better API docs needed',
        author: 'carol@example.com',
        createdAt: '2024-04-03T12:00:00Z'
      }
    ];
    
    // Process all events
    for (const event of events) {
      await issueService.processIssueEvent(event);
    }
    
    // Analyze all issues to get labels and assignments
    for (const event of events) {
      await issueService.analyzeIssue(event.id);
    }
    
    // 1. Search by text
    const bugResults = await issueService.searchIssues({ textSearch: 'bug' });
    expect(bugResults.length).toBe(1);
    expect(bugResults[0].id).toBe('issue-1');
    
    // 2. Search by author
    const bobResults = await issueService.searchIssues({ author: 'bob@example.com' });
    expect(bobResults.length).toBe(1);
    expect(bobResults[0].id).toBe('issue-2');
    
    // 3. Search by date range
    const dateResults = await issueService.searchIssues({ 
      createdAfter: '2024-04-02T00:00:00Z' 
    });
    expect(dateResults.length).toBe(2);
    
    // 4. Combined search
    const issue2 = await repository.findById('issue-2');
    if (issue2 && issue2.labels) {
      const combinedResults = await issueService.searchIssues({
        labels: issue2.labels,
        textSearch: 'network'
      });
      expect(combinedResults.length).toBe(1);
      expect(combinedResults[0].id).toBe('issue-2');
    }
  });

  it('should store and replay events to reconstruct state', async () => {
    // Arrange - Create and process an issue
    const event: IssueEvent = {
      id: 'replay-test',
      title: 'Test Event Replay',
      description: 'Testing replay functionality',
      author: 'test@example.com',
      createdAt: '2024-04-01T10:00:00Z'
    };
    
    // Act - Process the issue and trigger analysis/planning
    await issueService.processIssueEvent(event);
    await issueService.analyzeIssue(event.id);
    await issueService.planIssue(event.id);
    
    // Add a comment
    await issueService.addComment(event.id, 'This is a test comment', 'commenter@example.com');
    
    // Get current state before replay
    const issueBeforeReplay = await repository.findById(event.id);
    const commentsBeforeReplay = await repository.findCommentsByIssueId(event.id);
    
    // Collect events for verification
    const allEvents = await eventStore.getEvents();
    const issueEvents = await eventStore.getEventsByIssueId(event.id);
    
    // Verify events were recorded
    expect(allEvents.length).toBeGreaterThan(0);
    // There should be at least the key events (Created, analyzed, planned, comment added)
    // Plus the system comments added by the analyze and plan methods
    expect(issueEvents.length).toBeGreaterThanOrEqual(4);
    
    // Recreate repository to simulate complete loss of state
    const newRepository = new InMemoryIssueRepository();
    
    // Create new service and event store with the new repository
    const newService = new IssueService(newRepository, llmClient);
    const newEventStore = new InMemoryEventStore(newRepository, newService);
    
    // Manually copy events from old store to new store (simulating persistence)
    for (const storedEvent of allEvents) {
      await newEventStore.saveEvent(storedEvent);
    }
    
    // Set the event store on the new service
    Object.defineProperty(newService, 'eventStore', {
      value: newEventStore,
      writable: true
    });
    
    // Verify repository is empty before replay
    const issuesBeforeReplay = await newRepository.findAll();
    expect(issuesBeforeReplay.length).toBe(0);
    
    // Act - Replay events
    await newService.replayEvents();
    
    // Assert - State is reconstructed
    const issueAfterReplay = await newRepository.findById(event.id);
    const commentsAfterReplay = await newRepository.findCommentsByIssueId(event.id);
    
    // Verify issue was recreated
    expect(issueAfterReplay).toBeDefined();
    expect(issueAfterReplay?.title).toBe(event.title);
    expect(issueAfterReplay?.labels).toBeDefined();
    expect(issueAfterReplay?.plan).toBeDefined();
    
    // Verify comments were recreated
    expect(commentsAfterReplay.length).toBe(commentsBeforeReplay.length);
  });

  it('should archive old issues based on age', async () => {
    // Arrange - Create issues with different dates
    const now = new Date();
    
    // Calculate dates for testing
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);
    oneMonthAgo.setDate(now.getDate() - 1); // Just over a month ago
    
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(now.getMonth() - 2);
    
    const recentDate = new Date(now);
    recentDate.setDate(now.getDate() - 5); // 5 days ago
    
    // Create test issues with different dates
    const events = [
      {
        id: 'recent-issue',
        title: 'Recent Issue',
        description: 'This is a recent issue',
        author: 'alice@example.com',
        createdAt: recentDate.toISOString()
      },
      {
        id: 'old-issue-1',
        title: 'Old Issue 1',
        description: 'This is an old issue',
        author: 'bob@example.com',
        createdAt: oneMonthAgo.toISOString()
      },
      {
        id: 'old-issue-2',
        title: 'Old Issue 2',
        description: 'This is an even older issue',
        author: 'carol@example.com',
        createdAt: twoMonthsAgo.toISOString()
      }
    ];
    
    // Process all events
    for (const event of events) {
      await issueService.processIssueEvent(event);
    }
    
    // Verify all issues are open
    const allIssues = await repository.findAll();
    expect(allIssues.length).toBe(3);
    expect(allIssues.every(issue => issue.status === 'open')).toBe(true);
    
    // Act - Run the archive task (imported directly for testing)
    await archiveOldIssues(repository);
    
    // Assert - Old issues are archived, recent issue remains open
    const issuesAfterArchive = await repository.findAll();
    
    const recentIssue = issuesAfterArchive.find(issue => issue.id === 'recent-issue');
    expect(recentIssue?.status).toBe('open');
    
    const oldIssue1 = issuesAfterArchive.find(issue => issue.id === 'old-issue-1');
    expect(oldIssue1?.status).toBe('closed');
    
    const oldIssue2 = issuesAfterArchive.find(issue => issue.id === 'old-issue-2');
    expect(oldIssue2?.status).toBe('closed');
  });
}); 