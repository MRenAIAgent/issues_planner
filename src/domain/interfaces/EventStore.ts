import { Event } from '../models/Issue';

export interface EventStore {
  saveEvent(event: Event): Promise<Event>;
  getEvents(): Promise<Event[]>;
  getEventsByIssueId(issueId: string): Promise<Event[]>;
  replayEvents(): Promise<void>;
} 