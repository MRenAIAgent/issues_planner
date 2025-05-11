import express from 'express';
import { createIssueRouter } from './api/routes/issueRoutes';
import { createEventRouter } from './api/routes/eventRoutes';
import { IssueController } from './api/controllers/IssueController';
import { EventController } from './api/controllers/EventController';
import { IssueService } from './services/IssueService';
import { InMemoryIssueRepository } from './infrastructure/repositories/InMemoryIssueRepository';
import { InMemoryEventStore } from './infrastructure/repositories/InMemoryEventStore';
import { LLMClientFactory } from './infrastructure/llm/LLMClientFactory';
import { errorHandler } from './api/middleware/errorHandler';
import { requestLogger } from './api/middleware/requestLogger';
import logger from './utils/logger';
import { setupBackgroundTasks } from './infrastructure/background/backgroundTasks';

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
    
    // We need to create the service first without event store
    const issueService = new IssueService(issueRepository, llmClient);
    
    // Now create the event store with references to the repository and service
    const eventStore = new InMemoryEventStore(issueRepository, issueService);
    
    // Update the service with the event store
    Object.defineProperty(issueService, 'eventStore', {
      value: eventStore,
      writable: true
    });
    
    const issueController = new IssueController(issueService);
    const eventController = new EventController(eventStore, issueService);

    // Routes
    app.use(createIssueRouter(issueController));
    app.use(createEventRouter(eventController));

    // Start background tasks
    setupBackgroundTasks(issueRepository);

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