#!/usr/bin/env python3
"""
Script to create a placeholder Lambda deployment package.
This is used when the actual FastAPI application isn't ready yet.
"""
import zipfile
import os
import sys


def create_placeholder_zip():
    """Create a placeholder Lambda deployment package."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    zip_path = os.path.join(script_dir, 'lambda-placeholder.zip')
    handler_path = os.path.join(script_dir, 'lambda_handler.py')
    
    # Check if handler file exists
    if not os.path.exists(handler_path):
        print(f"Error: {handler_path} not found!")
        sys.exit(1)
    
    # Create the zip file
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        zipf.write(handler_path, 'lambda_handler.py')
    
    print(f"Created placeholder Lambda package: {zip_path}")
    return zip_path


if __name__ == "__main__":
    create_placeholder_zip()