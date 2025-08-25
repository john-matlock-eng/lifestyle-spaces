"""
Test script to verify the FastAPI server is working.
"""
import requests
import json


def test_health_endpoint():
    """Test the health check endpoint."""
    try:
        response = requests.get("http://localhost:8000/health")
        if response.status_code == 200:
            data = response.json()
            print("✅ Health check passed!")
            print(f"   Status: {data['status']}")
            print(f"   Version: {data['version']}")
            print(f"   Environment: {data['environment']}")
        else:
            print(f"❌ Health check failed with status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure it's running with:")
        print("   uvicorn app.main:app --reload")
        print("   or")
        print("   make run")


def test_docs_endpoint():
    """Test that API documentation is available."""
    try:
        response = requests.get("http://localhost:8000/docs")
        if response.status_code in [200, 307]:
            print("✅ API documentation is available at http://localhost:8000/docs")
        else:
            print(f"❌ API docs endpoint returned status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        pass  # Already reported in health check


if __name__ == "__main__":
    print("Testing FastAPI server endpoints...")
    print("-" * 40)
    test_health_endpoint()
    test_docs_endpoint()
    print("-" * 40)