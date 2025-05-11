import { v4 as uuidv4 } from 'uuid';
import { Event, EventType } from '../../domain/models/Issue';
import { EventStore } from '../../domain/interfaces/EventStore';
import { IssueRepository } from '../../domain/interfaces/IssueRepository';
import { IssueService } from '../../services/IssueService';
import logger from '../../utils/logger';

export class InMemoryEventStore implements EventStore {
  private events: Event[] = [];
  
  constructor(
    private issueRepository: IssueRepository,
    private issueService: IssueService
  ) {}

  async saveEvent(event: Event): Promise<Event> {
    // Ensure event has an ID
    if (!event.id) {
      event.id = uuidv4();
    }
    
    // Ensure event has a timestamp
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }

    this.events.push({ ...event });
    logger.info('Event saved', { eventId: event.id, eventType: event.type, issueId: event.issueId });
    return event;
  }

  async getEvents(): Promise<Event[]> {
    return [...this.events];
  }

  async getEventsByIssueId(issueId: string): Promise<Event[]> {
    return this.events.filter(event => event.issueId === issueId);
  }

  async replayEvents(): Promise<void> {
    logger.info('Starting event replay', { eventCount: this.events.length });
    
    // Sort events by timestamp to ensure proper replay order
    const sortedEvents = [...this.events].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Clear current state
    // Note: In a real implementation, you would need a way to clear the issue repository
    
    // Replay each event
    for (const event of sortedEvents) {
      try {
        await this.applyEvent(event);
        logger.info('Replayed event', { eventId: event.id, eventType: event.type });
      } catch (error) {
        logger.error('Error replaying event', { 
          eventId: event.id, 
          eventType: event.type,
          error
        });
      }
    }
    
    logger.info('Event replay completed');
  }

  private async applyEvent(event: Event): Promise<void> {
    switch (event.type) {
      case 'ISSUE_CREATED':
        await this.issueService.processIssueEvent(event.data);
        break;
      case 'ISSUE_UPDATED':
        await this.issueRepository.update(event.issueId, event.data);
        break;
      case 'ISSUE_ANALYZED':
        // In a real implementation, you might want to directly update the issue
        // instead of calling the service to avoid re-triggering the LLM
        await this.issueRepository.update(event.issueId, event.data);
        break;
      case 'ISSUE_PLANNED':
        await this.issueRepository.update(event.issueId, { plan: event.data.plan });
        break;
      case 'COMMENT_ADDED':
        await this.issueRepository.addComment(event.data);
        break;
      default:
        logger.warn('Unknown event type during replay', { 
          eventType: event.type,
          eventId: event.id 
        });
    }
  }
} 