import { Request, Response, NextFunction } from 'express';
import { IssueService } from '../../services/IssueService';
import { IssueEvent } from '../../domain/models/Issue';
import logger from '../../utils/logger';

export class IssueController {
  constructor(private issueService: IssueService) {}

  // POST /events - Process an issue event
  async processEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const event: IssueEvent = req.body;
      
      // Validate required fields
      if (!event.id || !event.title || !event.description || !event.author || !event.createdAt) {
        const error = new Error('Invalid event format: missing required fields') as any;
        error.statusCode = 400;
        error.details = {
          missingFields: [
            !event.id ? 'id' : null,
            !event.title ? 'title' : null,
            !event.description ? 'description' : null,
            !event.author ? 'author' : null,
            !event.createdAt ? 'createdAt' : null
          ].filter(Boolean)
        };
        throw error;
      }

      // Process the issue event
      const issue = await this.issueService.processIssueEvent(event);
      
      res.status(201).json({
        status: 'success',
        data: { issue }
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /issues - List all issues
  async listIssues(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const issues = await this.issueService.getAllIssues();
      
      res.status(200).json({
        status: 'success',
        data: { issues }
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /issues/:issueId - Get a specific issue
  async getIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const issueId = req.params.issueId;
      const issue = await this.issueService.getIssueById(issueId);
      
      if (!issue) {
        const error = new Error(`Issue with ID ${issueId} not found`) as any;
        error.statusCode = 404;
        throw error;
      }
      
      res.status(200).json({
        status: 'success',
        data: { issue }
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /analyze/:issueId - Analyze a specific issue
  async analyzeIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const issueId = req.params.issueId;
      const issue = await this.issueService.analyzeIssue(issueId);
      
      if (!issue) {
        const error = new Error(`Issue with ID ${issueId} not found`) as any;
        error.statusCode = 404;
        throw error;
      }
      
      res.status(200).json({
        status: 'success',
        data: { issue }
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /plan/:issueId - Generate a plan for a specific issue
  async planIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const issueId = req.params.issueId;
      const issue = await this.issueService.planIssue(issueId);
      
      if (!issue) {
        const error = new Error(`Issue with ID ${issueId} not found`) as any;
        error.statusCode = 404;
        throw error;
      }
      
      res.status(200).json({
        status: 'success',
        data: { issue }
      });
    } catch (error) {
      next(error);
    }
  }
} 