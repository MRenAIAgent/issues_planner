import { v4 as uuidv4 } from 'uuid';
import { Issue, IssueComment } from '../../domain/models/Issue';
import { IssueRepository } from '../../domain/interfaces/IssueRepository';

export class InMemoryIssueRepository implements IssueRepository {
  private issues: Map<string, Issue> = new Map();
  private comments: Map<string, IssueComment> = new Map();

  // Issue operations
  async findAll(): Promise<Issue[]> {
    return Array.from(this.issues.values()).map(issue => {
      // Attach comments to each issue
      const issueComments = Array.from(this.comments.values())
        .filter(comment => comment.issueId === issue.id);
      return { ...issue, comments: issueComments };
    });
  }

  async findById(id: string): Promise<Issue | null> {
    const issue = this.issues.get(id);
    if (!issue) return null;

    // Attach comments to the issue
    const comments = Array.from(this.comments.values())
      .filter(comment => comment.issueId === id);
    
    return { ...issue, comments };
  }

  async save(issue: Issue): Promise<Issue> {
    // Ensure issue has an ID
    if (!issue.id) {
      issue.id = uuidv4();
    }
    
    // Set default values for new issues
    if (!issue.status) {
      issue.status = 'open';
    }
    if (!issue.comments) {
      issue.comments = [];
    }

    this.issues.set(issue.id, { ...issue });
    return issue;
  }

  async update(id: string, issueData: Partial<Issue>): Promise<Issue | null> {
    const existingIssue = this.issues.get(id);
    if (!existingIssue) return null;

    const updatedIssue = { ...existingIssue, ...issueData, updatedAt: new Date().toISOString() };
    this.issues.set(id, updatedIssue);

    // Attach comments to the updated issue
    const comments = Array.from(this.comments.values())
      .filter(comment => comment.issueId === id);
    
    return { ...updatedIssue, comments };
  }

  async delete(id: string): Promise<boolean> {
    const deleted = this.issues.delete(id);
    
    // Delete all comments for this issue
    for (const [commentId, comment] of this.comments.entries()) {
      if (comment.issueId === id) {
        this.comments.delete(commentId);
      }
    }
    
    return deleted;
  }

  // Comment operations
  async addComment(comment: IssueComment): Promise<IssueComment> {
    // Ensure comment has an ID
    if (!comment.id) {
      comment.id = uuidv4();
    }
    
    // Validate that the issue exists
    const issue = this.issues.get(comment.issueId);
    if (!issue) {
      throw new Error(`Issue with ID ${comment.issueId} not found`);
    }

    this.comments.set(comment.id, { ...comment });
    return comment;
  }

  async findCommentsByIssueId(issueId: string): Promise<IssueComment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.issueId === issueId);
  }

  async findCommentById(id: string): Promise<IssueComment | null> {
    return this.comments.get(id) || null;
  }

  async deleteComment(id: string): Promise<boolean> {
    return this.comments.delete(id);
  }
} 