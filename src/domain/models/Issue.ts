export interface IssueComment {
  id: string;
  issueId: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  author: string;
  createdAt: string;
  
  // Additional fields as needed
  labels?: string[];
  assignedTo?: string;
  confidence?: number; // 0 to 1
  priority?: 'low' | 'medium' | 'high';
  comments?: IssueComment[];
  plan?: string;
  status?: 'open' | 'in_progress' | 'closed';
  updatedAt?: string;
}

export interface IssueEvent {
  id: string;
  title: string;
  description: string;
  author: string;
  createdAt: string;
}

// For event sourcing & replay capabilities
export type EventType = 'ISSUE_CREATED' | 'ISSUE_UPDATED' | 'ISSUE_ANALYZED' | 'ISSUE_PLANNED' | 'COMMENT_ADDED';

export interface Event {
  id: string;
  type: EventType;
  data: any;
  timestamp: string;
  issueId: string;
}

// Helper function to convert an IssueEvent to an Issue
export function issueEventToIssue(event: IssueEvent): Issue {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    author: event.author,
    createdAt: event.createdAt,
    comments: [],
    status: 'open',
    updatedAt: event.createdAt
  };
} 