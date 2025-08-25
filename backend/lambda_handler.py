"""
AWS Lambda handler for FastAPI application.
"""
from mangum import Mangum
from app.main import app

# Create Mangum handler for AWS Lambda
handler = Mangum(app, lifespan="off")