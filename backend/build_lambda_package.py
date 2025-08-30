#!/usr/bin/env python3
"""
Build Lambda deployment package for FastAPI application.
Creates a zip file with all dependencies for AWS Lambda.
"""
import os
import sys
import shutil
import subprocess
import zipfile
from pathlib import Path


def clean_build_dir(build_dir: Path):
    """Clean the build directory."""
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir(parents=True)
    print(f" Created clean build directory: {build_dir}")


def install_dependencies(build_dir: Path, requirements_file: Path):
    """Install dependencies to build directory."""
    print("Installing dependencies...")
    subprocess.check_call([
        sys.executable, "-m", "pip", "install",
        "-r", requirements_file,
        "-t", str(build_dir),
        "--platform", "manylinux2014_x86_64",
        "--only-binary=:all:",
        "--upgrade"
    ])
    print(" Dependencies installed")


def copy_application_code(src_dir: Path, build_dir: Path):
    """Copy application code to build directory."""
    print("Copying application code...")
    
    # Copy the app directory
    app_src = src_dir / "app"
    app_dst = build_dir / "app"
    shutil.copytree(app_src, app_dst)
    
    # Copy the lambda handler
    handler_src = src_dir / "lambda_handler.py"
    handler_dst = build_dir / "lambda_handler.py"
    shutil.copy2(handler_src, handler_dst)
    
    print(" Application code copied")


def remove_unnecessary_files(build_dir: Path):
    """Remove unnecessary files to reduce package size."""
    print("Cleaning unnecessary files...")
    
    patterns_to_remove = [
        "**/__pycache__",
        "**/*.pyc",
        "**/*.pyo",
        "**/*.pyd",
        "**/tests",
        "**/test",
        "**/*.dist-info/RECORD",
        "**/*.dist-info/WHEEL",
        "**/*.dist-info/top_level.txt",
        "**/boto3*",  # Lambda runtime provides boto3
        "**/botocore*",  # Lambda runtime provides botocore
    ]
    
    for pattern in patterns_to_remove:
        for path in build_dir.glob(pattern):
            if path.is_dir():
                shutil.rmtree(path)
            else:
                path.unlink()
    
    print(" Unnecessary files removed")


def create_zip_package(build_dir: Path, output_file: Path):
    """Create zip package from build directory."""
    print(f"Creating zip package: {output_file}")
    
    with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(build_dir):
            for file in files:
                file_path = Path(root) / file
                arcname = file_path.relative_to(build_dir)
                zipf.write(file_path, arcname)
    
    # Get file size
    size_mb = output_file.stat().st_size / (1024 * 1024)
    print(f" Package created: {output_file.name} ({size_mb:.2f} MB)")
    
    if size_mb > 50:
        print("WARNING:  Warning: Package size exceeds 50MB. Consider using Lambda Layers.")
    
    return output_file


def verify_package(zip_file: Path):
    """Verify the package contents."""
    print("Verifying package contents...")
    
    required_files = [
        "lambda_handler.py",
        "app/__init__.py",
        "app/main.py",
        "mangum/__init__.py",
        "fastapi/__init__.py"
    ]
    
    with zipfile.ZipFile(zip_file, 'r') as zipf:
        file_list = zipf.namelist()
        
        for required in required_files:
            if required not in file_list:
                print(f"WARNING:  Warning: {required} not found in package")
            else:
                print(f"   {required}")
    
    print(" Package verification complete")


def main():
    """Main build process."""
    # Setup paths
    backend_dir = Path(__file__).parent
    build_dir = backend_dir / "build_lambda"
    output_file = backend_dir / "lambda-deployment.zip"
    requirements_file = backend_dir / "requirements.txt"
    
    print(" Building Lambda deployment package for FastAPI")
    print(f"   Backend directory: {backend_dir}")
    print(f"   Output: {output_file}\n")
    
    try:
        # Clean build directory
        clean_build_dir(build_dir)
        
        # Install dependencies
        install_dependencies(build_dir, requirements_file)
        
        # Copy application code
        copy_application_code(backend_dir, build_dir)
        
        # Remove unnecessary files
        remove_unnecessary_files(build_dir)
        
        # Create zip package
        create_zip_package(build_dir, output_file)
        
        # Verify package
        verify_package(output_file)
        
        # Clean up build directory
        shutil.rmtree(build_dir)
        print("\n Lambda package built successfully!")
        print(f"   Deploy {output_file.name} to AWS Lambda")
        
        return 0
        
    except Exception as e:
        print(f"\n Build failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
