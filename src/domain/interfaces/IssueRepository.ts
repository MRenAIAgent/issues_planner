import { Issue, IssueComment } from '../models/Issue';

export interface IssueRepository {
  // Issue operations
  findAll(): Promise<Issue[]>;
  findById(id: string): Promise<Issue | null>;
  save(issue: Issue): Promise<Issue>;
  update(id: string, issue: Partial<Issue>): Promise<Issue | null>;
  delete(id: string): Promise<boolean>;
  
  // Comment operations
  addComment(comment: IssueComment): Promise<IssueComment>;
  findCommentsByIssueId(issueId: string): Promise<IssueComment[]>;
  findCommentById(id: string): Promise<IssueComment | null>;
  deleteComment(id: string): Promise<boolean>;
} 