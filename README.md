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
│   │   └── llm/              # LLM client implementations
│   └── utils/                # Utilities and helpers
```

### Key Components

- **Domain Layer**: Contains the core business logic and interfaces.
- **Service Layer**: Implements the application use cases.
- **Infrastructure Layer**: Provides implementations for external dependencies.
- **API Layer**: Handles HTTP requests and responses.

## Features

- Accept incoming issue events via HTTP requests
- Normalize events into a structured Issue model
- Interact with a mocked LLMClient for analysis and planning
- Store issues in a persistent (in-memory) repository
- Expose HTTP endpoints for issue management
- Provide clear and structured logging

## API Endpoints

- **POST /events** - Process an issue event
- **GET /issues** - List all issues
- **GET /issues/:issueId** - Get specific issue details
- **POST /analyze/:issueId** - Trigger analysis using the LLMClient
- **POST /plan/:issueId** - Trigger plan generation using the LLMClient

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

## Testing the API

You can use tools like `curl` or Postman to test the API:

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

### Analyze an Issue

```bash
curl -X POST http://localhost:3000/analyze/issue-123
```

### Generate a Plan

```bash
curl -X POST http://localhost:3000/plan/issue-123
```

## Design Decisions

- **Type Safety**: Strict TypeScript typing throughout the application.
- **Modularity**: Clear separation of concerns and dependency injection for testability.
- **Error Handling**: Centralized error handling with structured logging.
- **Mock LLMClient**: Simulates AI-based analysis and planning functionality.
- **In-Memory Repository**: Provides persistent storage during the application lifecycle.
- **Extensibility**: The architecture allows for easy extension with additional features.

## Future Enhancements

- Implement retry/timeout logic for LLM calls
- Support multiple LLMClient strategies
- Add event replay capability
- Implement background process for archiving old issues
- Add search/filter functionality for issues
- Implement comprehensive test suite 