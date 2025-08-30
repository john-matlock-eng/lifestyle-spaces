"""Comprehensive tests for achieving 100% coverage of app/core/config.py."""

import pytest
import json
import os
from unittest.mock import patch, Mock
from app.core.config import Settings, parse_cors


class TestConfig100Coverage:
    """Test class for 100% coverage of config module."""
    
    def test_parse_cors_none_value(self):
        """Test parse_cors with None value - Line 18."""
        result = parse_cors(None)
        assert result == []
    
    def test_parse_cors_list_value(self):
        """Test parse_cors with list value - Line 21."""
        test_list = ["http://localhost:3000", "http://example.com"]
        result = parse_cors(test_list)
        assert result == test_list
    
    def test_parse_cors_asterisk_string(self):
        """Test parse_cors with '*' string - Line 26."""
        result = parse_cors("*")
        assert result == ["*"]
    
    def test_parse_cors_json_array_valid(self):
        """Test parse_cors with valid JSON array - Lines 31-34."""
        json_string = '["http://localhost:3000", "http://example.com"]'
        result = parse_cors(json_string)
        assert result == ["http://localhost:3000", "http://example.com"]
        
        # Test with single value JSON
        json_string = '"http://localhost:3000"'
        result = parse_cors(json_string)
        assert result == ["http://localhost:3000"]
    
    def test_parse_cors_json_array_invalid(self):
        """Test parse_cors with invalid JSON - Lines 35-36."""
        # Invalid JSON that starts with '['
        invalid_json = '[invalid json'
        result = parse_cors(invalid_json)
        # Should treat as comma-separated string
        assert result == ['[invalid json']
        
        # JSON that parses but isn't a list
        json_string = '{"key": "value"}'
        result = parse_cors(json_string)
        # Should treat as comma-separated string
        assert result == ['{"key": "value"}']
    
    def test_parse_cors_comma_separated(self):
        """Test parse_cors with comma-separated string - Line 39."""
        csv_string = "http://localhost:3000, http://example.com, http://test.com"
        result = parse_cors(csv_string)
        assert result == ["http://localhost:3000", "http://example.com", "http://test.com"]
        
        # Test with extra spaces and empty values
        csv_string = "http://localhost:3000,  , http://example.com,,"
        result = parse_cors(csv_string)
        assert result == ["http://localhost:3000", "http://example.com"]
    
    def test_parse_cors_other_types(self):
        """Test parse_cors with other types - Lines 41-42."""
        # Integer
        result = parse_cors(123)
        assert result == ["123"]
        
        # Boolean
        result = parse_cors(True)
        assert result == ["True"]
        
        # Object
        class CustomObj:
            def __str__(self):
                return "custom_value"
        
        result = parse_cors(CustomObj())
        assert result == ["custom_value"]
    
    def test_settings_cors_origins_property_none(self):
        """Test Settings.cors_origins property when cors_origins_str is None - Lines 106-109."""
        with patch.dict(os.environ, {}, clear=True):
            # Remove PYTEST_CURRENT_TEST to get non-test defaults
            if 'PYTEST_CURRENT_TEST' in os.environ:
                del os.environ['PYTEST_CURRENT_TEST']
            
            settings = Settings(
                app_name="test",
                environment="dev",
                dynamodb_table_name="test-table",
                cors_origins_str=None
            )
            
            # Should return default production origins
            origins = settings.cors_origins
            assert "http://localhost:3000" in origins
            assert "http://localhost:3001" in origins
            assert "https://*.cloudfront.net" in origins
            assert "https://*.execute-api.us-east-1.amazonaws.com" in origins
    
    def test_settings_cors_origins_property_with_pytest(self):
        """Test Settings.cors_origins property in test environment - Lines 106-107."""
        with patch.dict(os.environ, {'PYTEST_CURRENT_TEST': 'test_file.py::test_method'}, clear=False):
            settings = Settings(
                app_name="test",
                environment="test",
                dynamodb_table_name="test-table",
                cors_origins_str=None
            )
            
            # Should return test origin
            origins = settings.cors_origins
            assert origins == ["http://testserver"]
    
    def test_settings_cors_origins_cached(self):
        """Test Settings.cors_origins property uses cache."""
        settings = Settings(
            app_name="test",
            environment="dev",
            dynamodb_table_name="test-table",
            cors_origins_str="http://custom.com"
        )
        
        # First call
        origins1 = settings.cors_origins
        assert origins1 == ["http://custom.com"]
        
        # Second call should return cached value
        origins2 = settings.cors_origins
        assert origins2 is origins1  # Same object reference
    
    def test_parse_cors_json_number(self):
        """Test parse_cors with JSON number - Line 34."""
        json_string = '123'
        result = parse_cors(json_string)
        assert result == ["123"]
    
    def test_parse_cors_json_parse_error(self):
        """Test parse_cors with JSON parse ValueError - Line 35."""
        # Create a string that starts with '[' but causes ValueError
        with patch('json.loads', side_effect=ValueError("JSON parse error")):
            result = parse_cors('[test')
            # Should fall back to comma-separated parsing
            assert result == ['[test']