import { Request, Response, NextFunction } from 'express';
import { EventStore } from '../../domain/interfaces/EventStore';
import { IssueService } from '../../services/IssueService';
import logger from '../../utils/logger';

export class EventController {
  constructor(
    private eventStore: EventStore,
    private issueService: IssueService
  ) {}

  // GET /events - Get all events
  async getEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const events = await this.eventStore.getEvents();
      
      res.status(200).json({
        status: 'success',
        data: { events }
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /events/:issueId - Get events for a specific issue
  async getEventsByIssueId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const issueId = req.params.issueId;
      const events = await this.eventStore.getEventsByIssueId(issueId);
      
      res.status(200).json({
        status: 'success',
        data: { events }
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /events/replay - Replay all events
  async replayEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Replaying all events');
      await this.issueService.replayEvents();
      
      res.status(200).json({
        status: 'success',
        message: 'Event replay completed'
      });
    } catch (error) {
      next(error);
    }
  }
} 