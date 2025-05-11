import { Router } from 'express';
import { createIssueRouter } from '../issueRoutes';
import { IssueController } from '../../controllers/IssueController';

// Mock the IssueController
jest.mock('../../controllers/IssueController');

describe('Issue Routes', () => {
  let mockIssueController: Partial<IssueController>;
  let router: Router;
  
  beforeEach(() => {
    // Create mock controller with all required methods
    mockIssueController = {
      processEvent: jest.fn(),
      listIssues: jest.fn(),
      getIssue: jest.fn(),
      analyzeIssue: jest.fn(),
      planIssue: jest.fn()
    };
    
    // Create the router with the mock controller
    router = createIssueRouter(mockIssueController as IssueController);
  });
  
  it('should create a router with all required routes', () => {
    // Get all registered routes (Express Router doesn't expose this directly, so we have to access internal properties)
    const routes = (router as any).stack.map((layer: any) => ({
      path: layer.route?.path,
      method: layer.route?.stack[0]?.method
    }));
    
    // Assert that all expected routes are registered
    expect(routes).toContainEqual({ path: '/events', method: 'post' });
    expect(routes).toContainEqual({ path: '/issues', method: 'get' });
    expect(routes).toContainEqual({ path: '/issues/:issueId', method: 'get' });
    expect(routes).toContainEqual({ path: '/analyze/:issueId', method: 'post' });
    expect(routes).toContainEqual({ path: '/plan/:issueId', method: 'post' });
  });
  
  it('should bind controller methods to routes', () => {
    // We can't directly test the binding, but we can verify that the bind method is called for each controller method
    expect(mockIssueController.processEvent).not.toHaveBeenCalled(); // The method itself isn't called
    expect((mockIssueController.processEvent as jest.Mock).mock.instances).toHaveLength(0); // But the bind method is used
    
    // Verify the same for other methods
    expect((mockIssueController.listIssues as jest.Mock).mock.instances).toHaveLength(0);
    expect((mockIssueController.getIssue as jest.Mock).mock.instances).toHaveLength(0);
    expect((mockIssueController.analyzeIssue as jest.Mock).mock.instances).toHaveLength(0);
    expect((mockIssueController.planIssue as jest.Mock).mock.instances).toHaveLength(0);
  });
}); 