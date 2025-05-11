import { v4 as uuidv4 } from 'uuid';
import { Issue, IssueComment, IssueEvent, issueEventToIssue, Event } from '../domain/models/Issue';
import { IssueRepository } from '../domain/interfaces/IssueRepository';
import { EventStore } from '../domain/interfaces/EventStore';
import { LLMClient } from '../domain/interfaces/LLMClient';
import logger from '../utils/logger';

export interface IssueSearchParams {
  labels?: string[];
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'open' | 'in_progress' | 'closed';
  minConfidence?: number;
  createdAfter?: string;
  createdBefore?: string;
  author?: string;
  textSearch?: string;
}

export class IssueService {
  constructor(
    private issueRepository: IssueRepository,
    private llmClient: LLMClient,
    private eventStore?: EventStore
  ) {}

  async processIssueEvent(event: IssueEvent): Promise<Issue> {
    logger.info('Processing issue event', { issueId: event.id });
    
    // Check if issue already exists
    const existingIssue = await this.issueRepository.findById(event.id);
    
    if (existingIssue) {
      logger.info('Issue already exists, updating', { issueId: event.id });
      // Update existing issue with event data
      const updatedIssue = await this.issueRepository.update(event.id, {
        title: event.title,
        description: event.description,
        updatedAt: new Date().toISOString()
      }) as Issue; // We can safely assert non-null since we just found it
      
      // Store event if event store is available
      if (this.eventStore) {
        await this.eventStore.saveEvent({
          id: uuidv4(),
          type: 'ISSUE_UPDATED',
          data: {
            title: event.title,
            description: event.description,
            updatedAt: new Date().toISOString()
          },
          timestamp: new Date().toISOString(),
          issueId: event.id
        });
      }
      
      return updatedIssue;
    } else {
      // Create new issue from event
      logger.info('Creating new issue', { issueId: event.id });
      const newIssue = issueEventToIssue(event);
      const savedIssue = await this.issueRepository.save(newIssue);
      
      // Store event if event store is available
      if (this.eventStore) {
        await this.eventStore.saveEvent({
          id: uuidv4(),
          type: 'ISSUE_CREATED',
          data: event,
          timestamp: new Date().toISOString(),
          issueId: event.id
        });
      }
      
      return savedIssue;
    }
  }

  async getAllIssues(): Promise<Issue[]> {
    logger.info('Retrieving all issues');
    return this.issueRepository.findAll();
  }

  async getIssueById(id: string): Promise<Issue | null> {
    logger.info('Retrieving issue by ID', { issueId: id });
    return this.issueRepository.findById(id);
  }

  async searchIssues(params: IssueSearchParams): Promise<Issue[]> {
    logger.info('Searching issues with params', { params });
    
    // Get all issues
    const allIssues = await this.issueRepository.findAll();
    
    // Apply filters
    return allIssues.filter(issue => {
      // Check labels
      if (params.labels && params.labels.length > 0) {
        if (!issue.labels || !params.labels.some(label => issue.labels?.includes(label))) {
          return false;
        }
      }
      
      // Check assignee
      if (params.assignedTo && issue.assignedTo !== params.assignedTo) {
        return false;
      }
      
      // Check priority
      if (params.priority && issue.priority !== params.priority) {
        return false;
      }
      
      // Check status
      if (params.status && issue.status !== params.status) {
        return false;
      }
      
      // Check confidence
      if (params.minConfidence !== undefined && (
        issue.confidence === undefined || issue.confidence < params.minConfidence)) {
        return false;
      }
      
      // Check creation date range
      if (params.createdAfter) {
        const createdAfterDate = new Date(params.createdAfter).getTime();
        const issueCreatedDate = new Date(issue.createdAt).getTime();
        if (issueCreatedDate < createdAfterDate) {
          return false;
        }
      }
      
      if (params.createdBefore) {
        const createdBeforeDate = new Date(params.createdBefore).getTime();
        const issueCreatedDate = new Date(issue.createdAt).getTime();
        if (issueCreatedDate > createdBeforeDate) {
          return false;
        }
      }
      
      // Check author
      if (params.author && issue.author !== params.author) {
        return false;
      }
      
      // Text search across title and description
      if (params.textSearch) {
        const searchTerm = params.textSearch.toLowerCase();
        const titleMatch = issue.title.toLowerCase().includes(searchTerm);
        const descriptionMatch = issue.description.toLowerCase().includes(searchTerm);
        
        if (!titleMatch && !descriptionMatch) {
          return false;
        }
      }
      
      return true;
    });
  }

