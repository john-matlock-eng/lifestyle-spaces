import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import ScaleInput from './ScaleInput';
import './FrameworkTemplateForm.css';

export interface FrameworkTemplateField {
  fieldId: string;
  fieldName: string;
  fieldType: 'text' | 'textarea' | 'date' | 'number' | 'scale_1_7' | 'scale_0_10' | 'scale_custom' | 'checkbox' | 'select' | 'multi_select';
  required: boolean;
  helpText?: string;
  defaultValue?: string | number | boolean | string[];
  placeholder?: string;
  scaleConfig?: {
    minValue: number;
    maxValue: number;
    minLabel?: string;
    maxLabel?: string;
    step?: number;
  };
  options?: string[];
  autoDate?: boolean;
  order: number;
}

export interface FrameworkTemplateSection {
  sectionId: string;
  sectionName: string;
  description?: string;
  fields: FrameworkTemplateField[];
  order: number;
  collapsible?: boolean;
}

export interface FrameworkTemplate {
  templateId: string;
  name: string;
  description: string;
  sections: FrameworkTemplateSection[];
  icon?: string;
  color?: string;
  tags: string[];
}

export interface FrameworkTemplateFormProps {
  template: FrameworkTemplate;
  initialValues?: Record<string, string | number | boolean | string[]>;
  onSubmit: (data: Record<string, string | number | boolean | string[]>) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
  submitButtonText?: string;
}

