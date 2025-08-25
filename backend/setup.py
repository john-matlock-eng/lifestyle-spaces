"""
Setup script for development environment.
"""
import subprocess
import sys
import os


def setup_development():
    """Set up development environment."""
    print("Setting up Lifestyle Spaces Backend development environment...")
    
    # Install dependencies
    print("\n1. Installing dependencies...")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
    
    # Create .env file if it doesn't exist
    if not os.path.exists(".env"):
        print("\n2. Creating .env file from .env.example...")
        with open(".env.example", "r") as example_file:
            content = example_file.read()
        
        # Generate a random JWT secret for development
        import secrets
        jwt_secret = secrets.token_urlsafe(32)
        content = content.replace("your-secret-key-here-change-in-production", jwt_secret)
        
        with open(".env", "w") as env_file:
            env_file.write(content)
        print("   .env file created with development settings")
    else:
        print("\n2. .env file already exists, skipping...")
    
    # Run tests
    print("\n3. Running tests...")
    result = subprocess.run([sys.executable, "-m", "pytest", "--cov", "--cov-fail-under=0"], capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print(result.stderr)
    
    print("\nSetup complete! You can now:")
    print("  - Run tests: pytest")
    print("  - Run with coverage: pytest --cov")
    print("  - Start development server: uvicorn app.main:app --reload")
    print("  - View API docs: http://localhost:8000/docs")


if __name__ == "__main__":
    setup_development()