  async analyzeIssue(id: string): Promise<Issue | null> {
    logger.info('Analyzing issue', { issueId: id });
    
    const issue = await this.issueRepository.findById(id);
    if (!issue) {
      logger.warn('Issue not found for analysis', { issueId: id });
      return null;
    }

    try {
      const analysisResponse = await this.llmClient.analyzeIssue(issue);
      logger.info('Issue analysis completed', { 
        issueId: id, 
        labels: analysisResponse.labels,
        assignedTo: analysisResponse.assignedTo,
        confidence: analysisResponse.confidence,
        priority: analysisResponse.priority 
      });

      // Update issue with analysis results
      const updatedIssue = await this.issueRepository.update(id, {
        labels: analysisResponse.labels,
        assignedTo: analysisResponse.assignedTo,
        confidence: analysisResponse.confidence,
        priority: analysisResponse.priority,
        updatedAt: new Date().toISOString()
      });
      
      // Store event if event store is available
      if (this.eventStore && updatedIssue) {
        await this.eventStore.saveEvent({
          id: uuidv4(),
          type: 'ISSUE_ANALYZED',
          data: {
            labels: analysisResponse.labels,
            assignedTo: analysisResponse.assignedTo,
            confidence: analysisResponse.confidence,
            priority: analysisResponse.priority,
            updatedAt: new Date().toISOString()
          },
          timestamp: new Date().toISOString(),
          issueId: id
        });
      }

      // Add a system comment about the analysis
      await this.addSystemComment(id, 
        `Issue analyzed: Assigned to ${analysisResponse.assignedTo}, ` +
        `Labels: ${analysisResponse.labels.join(', ')}, ` +
        `Priority: ${analysisResponse.priority || 'not set'}, ` +
        `Confidence: ${(analysisResponse.confidence * 100).toFixed(0)}%`
      );

      return updatedIssue;
    } catch (error) {
      logger.error('Error analyzing issue', { issueId: id, error });
      throw error;
    }
  }

  async planIssue(id: string): Promise<Issue | null> {
    logger.info('Planning issue', { issueId: id });
    
    const issue = await this.issueRepository.findById(id);
    if (!issue) {
      logger.warn('Issue not found for planning', { issueId: id });
      return null;
    }

    try {
      const planResponse = await this.llmClient.planIssue(issue);
      logger.info('Issue planning completed', { issueId: id });

      // Update issue with plan
      const updatedIssue = await this.issueRepository.update(id, {
        plan: planResponse.plan,
        updatedAt: new Date().toISOString()
      });
      
      // Store event if event store is available
      if (this.eventStore && updatedIssue) {
        await this.eventStore.saveEvent({
          id: uuidv4(),
          type: 'ISSUE_PLANNED',
          data: planResponse,
          timestamp: new Date().toISOString(),
          issueId: id
        });
      }

      // Add a system comment about the plan
      await this.addSystemComment(id, 'Issue plan generated');

      return updatedIssue;
    } catch (error) {
      logger.error('Error planning issue', { issueId: id, error });
      throw error;
    }
  }

  async addComment(issueId: string, content: string, author: string): Promise<IssueComment> {
    logger.info('Adding comment to issue', { issueId });
    
    // Check if issue exists
    const issue = await this.issueRepository.findById(issueId);
    if (!issue) {
      logger.warn('Issue not found for adding comment', { issueId });
      throw new Error(`Issue with ID ${issueId} not found`);
    }

    const comment: IssueComment = {
      id: uuidv4(),
      issueId,
      content,
      author,
      createdAt: new Date().toISOString()
    };

    const savedComment = await this.issueRepository.addComment(comment);
    
    // Store event if event store is available
    if (this.eventStore) {
      await this.eventStore.saveEvent({
        id: uuidv4(),
        type: 'COMMENT_ADDED',
        data: comment,
        timestamp: new Date().toISOString(),
        issueId
      });
    }
    
    return savedComment;
  }

  // Helper method to add system-generated comments
  private async addSystemComment(issueId: string, content: string): Promise<IssueComment> {
    return this.addComment(issueId, content, 'system');
  }
  
  // Method to replay all events (useful for system recovery)
  async replayEvents(): Promise<void> {
    if (!this.eventStore) {
      logger.warn('Cannot replay events: No event store available');
      return;
    }
    
    await this.eventStore.replayEvents();
  }
} 