export const FrameworkTemplateForm: React.FC<FrameworkTemplateFormProps> = ({
  template,
  initialValues = {},
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
  submitButtonText = 'Submit',
}) => {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [autoDatedFields, setAutoDatedFields] = useState<Set<string>>(new Set());

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm({
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: initialValues,
  });

  // Auto-populate date fields on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const autoDateFields: Set<string> = new Set();

    template.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.autoDate && field.fieldType === 'date') {
          // Only auto-populate if no initial value
          if (!initialValues[field.fieldId]) {
            setValue(field.fieldId, today);
            autoDateFields.add(field.fieldId);
          }
        }
      });
    });

    setAutoDatedFields(autoDateFields);
  }, [template, initialValues, setValue]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const onFormSubmit = async (data: Record<string, string | number | boolean | string[]>) => {
    try {
      await onSubmit(data);
      reset();
    } catch {
      // Error handled by parent
    }
  };

  const renderField = (field: FrameworkTemplateField) => {
    const fieldError = errors[field.fieldId]?.message as string | undefined;

    switch (field.fieldType) {
      case 'scale_1_7':
      case 'scale_0_10':
      case 'scale_custom':
        return (
          <Controller
            key={field.fieldId}
            name={field.fieldId}
            control={control}
            rules={{
              required: field.required ? `${field.fieldName} is required` : false,
            }}
            render={({ field: { onChange, value } }) => (
              <ScaleInput
                id={field.fieldId}
                name={field.fieldId}
                label={field.fieldName}
                value={value ?? null}
                onChange={onChange}
                scaleType={field.fieldType}
                scaleConfig={field.scaleConfig}
                helpText={field.helpText}
                required={field.required}
                disabled={isLoading}
                error={fieldError}
              />
            )}
          />
        );

      case 'text':
        return (
          <Controller
            key={field.fieldId}
            name={field.fieldId}
            control={control}
            rules={{
              required: field.required ? `${field.fieldName} is required` : false,
            }}
            render={({ field: { onChange, value } }) => (
              <div className="form-field">
                <label htmlFor={field.fieldId} className="field-label">
                  {field.fieldName}
                  {field.required && <span className="required-indicator"> *</span>}
                </label>
                {field.helpText && (
                  <div className="field-help-text">
                    <span className="help-icon">💡</span>
                    {field.helpText}
                  </div>
                )}
                <input
                  type="text"
                  id={field.fieldId}
                  value={value ?? ''}
                  onChange={onChange}
                  placeholder={field.placeholder}
                  disabled={isLoading}
                  className={fieldError ? 'has-error' : ''}
                  aria-describedby={field.helpText ? `${field.fieldId}-help` : undefined}
                  aria-invalid={fieldError ? 'true' : 'false'}
                />
                {fieldError && (
                  <div className="field-error" role="alert">
                    {fieldError}
                  </div>
                )}
              </div>
            )}
          />
        );

      case 'textarea':
        return (
          <Controller
            key={field.fieldId}
            name={field.fieldId}
            control={control}
            rules={{
              required: field.required ? `${field.fieldName} is required` : false,
            }}
            render={({ field: { onChange, value } }) => (
              <div className="form-field">
                <label htmlFor={field.fieldId} className="field-label">
                  {field.fieldName}
                  {field.required && <span className="required-indicator"> *</span>}
                </label>
                {field.helpText && (
                  <div className="field-help-text">
                    <span className="help-icon">💡</span>
                    {field.helpText}
                  </div>
                )}
                <textarea
                  id={field.fieldId}
                  value={value ?? ''}
                  onChange={onChange}
                  placeholder={field.placeholder}
                  disabled={isLoading}
                  className={fieldError ? 'has-error' : ''}
                  rows={4}
                  aria-describedby={field.helpText ? `${field.fieldId}-help` : undefined}
                  aria-invalid={fieldError ? 'true' : 'false'}
                />
                {fieldError && (
                  <div className="field-error" role="alert">
                    {fieldError}
                  </div>
                )}
              </div>
            )}
          />
        );

      case 'date':
        return (
          <Controller
            key={field.fieldId}
            name={field.fieldId}
            control={control}
            rules={{
              required: field.required ? `${field.fieldName} is required` : false,
            }}
            render={({ field: { onChange, value } }) => (
              <div className="form-field">
                <label htmlFor={field.fieldId} className="field-label">
                  {field.fieldName}
                  {field.required && <span className="required-indicator"> *</span>}
                  {autoDatedFields.has(field.fieldId) && (
                    <span className="auto-dated-badge">Auto-filled</span>
                  )}
                </label>
                {field.helpText && (
                  <div className="field-help-text">
                    <span className="help-icon">💡</span>
                    {field.helpText}
                  </div>
                )}
                <input
                  type="date"
                  id={field.fieldId}
                  value={value ?? ''}
                  onChange={onChange}
                  disabled={isLoading}
                  className={fieldError ? 'has-error' : ''}
                  aria-describedby={field.helpText ? `${field.fieldId}-help` : undefined}
                  aria-invalid={fieldError ? 'true' : 'false'}
                />
                {fieldError && (
                  <div className="field-error" role="alert">
                    {fieldError}
                  </div>
                )}
              </div>
            )}
          />
        );

      case 'number':
        return (
          <Controller
            key={field.fieldId}
            name={field.fieldId}
            control={control}
            rules={{
              required: field.required ? `${field.fieldName} is required` : false,
            }}
            render={({ field: { onChange, value } }) => (
              <div className="form-field">
                <label htmlFor={field.fieldId} className="field-label">
                  {field.fieldName}
                  {field.required && <span className="required-indicator"> *</span>}
                </label>
                {field.helpText && (
                  <div className="field-help-text">
                    <span className="help-icon">💡</span>
                    {field.helpText}
                  </div>
                )}
                <input
                  type="number"
                  id={field.fieldId}
                  value={value ?? ''}
                  onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
                  placeholder={field.placeholder}
                  disabled={isLoading}
                  className={fieldError ? 'has-error' : ''}
                  aria-describedby={field.helpText ? `${field.fieldId}-help` : undefined}
                  aria-invalid={fieldError ? 'true' : 'false'}
                />
                {fieldError && (
                  <div className="field-error" role="alert">
                    {fieldError}
                  </div>
                )}
              </div>
            )}
          />
        );

      case 'checkbox':
        return (
          <Controller
            key={field.fieldId}
            name={field.fieldId}
            control={control}
            render={({ field: { onChange, value } }) => (
              <div className="form-field checkbox-field">
                <label htmlFor={field.fieldId} className="checkbox-label">
                  <input
                    type="checkbox"
                    id={field.fieldId}
                    checked={value ?? false}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span>
                    {field.fieldName}
                    {field.required && <span className="required-indicator"> *</span>}
                  </span>
                </label>
                {field.helpText && (
                  <div className="field-help-text">
                    <span className="help-icon">💡</span>
                    {field.helpText}
                  </div>
                )}
                {fieldError && (
                  <div className="field-error" role="alert">
                    {fieldError}
                  </div>
                )}
              </div>
            )}
          />
        );

      case 'select':
        return (
          <Controller
            key={field.fieldId}
            name={field.fieldId}
            control={control}
            rules={{
              required: field.required ? `${field.fieldName} is required` : false,
            }}
            render={({ field: { onChange, value } }) => (
              <div className="form-field">
                <label htmlFor={field.fieldId} className="field-label">
                  {field.fieldName}
                  {field.required && <span className="required-indicator"> *</span>}
                </label>
                {field.helpText && (
                  <div className="field-help-text">
                    <span className="help-icon">💡</span>
                    {field.helpText}
                  </div>
                )}
                <select
                  id={field.fieldId}
                  value={value ?? ''}
                  onChange={onChange}
                  disabled={isLoading}
                  className={fieldError ? 'has-error' : ''}
                  aria-describedby={field.helpText ? `${field.fieldId}-help` : undefined}
                  aria-invalid={fieldError ? 'true' : 'false'}
                >
                  <option value="">Select an option...</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {fieldError && (
                  <div className="field-error" role="alert">
                    {fieldError}
                  </div>
                )}
              </div>
            )}
          />
        );

      case 'multi_select':
        return (
          <Controller
            key={field.fieldId}
            name={field.fieldId}
            control={control}
            rules={{
              required: field.required ? `${field.fieldName} is required` : false,
            }}
            render={({ field: { onChange, value } }) => {
              const selectedValues = value ?? [];
              const toggleOption = (option: string) => {
                const newValues = selectedValues.includes(option)
                  ? selectedValues.filter((v: string) => v !== option)
                  : [...selectedValues, option];
                onChange(newValues);
              };

              return (
                <div className="form-field">
                  <label className="field-label">
                    {field.fieldName}
                    {field.required && <span className="required-indicator"> *</span>}
                  </label>
                  {field.helpText && (
                    <div className="field-help-text">
                      <span className="help-icon">💡</span>
                      {field.helpText}
                    </div>
                  )}
                  <div className="multi-select-options">
                    {field.options?.map((option) => (
                      <label key={option} className="multi-select-option">
                        <input
                          type="checkbox"
                          checked={selectedValues.includes(option)}
                          onChange={() => toggleOption(option)}
                          disabled={isLoading}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  {fieldError && (
                    <div className="field-error" role="alert">
                      {fieldError}
                    </div>
                  )}
                </div>
              );
            }}
          />
        );

      default:
        return null;
    }
  };

  // Sort sections by order
  const sortedSections = [...template.sections].sort((a, b) => a.order - b.order);

  return (
    <div className="framework-template-form">
      <div className="form-header">
        {template.icon && <span className="template-icon">{template.icon}</span>}
        <h2 className="template-name">{template.name}</h2>
        <p className="template-description">{template.description}</p>
      </div>

      {error && (
        <div className="form-error-banner" role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onFormSubmit)}
        className="form"
        role="form"
        aria-label={`${template.name} form`}
      >
        {sortedSections.map((section) => {
          const isCollapsed = collapsedSections.has(section.sectionId);
          // Sort fields by order
          const sortedFields = [...section.fields].sort((a, b) => a.order - b.order);

          return (
            <div key={section.sectionId} className="form-section">
              <div className="section-header">
                <h3 className="section-name">{section.sectionName}</h3>
                {section.description && (
                  <p className="section-description">{section.description}</p>
                )}
                {section.collapsible && (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.sectionId)}
                    className="section-toggle"
                    aria-expanded={!isCollapsed}
                    aria-controls={`section-${section.sectionId}`}
                  >
                    {isCollapsed ? '▶' : '▼'}
                  </button>
                )}
              </div>

              <div
                id={`section-${section.sectionId}`}
                className={`section-fields ${isCollapsed ? 'collapsed' : ''}`}
              >
                {sortedFields.map(renderField)}
              </div>
            </div>
          );
        })}

        <div className="form-actions">
          <button
            type="submit"
            disabled={isLoading}
            className="submit-button"
          >
            {isLoading ? 'Submitting...' : submitButtonText}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="cancel-button"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default FrameworkTemplateForm;
