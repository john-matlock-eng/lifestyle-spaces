/**
 * SelectField Component
 *
 * Dropdown select with glassmorphism styling.
 * Features searchable options, custom rendering, and accessibility.
 *
 * @module form-fields/select/SelectField
 */

import {
  useId,
  useMemo,
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from 'react'
import type { FieldValues } from 'react-hook-form'
import type { SelectFieldProps, FieldOption } from '../types'
import { ChevronDown, X, Check } from 'lucide-react'
import '../form-fields.css'

/**
 * SelectField - Dropdown select with glassmorphism styling
 *
 * @example
 * ```tsx
 * <SelectField
 *   id="category"
 *   name="category"
 *   label="Category"
 *   options={[
 *     { value: 'health', label: 'Health' },
 *     { value: 'career', label: 'Career' },
 *   ]}
 *   register={register}
 *   watch={watch}
 *   setValue={setValue}
 *   error={errors.category}
 *   searchable
 *   clearable
 * />
 * ```
 */
export function SelectField<TFieldValues extends FieldValues = FieldValues>({
  id,
  name,
  label,
  description,
  placeholder = 'Select an option',
  required = false,
  disabled = false,
  error,
  className = '',
  ariaLabel,
  ariaDescribedBy,
  testId,
  register,
  watch,
  setValue,
  options,
  searchable = false,
  searchPlaceholder = 'Search...',
  renderOption,
  renderValue,
  clearable = false,
  emptyMessage = 'No options available',
}: SelectFieldProps<TFieldValues>): JSX.Element {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`
  const listboxId = `${fieldId}-listbox`

  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listboxRef = useRef<HTMLDivElement>(null)

  // Watch the current value
  const currentValue = watch ? watch(name) : undefined

  // Find selected option
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === currentValue) || null
  }, [options, currentValue])

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options
    const query = searchQuery.toLowerCase()
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.description?.toLowerCase().includes(query)
    )
  }, [options, searchQuery])

  // Build validation rules for hidden input
  const validationRules = useMemo(() => {
    const rules: Record<string, unknown> = {}
    if (required) {
      rules.required = 'This field is required'
    }
    return rules
  }, [required])

  // Build aria-describedby
  const describedByIds = useMemo(() => {
    const ids: string[] = []
    if (ariaDescribedBy) ids.push(ariaDescribedBy)
    if (description) ids.push(descriptionId)
    if (error) ids.push(errorId)
    return ids.length > 0 ? ids.join(' ') : undefined
  }, [ariaDescribedBy, description, error, descriptionId, errorId])

  // Handle option selection
  const handleSelect = useCallback(
    (option: FieldOption) => {
      if (option.disabled || !setValue) return
      setValue(name, option.value as any, { shouldValidate: true })
      setIsOpen(false)
      setSearchQuery('')
      triggerRef.current?.focus()
    },
    [setValue, name]
  )

  // Handle clear
  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!setValue) return
      setValue(name, undefined as any, { shouldValidate: true })
    },
    [setValue, name]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (disabled) return

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (!isOpen) {
            setIsOpen(true)
          } else if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            handleSelect(filteredOptions[highlightedIndex])
          }
          break

        case 'ArrowDown':
          e.preventDefault()
          if (!isOpen) {
            setIsOpen(true)
          } else {
            setHighlightedIndex((prev) =>
              prev < filteredOptions.length - 1 ? prev + 1 : prev
            )
          }
          break

        case 'ArrowUp':
          e.preventDefault()
          if (isOpen) {
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev))
          }
          break

        case 'Home':
          e.preventDefault()
          if (isOpen) {
            setHighlightedIndex(0)
          }
          break

        case 'End':
          e.preventDefault()
          if (isOpen) {
            setHighlightedIndex(filteredOptions.length - 1)
          }
          break

        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setSearchQuery('')
          triggerRef.current?.focus()
          break

        case 'Tab':
          setIsOpen(false)
          setSearchQuery('')
          break
      }
    },
    [disabled, isOpen, highlightedIndex, filteredOptions, handleSelect]
  )

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen, searchable])

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listboxRef.current) {
      const option = listboxRef.current.children[highlightedIndex] as HTMLElement
      option?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex])

  // Reset highlight when options change
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [filteredOptions.length])

  // Wrapper classes
  const wrapperClasses = [
    'field-input-wrapper',
    error && 'field-input-wrapper--error',
    disabled && 'field-input-wrapper--disabled',
  ]
    .filter(Boolean)
    .join(' ')

  // Render trigger content
  const triggerContent = () => {
    if (selectedOption) {
      if (renderValue) {
        return renderValue(selectedOption)
      }
      return <span>{selectedOption.label}</span>
    }
    return <span className="field-select-trigger--placeholder">{placeholder}</span>
  }

  return (
    <div
      className={`field-container ${className}`}
      data-testid={testId}
      ref={containerRef}
    >
      {label && (
        <label htmlFor={fieldId} className="field-label">
          {label}
          {required && (
            <span className="field-label-required" aria-label="required">
              *
            </span>
          )}
        </label>
      )}

      {description && (
        <p id={descriptionId} className="field-description">
          {description}
        </p>
      )}

      <div className={wrapperClasses}>
        <div className="field-select-container">
          {/* Hidden input for form integration */}
          <input type="hidden" {...register(name, validationRules)} />

          {/* Custom select trigger */}
          <button
            ref={triggerRef}
            id={fieldId}
            type="button"
            className="field-select-trigger"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-label={ariaLabel || label}
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={describedByIds}
            data-testid={testId ? `${testId}-trigger` : undefined}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
          >
            {triggerContent()}
          </button>

          {/* Clear button */}
          {clearable && selectedOption && !disabled && (
            <button
              type="button"
              className="field-select-clear"
              onClick={handleClear}
              aria-label="Clear selection"
              tabIndex={-1}
            >
              <X size={16} />
            </button>
          )}

          {/* Dropdown icon */}
          <span className={`field-select-icon ${isOpen ? 'field-select-icon--open' : ''}`}>
            <ChevronDown size={20} />
          </span>

          {/* Dropdown */}
          {isOpen && (
            <div
              id={listboxId}
              role="listbox"
              className="field-select-dropdown"
              aria-label={`${label} options`}
              data-testid={testId ? `${testId}-dropdown` : undefined}
            >
              {/* Search input */}
              {searchable && (
                <div className="field-select-search">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="field-select-search-input"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    aria-label="Search options"
                    data-testid={testId ? `${testId}-search` : undefined}
                  />
                </div>
              )}

              {/* Options */}
              <div className="field-select-options" ref={listboxRef}>
                {filteredOptions.length === 0 ? (
                  <div className="field-select-empty">{emptyMessage}</div>
                ) : (
                  filteredOptions.map((option, index) => (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      className={`field-select-option ${
                        option.value === currentValue ? 'field-select-option--selected' : ''
                      } ${index === highlightedIndex ? 'field-select-option--highlighted' : ''}`}
                      disabled={option.disabled}
                      aria-selected={option.value === currentValue}
                      onClick={() => handleSelect(option)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      data-testid={testId ? `${testId}-option-${option.value}` : undefined}
                    >
                      {renderOption ? (
                        renderOption(option)
                      ) : (
                        <>
                          <span>{option.label}</span>
                          {option.description && (
                            <span className="field-select-option-desc">
                              {option.description}
                            </span>
                          )}
                        </>
                      )}
                      {option.value === currentValue && (
                        <Check size={16} style={{ marginLeft: 'auto' }} />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}

export default SelectField
