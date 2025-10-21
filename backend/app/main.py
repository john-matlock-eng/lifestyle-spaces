"""
Main FastAPI application.
"""
import logging
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.routes import health
from app import __version__

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info(f"Starting Lifestyle Spaces API v{__version__}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"DynamoDB Table: {settings.dynamodb_table}")
    
    # Log Cognito configuration status
    import os
    cognito_pool = os.getenv('COGNITO_USER_POOL_ID', 'NOT SET')
    cognito_client = os.getenv('COGNITO_USER_POOL_CLIENT_ID', 'NOT SET')
    logger.info(f"Cognito User Pool: {cognito_pool[:20]}..." if cognito_pool != 'NOT SET' else "Cognito User Pool: NOT SET")
    logger.info(f"Cognito Client: {cognito_client[:20]}..." if cognito_client != 'NOT SET' else "Cognito Client: NOT SET")
    
    yield
    # Shutdown
    logger.info("Shutting down Lifestyle Spaces API")


# Create FastAPI app
app = FastAPI(
    title="Lifestyle Spaces API",
    description="Backend API for Lifestyle Spaces real estate platform",
    version=__version__,
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests and responses."""
    # Log request
    logger.info(f"Incoming request: {request.method} {request.url.path}")
    
    try:
        # Process request
        response = await call_next(request)
        
        # Log response status
        logger.info(f"Response: {request.method} {request.url.path} - Status: {response.status_code}")
        
        return response
    except Exception as e:
        # Log any errors that occur during request processing
        logger.error(f"Error processing {request.method} {request.url.path}: {str(e)}", exc_info=True)
        raise

# Add exception handler for debugging
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler to log all unhandled errors."""
    # Log the full error with traceback
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {str(exc)}")
    logger.error(f"Full traceback:\n{traceback.format_exc()}")
    
    # Return error response
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc) if settings.environment == "dev" else "An error occurred",
            "path": str(request.url.path),
            "method": request.method
        }
    )

# Include routers
app.include_router(health.router)

# Import API routes
from app.api.routes import auth, users, spaces, invitations, user_profile, journals, templates, llm, highlights, websocket_highlights

# Include API routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(spaces.router)
app.include_router(invitations.router)
app.include_router(user_profile.router)
app.include_router(journals.router)
app.include_router(templates.router)
app.include_router(llm.router)
app.include_router(highlights.router)
app.include_router(websocket_highlights.router)