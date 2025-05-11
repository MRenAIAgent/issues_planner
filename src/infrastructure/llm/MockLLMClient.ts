import { LLMClient, LLMAnalysisResponse, LLMIssuePlanResponse } from '../../domain/interfaces/LLMClient';
import { Issue } from '../../domain/models/Issue';

export class MockLLMClient implements LLMClient {
  private generateRandomConfidence(): number {
    // Random confidence between 0.5 and 1.0
    return 0.5 + Math.random() * 0.5;
  }

  private generateRandomPriority(): 'low' | 'medium' | 'high' {
    const priorities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
    return priorities[Math.floor(Math.random() * priorities.length)];
  }

  private getLabelsBasedOnTitle(title: string): string[] {
    const labels: string[] = [];
    
    // Add labels based on keywords in title
    if (title.toLowerCase().includes('bug') || title.toLowerCase().includes('fix')) {
      labels.push('bug');
    }
    if (title.toLowerCase().includes('feature') || title.toLowerCase().includes('add')) {
      labels.push('feature');
    }
    if (title.toLowerCase().includes('performance') || title.toLowerCase().includes('speed')) {
      labels.push('performance');
    }
    if (title.toLowerCase().includes('documentation') || title.toLowerCase().includes('docs')) {
      labels.push('documentation');
    }
    if (title.toLowerCase().includes('retry') || title.toLowerCase().includes('network')) {
      labels.push('networking');
    }
    if (title.toLowerCase().includes('api') || title.toLowerCase().includes('http')) {
      labels.push('api');
    }
    
    // Add at least one default label if none matched
    if (labels.length === 0) {
      labels.push('task');
    }
    
    return labels;
  }

  private getAssigneeBasedOnLabels(labels: string[]): string {
    // Assign issues based on labels
    if (labels.includes('bug')) {
      return 'bob@example.com';
    } else if (labels.includes('feature')) {
      return 'carol@example.com';
    } else if (labels.includes('documentation')) {
      return 'dave@example.com';
    } else if (labels.includes('networking') || labels.includes('api')) {
      return 'alice@example.com';
    } else {
      return 'team@example.com';
    }
  }

  async analyzeIssue(input: Issue): Promise<LLMAnalysisResponse> {
    // Simulate processing delay (100-500ms)
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
    
    // Generate labels based on issue title/description
    const labels = this.getLabelsBasedOnTitle(input.title);
    
    // Determine assignee based on labels
    const assignedTo = this.getAssigneeBasedOnLabels(labels);

    return {
      labels,
      assignedTo,
      confidence: this.generateRandomConfidence(),
      priority: this.generateRandomPriority()
    };
  }

  async planIssue(input: Issue): Promise<LLMIssuePlanResponse> {
    // Simulate processing delay (200-800ms)
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 600));
    
    // Generate a simple plan based on issue title and labels
    const labels = input.labels || this.getLabelsBasedOnTitle(input.title);
    let plan = `## Action Plan for: ${input.title}\n\n`;
    
    // Add steps based on issue type
    if (labels.includes('bug')) {
      plan += `1. Reproduce the issue in a development environment\n`;
      plan += `2. Identify the root cause of the problem\n`;
      plan += `3. Write a failing test that demonstrates the bug\n`;
      plan += `4. Fix the implementation\n`;
      plan += `5. Verify the test passes\n`;
      plan += `6. Deploy and validate in staging environment\n`;
    } else if (labels.includes('feature')) {
      plan += `1. Gather detailed requirements for the feature\n`;
      plan += `2. Design the API/interface for the new functionality\n`;
      plan += `3. Implement the feature with tests\n`;
      plan += `4. Document the new feature\n`;
      plan += `5. Create a pull request for review\n`;
    } else if (labels.includes('networking') || labels.includes('api')) {
      plan += `1. Review current HTTP client implementation\n`;
      plan += `2. Research best practices for retry mechanisms\n`;
      plan += `3. Implement exponential backoff with configurable retry count\n`;
      plan += `4. Add appropriate logging for retry attempts\n`;
      plan += `5. Write tests covering various failure scenarios\n`;
      plan += `6. Update documentation with retry behavior\n`;
    } else {
      plan += `1. Analyze requirements for this task\n`;
      plan += `2. Create implementation plan\n`;
      plan += `3. Execute implementation with proper tests\n`;
      plan += `4. Document changes\n`;
      plan += `5. Submit for review\n`;
    }
    
    plan += `\n## Estimated effort: ${Math.ceil(Math.random() * 5)} days`;
    
    return { plan };
  }
} 