# Agentic Issue Planner with LLM-Based Action and Planning System

A modular, type-safe, event-driven backend service in Node.js with TypeScript for intelligent issue triage and planning. The system accepts incoming issue events, normalizes them into a structured internal Issue model, interacts with an LLM client to analyze and plan issues, and exposes HTTP endpoints for issue management.

## Architecture

The system follows a clean architecture approach with clear separation of concerns:

```
issue_triage/
├── src/
│   ├── api/                  # HTTP layer
│   │   ├── controllers/      # HTTP request handlers
│   │   ├── routes/           # Route definitions
│   │   └── middleware/       # Express middleware
│   ├── domain/               # Domain models and interfaces
│   │   ├── models/           # Core business models
│   │   └── interfaces/       # Core interfaces
│   ├── services/             # Application services/use cases
│   ├── infrastructure/       # External dependencies and implementations
│   │   ├── repositories/     # Data storage implementations
│   │   ├── llm/              # LLM client implementations
│   │   └── background/       # Background processes
│   └── utils/                # Utilities and helpers
```

### Key Components

- **Domain Layer**: Contains the core business logic and interfaces.
  - Models for issues, comments, and events
  - Interfaces for repositories, LLM clients, and event store
  
- **Service Layer**: Implements the application use cases.
  - IssueService contains the core business logic
  - Handles issue events, analysis, planning, and comments
  
- **Infrastructure Layer**: Provides implementations for external dependencies.
  - Repository implementations for data storage (in-memory)
  - LLM client implementations and factory
  - Event store implementation for event sourcing
  - Background tasks for maintenance operations
  
- **API Layer**: Handles HTTP requests and responses.
  - Controllers for handling issue and event requests
  - Routes for defining API endpoints
  - Middleware for request logging and error handling

## Core Features

- Accept incoming issue events via HTTP requests
- Normalize events into a structured Issue model
- Interact with a mocked LLMClient for analysis and planning
- Store issues in a persistent (in-memory) repository
- Expose HTTP endpoints for issue management
- Provide clear and structured logging

## Bonus Features

The implementation includes the following bonus features:

1. **Retry logic for LLM calls**:
   - The `RetryableLLMClient` wrapper adds retry functionality with exponential backoff
   - Configurable max retries, initial delay, and backoff factor
   - Automatically retries failed LLM operations with increasing delays
   - Detailed logging of retry attempts and outcomes

2. **Multiple LLMClient strategies**:
   - The `LLMClientFactory` supports different client implementations
   - Factory pattern allows easy switching between implementations
   - Currently includes 'mock' with placeholder for 'real' implementations
   - Configuration options for each strategy type

3. **Event replay capability**:
   - Complete event sourcing pattern implementation with event store
   - All system actions are stored as events (issue creation, updates, analysis, planning, comments)
   - System state can be fully recreated by replaying events in chronological order
   - Event replay endpoint allows system recovery after data loss
   - Essential for disaster recovery and system debugging

4. **Archive old issues background process**:
   - Automatically archives issues older than a configurable threshold (default 30 days)
   - Runs on a scheduled interval (configurable)
   - Marks old issues as 'closed' to keep the active issue list manageable
   - Clean shutdown handling to prevent orphaned processes

5. **Search/filter functionality**:
   - Powerful search API with multiple filter criteria
   - Filter by labels, assignee, priority, status, confidence level
   - Date range filtering (createdAfter, createdBefore)
   - Author filtering
   - Full-text search across title and description
   - Combine multiple filters for precise results

6. **Comprehensive test suite**:
   - Unit tests for all components
   - Integration tests for the entire service
   - Tests for all bonus features
   - Mocking of external dependencies for reliable testing

## API Endpoints

### Core Endpoints

- **POST /events** - Process an issue event
- **GET /issues** - List all issues
- **GET /issues/:issueId** - Get specific issue details
- **POST /analyze/:issueId** - Trigger analysis using the LLMClient
- **POST /plan/:issueId** - Trigger plan generation using the LLMClient

### Bonus Feature Endpoints

- **POST /issues/search** - Search and filter issues with multiple criteria
- **GET /events** - Get all events in the event store
- **GET /events/:issueId** - Get events for a specific issue
- **POST /events/replay** - Replay all events for system recovery

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

### Running the Application

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

## API Examples

Here are some examples of how to use the API:

### Create an Issue

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "id": "issue-123",
    "title": "Add retry logic to HTTP client",
    "description": "Requests to external APIs sometimes fail. We need to add automatic retries.",
    "author": "alice@example.com",
    "createdAt": "2024-04-01T10:15:00Z"
  }'
```

### List All Issues

```bash
curl -X GET http://localhost:3000/issues
```

### Get a Specific Issue

```bash
curl -X GET http://localhost:3000/issues/issue-123
```

### Search Issues

```bash
curl -X POST http://localhost:3000/issues/search \
  -H "Content-Type: application/json" \
  -d '{
    "labels": ["api", "networking"],
    "priority": "high",
    "textSearch": "retry",
    "minConfidence": 0.7,
    "createdAfter": "2024-03-01T00:00:00Z"
  }'
```

### Analyze an Issue

```bash
curl -X POST http://localhost:3000/analyze/issue-123
```

### Generate a Plan

```bash
curl -X POST http://localhost:3000/plan/issue-123
```

### Replay Events (for recovery)

```bash
curl -X POST http://localhost:3000/events/replay
```

## Design Decisions

- **Type Safety**: Strict TypeScript typing throughout the application.
- **Modularity**: Clear separation of concerns and dependency injection for testability.
- **Error Handling**: Centralized error handling with structured logging.
- **Event Sourcing**: All changes are stored as events, enabling full reconstruction of system state.
- **Factory Pattern**: Used for creating different LLM client implementations.
- **Repository Pattern**: Abstracts data storage operations from the business logic.
- **Middleware**: Centralized logging and error handling.
- **Background Processing**: Scheduled tasks run independently of the request/response cycle.

## Implementation Details

### Event Sourcing

The event sourcing pattern stores every change to the application state as a sequence of events. Benefits:

- Complete audit trail of all changes
- System state can be reconstructed at any point in time
- Easier debugging and troubleshooting
- Resilience against data loss or corruption

### Retry Logic

The retry mechanism uses exponential backoff to handle transient failures:

1. Initial attempt fails
2. Wait for initial delay (e.g., 500ms)
3. Try again, if it fails, increase delay (e.g., 750ms)
4. Continue until max retries reached
5. Log detailed information about each attempt

### Search and Filter

The search functionality implements a flexible filtering system:

- Labels filtering using array intersection
- Author and assignee exact matching
- Priority and status exact matching
- Date range filtering using timestamp comparison
- Confidence threshold filtering
- Full-text search using case-insensitive substring matching
- Filters can be combined using AND logic

### Background Archiving

The background archiving process:

1. Runs periodically (configurable interval)
2. Identifies issues older than the threshold
3. Updates their status to 'closed'
4. Provides detailed logging of the archive process
5. Handles clean shutdown on application termination 