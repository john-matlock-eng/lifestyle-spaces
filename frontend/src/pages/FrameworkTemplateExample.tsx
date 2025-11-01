import React, { useState, useEffect } from 'react';
import { FrameworkTemplateForm } from '../components/framework-templates';
import type {
  FrameworkTemplate,
  FrameworkTemplateFormProps,
} from '../components/framework-templates';
import './FrameworkTemplateExample.css';

/**
 * Example page demonstrating framework template usage.
 *
 * This page shows how to:
 * 1. Fetch a template from the API
 * 2. Render it with FrameworkTemplateForm
 * 3. Handle completion submission
 * 4. Display success/error states
 *
 * To use in your app:
 * - Replace mock data with actual API calls
 * - Add routing to this page
 * - Integrate with your authentication context
 * - Connect to your space context
 */

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

const FrameworkTemplateExamplePage: React.FC = () => {
  const [template, setTemplate] = useState<FrameworkTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Mock API configuration - replace with your actual API
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const TEMPLATE_ID = 'a1-daily-session-header'; // Replace with actual template ID
  const SPACE_ID = 'your-space-id'; // Replace with actual space ID from context

  /**
   * Fetch template from API
   */
  const fetchTemplate = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/framework-templates/${TEMPLATE_ID}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }

      const data: FrameworkTemplate = await response.json();
      setTemplate(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error loading template: ${message}`);
      console.error('Failed to fetch template:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Submit completion to API
   */
  const handleSubmit = async (
    fieldValues: Record<string, string | number | boolean | string[]>
  ): Promise<void> => {
    if (!template) {
      throw new Error('No template loaded');
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/framework-templates/completions?space_id=${SPACE_ID}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templateId: template.templateId,
            fieldValues,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit completion');
      }

      const completion = await response.json();
      setSuccess('✅ Completion saved successfully!');

      // Log success for debugging
      console.log('Completion saved:', completion);

      // Optional: Reset form or redirect
      // setTimeout(() => {
      //   window.location.href = '/dashboard';
      // }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error saving completion: ${message}`);
      console.error('Failed to submit completion:', err);
      throw err; // Re-throw so form knows submission failed
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetch template on mount
   */
  useEffect(() => {
    fetchTemplate();
  }, []);

  /**
   * Render loading state
   */
  if (isLoading && !template) {
    return (
      <div className="framework-template-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading template...</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error && !template) {
    return (
      <div className="framework-template-page">
        <div className="error-container">
          <h2>❌ Error Loading Template</h2>
          <p>{error}</p>
          <button onClick={fetchTemplate} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  /**
   * Render template form
   */
  if (template) {
    return (
      <div className="framework-template-page">
        <div className="page-header">
          <h1>Framework Template Example</h1>
          <p className="page-description">
            This page demonstrates how to use the FrameworkTemplateForm component.
            Replace the mock API calls with your actual implementation.
          </p>
        </div>

        {success && (
          <div className="success-banner" role="alert">
            {success}
          </div>
        )}

        <FrameworkTemplateForm
          template={template}
          onSubmit={handleSubmit}
          onCancel={() => {
            // Optional: Navigate back or clear form
            console.log('Form cancelled');
            window.history.back();
          }}
          isLoading={isLoading}
          error={error}
          submitButtonText="Save Completion"
        />

        <div className="developer-notes">
          <h3>📝 Developer Notes</h3>
          <ul>
            <li>
              <strong>Template ID:</strong> {template.templateId}
            </li>
            <li>
              <strong>Version:</strong> {template.version}
            </li>
            <li>
              <strong>Sections:</strong> {template.sections.length}
            </li>
            <li>
              <strong>Total Fields:</strong>{' '}
              {template.sections.reduce((sum, section) => sum + section.fields.length, 0)}
            </li>
            <li>
              <strong>API Base URL:</strong> {API_BASE_URL}
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return null;
};

export default FrameworkTemplateExamplePage;

/**
 * INTEGRATION GUIDE
 * =================
 *
 * 1. Add route to your router:
 *    ```tsx
 *    import FrameworkTemplateExamplePage from './pages/FrameworkTemplateExample';
 *
 *    <Route path="/templates/:templateId" element={<FrameworkTemplateExamplePage />} />
 *    ```
 *
 * 2. Replace mock data with actual API calls:
 *    - Use your API service/client
 *    - Handle authentication properly
 *    - Add error boundaries
 *
 * 3. Integrate with authentication context:
 *    ```tsx
 *    const { user, token } = useAuth();
 *    ```
 *
 * 4. Integrate with space context:
 *    ```tsx
 *    const { currentSpace } = useSpace();
 *    const SPACE_ID = currentSpace?.spaceId;
 *    ```
 *
 * 5. Add proper error handling and loading states
 *
 * 6. Consider adding these features:
 *    - Save as draft (partial completion)
 *    - Edit existing completion
 *    - View completion history
 *    - Template preview mode
 *    - Print/export completion
 *
 * 7. For production:
 *    - Add analytics tracking
 *    - Add performance monitoring
 *    - Add accessibility testing
 *    - Add error logging (Sentry, etc.)
 */
