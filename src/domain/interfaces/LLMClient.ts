import { Issue } from '../models/Issue';

export interface LLMAnalysisResponse {
  labels: string[];
  assignedTo: string;
  confidence: number; // 0 to 1
  priority?: 'low' | 'medium' | 'high';
}

export interface LLMIssuePlanResponse {
  plan: string;
}

export interface LLMClient {
  analyzeIssue(input: Issue): Promise<LLMAnalysisResponse>;
  planIssue(input: Issue): Promise<LLMIssuePlanResponse>;
} 