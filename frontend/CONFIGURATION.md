# Frontend Configuration System

This document describes the configuration system for handling API URLs across different environments.

## Overview

The frontend uses environment variables to configure the API URL, allowing it to work with both local development and AWS deployment environments.

## Configuration Files

### Core Files

- **`src/config/index.ts`** - Centralized configuration system
- **`src/services/api.ts`** - API service using configured URLs
- **`src/vite-env.d.ts`** - TypeScript environment variable definitions

### Environment Files

- **`.env.example`** - Template for environment variables
- **`.env.local`** - Local development configuration (not committed)

## Environment Variables

### VITE_API_URL

The primary environment variable that configures the backend API URL.

**Examples:**
- Local development: `http://localhost:8000`
- AWS deployment: `https://abc123.execute-api.us-east-1.amazonaws.com/prod`

## Usage

### Basic Usage

```typescript
import { apiService } from './services/api'
import { config } from './config'

// Check configuration
console.log('API URL:', config.apiUrl)
console.log('Environment:', config.isAWS ? 'AWS' : 'Local')

// Make API calls
const healthCheck = await apiService.healthCheck()
const users = await apiService.get('/users')
const newUser = await apiService.post('/users', { name: 'John' })
```

### Configuration API

```typescript
import { getConfig, validateConfig, getValidatedConfig } from './config'

// Get current configuration
const config = getConfig()

// Validate configuration
if (validateConfig(config)) {
  console.log('Configuration is valid')
}

// Get validated configuration (throws if invalid)
const validConfig = getValidatedConfig()
```

### API Service Methods

```typescript
// GET request
const data = await apiService.get('/endpoint')

// POST request with data
const result = await apiService.post('/endpoint', { key: 'value' })

// PUT request
const updated = await apiService.put('/endpoint/1', { key: 'newValue' })

// DELETE request
await apiService.delete('/endpoint/1')

// Health check
const health = await apiService.healthCheck()
```

## Environment Setup

### Local Development

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Configure for local backend:
   ```bash
   VITE_API_URL=http://localhost:8000
   ```

### AWS Deployment

Set the environment variable during build:

```bash
# For development environment
VITE_API_URL=https://dev-api.execute-api.us-east-1.amazonaws.com/dev npm run build

# For production environment
VITE_API_URL=https://prod-api.execute-api.us-east-1.amazonaws.com/prod npm run build
```

## Error Handling

The API service includes comprehensive error handling:

```typescript
try {
  const data = await apiService.get('/endpoint')
} catch (error) {
  if (error instanceof ApiError) {
    console.log(`API Error: ${error.status} ${error.statusText}`)
    console.log(`Message: ${error.message}`)
  } else {
    console.log(`Network Error: ${error.message}`)
  }
}
```

## CORS Considerations

The API service is designed to work with AWS API Gateway and includes proper headers for CORS handling:

- `Content-Type: application/json`
- `Accept: application/json`

## Testing

The configuration system is fully tested:

```bash
# Run all tests
npm test

# Run only config tests
npm test src/config/config.test.ts

# Run only API service tests
npm test src/services/api.test.ts
```

## Build Process

The system works with both development and production builds:

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Configuration Detection

The system automatically detects the environment:

- **AWS**: URLs containing `execute-api` and `amazonaws.com`
- **Local**: URLs containing `localhost` or `127.0.0.1`

## Validation

The configuration system includes validation to ensure:

- API URL is a valid URL format
- Required environment variables are present
- Configuration is consistent

Invalid configuration will throw descriptive errors during application startup.