import { Router } from 'express';
import { EventController } from '../controllers/EventController';

export function createEventRouter(eventController: EventController): Router {
  const router = Router();

  // GET /events - Get all events
  router.get('/events', eventController.getEvents.bind(eventController));
  
  // GET /events/:issueId - Get events for a specific issue
  router.get('/events/:issueId', eventController.getEventsByIssueId.bind(eventController));
  
  // POST /events/replay - Replay all events
  router.post('/events/replay', eventController.replayEvents.bind(eventController));

  return router;
} 