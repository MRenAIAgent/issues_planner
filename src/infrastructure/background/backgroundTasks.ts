import { IssueRepository } from '../../domain/interfaces/IssueRepository';
import logger from '../../utils/logger';

// Archive issues older than this many days
const ARCHIVE_THRESHOLD_DAYS = 30;

// How often to run the archive task (in milliseconds)
const ARCHIVE_INTERVAL_MS = 24 * 60 * 60 * 1000; // Once per day

// For testing, can be set to a lower value:
// const ARCHIVE_INTERVAL_MS = 5 * 60 * 1000; // Every 5 minutes

export function setupBackgroundTasks(issueRepository: IssueRepository): void {
  // Start the archiving task
  logger.info('Setting up background tasks');
  
  // Set up interval for archiving old issues
  const archiveInterval = setInterval(() => {
    archiveOldIssues(issueRepository).catch(error => {
      logger.error('Error in archive task', { error });
    });
  }, ARCHIVE_INTERVAL_MS);
  
  // Ensure intervals are cleared if the process exits
  process.on('exit', () => {
    logger.info('Cleaning up background tasks');
    clearInterval(archiveInterval);
  });
  
  // Also clean up on termination signals
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, cleaning up background tasks');
    clearInterval(archiveInterval);
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, cleaning up background tasks');
    clearInterval(archiveInterval);
    process.exit(0);
  });
  
  // Run archive task once at startup
  archiveOldIssues(issueRepository).catch(error => {
    logger.error('Error in initial archive task', { error });
  });
}

export async function archiveOldIssues(issueRepository: IssueRepository): Promise<void> {
  logger.info('Running archive task for old issues');
  
  try {
    // Get all issues
    const issues = await issueRepository.findAll();
    
    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_THRESHOLD_DAYS);
    
    // Find issues to archive (older than cutoff date and not already archived)
    const issuesToArchive = issues.filter(issue => {
      const issueDate = new Date(issue.createdAt);
      return (
        issueDate < cutoffDate && 
        issue.status !== 'closed'
      );
    });
    
    if (issuesToArchive.length === 0) {
      logger.info('No issues to archive');
      return;
    }
    
    logger.info(`Found ${issuesToArchive.length} issues to archive`);
    
    // Archive each issue
    for (const issue of issuesToArchive) {
      logger.info(`Archiving issue ${issue.id}`, { 
        issueId: issue.id, 
        createdAt: issue.createdAt
      });
      
      // Update issue status to closed
      await issueRepository.update(issue.id, {
        status: 'closed',
        updatedAt: new Date().toISOString()
      });
      
      // Optional: Add a system comment about archiving
      // This would require the IssueService, so we're skipping it here
    }
    
    logger.info(`Successfully archived ${issuesToArchive.length} issues`);
  } catch (error) {
    logger.error('Error archiving old issues', { error });
    throw error;
  }
} 