import express from 'express';
import { createIssueRouter } from './api/routes/issueRoutes';
import { IssueController } from './api/controllers/IssueController';
import { IssueService } from './services/IssueService';
import { InMemoryIssueRepository } from './infrastructure/repositories/InMemoryIssueRepository';
import { LLMClientFactory } from './infrastructure/llm/LLMClientFactory';
import { errorHandler } from './api/middleware/errorHandler';
import { requestLogger } from './api/middleware/requestLogger';
import logger from './utils/logger';

// Configuration
const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    // Create Express application
    const app = express();

    // Middleware
    app.use(express.json());
    app.use(requestLogger);
    
    // Initialize dependencies
    const issueRepository = new InMemoryIssueRepository();
    
    // Create LLMClient with retry enabled
    const llmClient = LLMClientFactory.createClient({
      type: 'mock',
      enableRetry: true,
      retryConfig: {
        maxRetries: 3,
        initialDelayMs: 500
      }
    });
    
    const issueService = new IssueService(issueRepository, llmClient);
    const issueController = new IssueController(issueService);

    // Routes
    app.use(createIssueRouter(issueController));

    // Error handling middleware (should be registered last)
    app.use(errorHandler);

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start the application
bootstrap().catch(error => {
  logger.error('Unhandled error during bootstrap', { error });
  process.exit(1);
}); 