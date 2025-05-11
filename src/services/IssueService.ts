import { v4 as uuidv4 } from 'uuid';
import { Issue, IssueComment, IssueEvent, issueEventToIssue } from '../domain/models/Issue';
import { IssueRepository } from '../domain/interfaces/IssueRepository';
import { LLMClient } from '../domain/interfaces/LLMClient';
import logger from '../utils/logger';

export class IssueService {
  constructor(
    private issueRepository: IssueRepository,
    private llmClient: LLMClient
  ) {}

  async processIssueEvent(event: IssueEvent): Promise<Issue> {
    logger.info('Processing issue event', { issueId: event.id });
    
    // Check if issue already exists
    const existingIssue = await this.issueRepository.findById(event.id);
    
    if (existingIssue) {
      logger.info('Issue already exists, updating', { issueId: event.id });
      // Update existing issue with event data
      return this.issueRepository.update(event.id, {
        title: event.title,
        description: event.description,
        updatedAt: new Date().toISOString()
      }) as Promise<Issue>; // We can safely assert non-null since we just found it
    } else {
      // Create new issue from event
      logger.info('Creating new issue', { issueId: event.id });
      const newIssue = issueEventToIssue(event);
      return this.issueRepository.save(newIssue);
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

    return this.issueRepository.addComment(comment);
  }

  // Helper method to add system-generated comments
  private async addSystemComment(issueId: string, content: string): Promise<IssueComment> {
    return this.addComment(issueId, content, 'system');
  }
} 