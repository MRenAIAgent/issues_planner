import { Router } from 'express';
import { IssueController } from '../controllers/IssueController';

export function createIssueRouter(issueController: IssueController): Router {
  const router = Router();

  // POST /events - Process an issue event
  router.post('/events', issueController.processEvent.bind(issueController));
  
  // GET /issues - List all issues
  router.get('/issues', issueController.listIssues.bind(issueController));
  
  // GET /issues/:issueId - Get a specific issue
  router.get('/issues/:issueId', issueController.getIssue.bind(issueController));
  
  // POST /issues/search - Search issues
  router.post('/issues/search', issueController.searchIssues.bind(issueController));
  
  // POST /analyze/:issueId - Analyze a specific issue
  router.post('/analyze/:issueId', issueController.analyzeIssue.bind(issueController));
  
  // POST /plan/:issueId - Generate a plan for a specific issue
  router.post('/plan/:issueId', issueController.planIssue.bind(issueController));

  return router;
} 