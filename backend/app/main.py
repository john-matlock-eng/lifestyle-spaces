"""
Main FastAPI application.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import health
from app import __version__


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"Starting Lifestyle Spaces API v{__version__}")
    print(f"Environment: {settings.environment}")
    print(f"DynamoDB Table: {settings.dynamodb_table}")
    yield
    # Shutdown
    print("Shutting down Lifestyle Spaces API")


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

# Include routers
app.include_router(health.router)

# Import API routes
from app.api.routes import auth, users, spaces, invitations

# Include API routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(spaces.router)
app.include_router(invitations.router)