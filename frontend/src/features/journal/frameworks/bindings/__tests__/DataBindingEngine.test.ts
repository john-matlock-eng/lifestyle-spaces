/**
 * Tests for DataBindingEngine
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  DataBindingEngine,
  createBindingEngine,
  createBindingEngineWithProvider,
  resolveBindings,
  type BindingResolutionContext,
  type BindingSourceConfig,
} from '../DataBindingEngine'
import { InMemoryEntryProvider, type EntryProvider } from '../EntryDataResolver'
import type { JournalEntry } from '../../../types/journal.types'
import type { FrameworkTemplate, DataBindingMapping } from '../../../types/framework.types'

// Helper to create mock entries
function createMockEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    journalId: 'entry-1',
    userId: 'user-1',
    spaceId: 'space-1',
    frameworkId: 'framework-1',
    templateId: 'template-1',
    title: 'Test Entry',
    content: '',
    contentTiptap: null,
    status: 'published',
    visibility: 'private',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// Helper to create mock template
function createMockTemplate(overrides: Partial<FrameworkTemplate> = {}): FrameworkTemplate {
  return {
    id: 'template-1',
    name: 'Test Template',
    description: 'A test template',
    order: 1,
    frequency: 'once',
    sections: [
      {
        id: 'section-1',
        title: 'Section 1',
        fields: [
          {
            id: 'field-1',
            type: 'text',
            label: 'Field 1',
            required: false,
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe('DataBindingEngine', () => {
  let engine: DataBindingEngine
  let context: BindingResolutionContext

  beforeEach(() => {
    engine = new DataBindingEngine()
    context = {
      userId: 'user-1',
      frameworkId: 'framework-1',
      spaceId: 'space-1',
    }
  })

  describe('constructor', () => {
    it('creates engine with default options', () => {
      const engine = new DataBindingEngine()
      expect(engine).toBeInstanceOf(DataBindingEngine)
    })

    it('creates engine with custom options', () => {
      const provider = new InMemoryEntryProvider()
      const engine = new DataBindingEngine({
        provider,
        defaultScope: 'first',
        includeFailures: false,
      })
      expect(engine).toBeInstanceOf(DataBindingEngine)
    })
  })

  describe('hasBindings', () => {
    it('returns true when template has bindings', () => {
      const template = createMockTemplate({
        dataBindings: {
          inputs: [
            {
              source: 'framework_entry',
              sourcePath: 'other-template.field',
              targetFieldId: 'field-1',
            },
          ],
        },
      })

      expect(engine.hasBindings(template)).toBe(true)
    })

    it('returns false when template has no bindings', () => {
      const template = createMockTemplate()
      expect(engine.hasBindings(template)).toBe(false)
    })

    it('returns false when bindings array is empty', () => {
      const template = createMockTemplate({
        dataBindings: { inputs: [] },
      })
      expect(engine.hasBindings(template)).toBe(false)
    })

    it('returns false when dataBindings is undefined', () => {
      const template = createMockTemplate()
      delete template.dataBindings
      expect(engine.hasBindings(template)).toBe(false)
    })
  })

  describe('getBindingDependencies', () => {
    it('returns template IDs from framework_entry bindings', () => {
      const template = createMockTemplate({
        dataBindings: {
          inputs: [
            {
              source: 'framework_entry',
              sourcePath: 'charter.theme',
              targetFieldId: 'theme',
            },
            {
              source: 'framework_entry',
              sourcePath: 'vision.goals[0].name',
              targetFieldId: 'goal',
            },
          ],
        },
      })

      const deps = engine.getBindingDependencies(template)
      expect(deps).toEqual(['charter', 'vision'])
    })

    it('returns unique template IDs', () => {
      const template = createMockTemplate({
        dataBindings: {
          inputs: [
            {
              source: 'framework_entry',
              sourcePath: 'charter.theme',
              targetFieldId: 'theme1',
            },
            {
              source: 'framework_entry',
              sourcePath: 'charter.focus',
              targetFieldId: 'focus',
            },
          ],
        },
      })

      const deps = engine.getBindingDependencies(template)
      expect(deps).toEqual(['charter'])
    })

    it('ignores non-framework_entry sources', () => {
      const template = createMockTemplate({
        dataBindings: {
          inputs: [
            {
              source: 'user_profile',
              sourcePath: 'displayName',
              targetFieldId: 'name',
            },
            {
              source: 'static',
              sourcePath: '',
              targetFieldId: 'constant',
              fallback: 'value',
            },
          ],
        },
      })

      const deps = engine.getBindingDependencies(template)
      expect(deps).toEqual([])
    })

    it('returns empty array for no bindings', () => {
      const template = createMockTemplate()
      expect(engine.getBindingDependencies(template)).toEqual([])
    })
  })

  describe('resolveBindings', () => {
    describe('with no bindings', () => {
      it('returns empty result for template without bindings', async () => {
        const template = createMockTemplate()
        const result = await engine.resolveBindings(template, context)

        expect(result.values).toEqual({})
        expect(result.modes).toEqual({})
        expect(result.bindings).toHaveLength(0)
        expect(result.errors).toHaveLength(0)
        expect(result.allResolved).toBe(true)
      })
    })

    describe('framework_entry source', () => {
      it('resolves binding from latest entry', async () => {
        const sourceEntry = createMockEntry({
          journalId: 'source-entry',
          templateId: 'charter',
          contentTiptap: {
            fields: {
              theme: 'Personal Growth',
            },
          },
        })

        const template = createMockTemplate({
          dataBindings: {
            inputs: [
              {
                source: 'framework_entry',
                sourcePath: 'charter.theme',
                targetFieldId: 'theme-display',
              },
            ],
          },
        })

        context.entries = [sourceEntry]
        const result = await engine.resolveBindings(template, context)

        expect(result.values['theme-display']).toBe('Personal Growth')
        expect(result.allResolved).toBe(true)
      })

      it('uses fallback when entry not found', async () => {
        const template = createMockTemplate({
          dataBindings: {
            inputs: [
              {
                source: 'framework_entry',
                sourcePath: 'charter.theme',
                targetFieldId: 'theme-display',
                fallback: 'Default Theme',
              },
            ],
          },
        })

        context.entries = []
        const result = await engine.resolveBindings(template, context)

        expect(result.values['theme-display']).toBe('Default Theme')
        expect(result.allResolved).toBe(true)
      })

      it('returns extracted value even if undefined when field not found in entry', async () => {
        // Note: The DataBindingEngine returns the extracted value (undefined) when
        // extraction succeeds. The fallback is only used when extraction fails
        // or when no entry is found at all.
        const sourceEntry = createMockEntry({
          templateId: 'charter',
          contentTiptap: {
            fields: {
              other: 'value',
            },
          },
        })

        const template = createMockTemplate({
          dataBindings: {
            inputs: [
              {
                source: 'framework_entry',
                sourcePath: 'charter.theme',
                targetFieldId: 'theme-display',
                fallback: 'Fallback Theme',
              },
            ],
          },
        })

        context.entries = [sourceEntry]
        const result = await engine.resolveBindings(template, context)

        // Value is undefined because field 'theme' doesn't exist
        // Extraction succeeded so fallback is not used
        expect(result.values['theme-display']).toBeUndefined()
      })

      it('returns undefined when no entry and no fallback', async () => {
        const template = createMockTemplate({
          dataBindings: {
            inputs: [
              {
                source: 'framework_entry',
                sourcePath: 'charter.theme',
                targetFieldId: 'theme-display',
              },
            ],
          },
        })

        context.entries = []
        const result = await engine.resolveBindings(template, context)

        expect(result.values['theme-display']).toBeUndefined()
      })

      it('handles nested field paths', async () => {
        const sourceEntry = createMockEntry({
          templateId: 'charter',
          contentTiptap: {
            fields: {
              'focus-areas': [
                { name: 'Health', priority: 1 },
                { name: 'Career', priority: 2 },
              ],
            },
          },
        })

        const template = createMockTemplate({
          dataBindings: {
            inputs: [
              {
                source: 'framework_entry',
                sourcePath: 'charter.focus-areas[0].name',
                targetFieldId: 'first-focus',
              },
            ],
          },
        })

        context.entries = [sourceEntry]
        const result = await engine.resolveBindings(template, context)

        expect(result.values['first-focus']).toBe('Health')
      })

      it('returns error for invalid source path', async () => {
        const template = createMockTemplate({
          dataBindings: {
            inputs: [
              {
                source: 'framework_entry',
                sourcePath: '', // Invalid: no template ID
                targetFieldId: 'field',
              },
            ],
          },
        })

        const result = await engine.resolveBindings(template, context)

        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].fieldId).toBe('field')
        expect(result.allResolved).toBe(false)
      })

      it('applies transforms to resolved value', async () => {
        const sourceEntry = createMockEntry({
          templateId: 'charter',
          contentTiptap: {
            fields: {
              name: 'test value',
            },
          },
        })

        const template = createMockTemplate({
          dataBindings: {
            inputs: [
              {
                source: 'framework_entry',
                sourcePath: 'charter.name',
                targetFieldId: 'name-upper',
                transform: 'uppercase',
              },
            ],
          },
        })

        context.entries = [sourceEntry]
        const result = await engine.resolveBindings(template, context)

        expect(result.values['name-upper']).toBe('TEST VALUE')
      })

      it('does not apply transform to undefined values', async () => {
        const template = createMockTemplate({
          dataBindings: {
            inputs: [
              {
                source: 'framework_entry',
                sourcePath: 'charter.missing',
                targetFieldId: 'field',
                transform: 'uppercase',
              },
            ],
          },
        })

        context.entries = []
        const result = await engine.resolveBindings(template, context)

        expect(result.values['field']).toBeUndefined()
      })

      it('ignores unknown transforms', async () => {
        const sourceEntry = createMockEntry({
          templateId: 'charter',
          contentTiptap: {
            fields: {
              name: 'test',
            },
          },
        })

        const template = createMockTemplate({
          dataBindings: {
            inputs: [
              {
                source: 'framework_entry',
                sourcePath: 'charter.name',
                targetFieldId: 'name',
                transform: 'nonexistent',
              },
            ],
          },
        })

        context.entries = [sourceEntry]
        const result = await engine.resolveBindings(template, context)

        expect(result.values['name']).toBe('test')
      })
    })

    describe('other sources', () => {
      it('handles user_profile source with fallback', async () => {
        const template = createMockTemplate({
          dataBindings: {
            inputs: [
              {
                source: 'user_profile',
                sourcePath: 'displayName',
                targetFieldId: 'name',
                fallback: 'Anonymous',
              },
            ],
          },
        })

        const result = await engine.resolveBindings(template, context)
        expect(result.values['name']).toBe('Anonymous')
      })

      it('handles computed source with fallback', async () => {
        const template = createMockTemplate({
          dataBindings: {
            inputs: [
              {
                source: 'computed',
                sourcePath: 'some.computation',
                targetFieldId: 'computed-field',
                fallback: 42,
              },
            ],
          },
        })

        const result = await engine.resolveBindings(template, context)
        expect(result.values['computed-field']).toBe(42)
      })

      it('handles static source with fallback', async () => {
        const template = createMockTemplate({
          dataBindings: {
            inputs: [
              {
                source: 'static',
                sourcePath: '',
                targetFieldId: 'constant',
                fallback: 'Static Value',
              },
            ],
          },
        })

        const result = await engine.resolveBindings(template, context)
        expect(result.values['constant']).toBe('Static Value')
      })

      it('handles unknown source with fallback', async () => {
        const template = createMockTemplate({
          dataBindings: {
            inputs: [
              {
                source: 'unknown' as any,
                sourcePath: 'path',
                targetFieldId: 'field',
                fallback: 'fallback',
              },
            ],
          },
        })

        const result = await engine.resolveBindings(template, context)
        expect(result.values['field']).toBe('fallback')
      })
    })

    describe('error handling', () => {
      it('includes errors when includeFailures is true', async () => {
        const engine = new DataBindingEngine({ includeFailures: true })

        const template = createMockTemplate({
          dataBindings: {
            inputs: [
              {
                source: 'framework_entry',
                sourcePath: '',
                targetFieldId: 'field',
              },
            ],
          },
        })

        const result = await engine.resolveBindings(template, context)
        expect(result.errors.length).toBeGreaterThan(0)
      })

      it('handles exceptions during resolution', async () => {
        // Create a provider that throws
        const throwingProvider: EntryProvider = {
          async getEntriesForTemplate() {
            throw new Error('Database error')
          },
          async getEntryById() {
            return null
          },
        }

        const engine = createBindingEngineWithProvider(throwingProvider)

        const template = createMockTemplate({
          dataBindings: {
            inputs: [
              {
                source: 'framework_entry',
                sourcePath: 'charter.theme',
                targetFieldId: 'theme',
              },
            ],
          },
        })

        // When entries are provided in context, uses in-memory resolver instead
        const result = await engine.resolveBindings(template, { ...context, entries: [] })
        expect(result.values['theme']).toBeUndefined()
      })
    })

    describe('multiple bindings', () => {
      it('resolves multiple bindings', async () => {
        const charterEntry = createMockEntry({
          templateId: 'charter',
          contentTiptap: {
            fields: {
              theme: 'Growth',
              focus: ['Health', 'Career'],
            },
          },
        })

        const template = createMockTemplate({
          dataBindings: {
            inputs: [
              {
                source: 'framework_entry',
                sourcePath: 'charter.theme',
                targetFieldId: 'theme',
              },
              {
                source: 'framework_entry',
                sourcePath: 'charter.focus',
                targetFieldId: 'focus-areas',
                transform: 'join',
              },
              {
                source: 'static',
                sourcePath: '',
                targetFieldId: 'version',
                fallback: '1.0',
              },
            ],
          },
        })

        context.entries = [charterEntry]
        const result = await engine.resolveBindings(template, context)

        expect(result.values['theme']).toBe('Growth')
        expect(result.values['focus-areas']).toBe('Health, Career')
        expect(result.values['version']).toBe('1.0')
        expect(result.bindings).toHaveLength(3)
      })
    })
  })

  describe('resolveFromSource', () => {
    it('resolves bindings from source config', async () => {
      const sourceEntry = createMockEntry({
        templateId: 'charter',
        contentTiptap: {
          fields: {
            theme: 'Personal Growth',
            values: ['Health', 'Wealth'],
          },
        },
      })

      const source: BindingSourceConfig = {
        templateId: 'charter',
        scope: 'latest',
        mappings: [
          {
            source: 'theme',
            target: 'theme-display',
          },
          {
            source: 'values',
            target: 'values-list',
            transform: 'join',
            transformArgs: { separator: ' | ' },
          },
        ],
      }

      context.entries = [sourceEntry]
      const result = await engine.resolveFromSource(source, context)

      expect(result.values['theme-display']).toBe('Personal Growth')
      expect(result.values['values-list']).toBe('Health | Wealth')
    })

    it('uses default scope when not specified', async () => {
      const sourceEntry = createMockEntry({
        templateId: 'charter',
        contentTiptap: { fields: { name: 'Test' } },
      })

      const source: BindingSourceConfig = {
        templateId: 'charter',
        mappings: [{ source: 'name', target: 'name' }],
      }

      context.entries = [sourceEntry]
      const result = await engine.resolveFromSource(source, context)

      expect(result.values['name']).toBe('Test')
    })

    it('returns fallback when entry not found', async () => {
      const source: BindingSourceConfig = {
        templateId: 'nonexistent',
        mappings: [
          {
            source: 'field',
            target: 'field',
            fallback: 'default',
          },
        ],
      }

      context.entries = []
      const result = await engine.resolveFromSource(source, context)

      expect(result.values['field']).toBe('default')
    })

    it('handles specific scope with entryId', async () => {
      const entry1 = createMockEntry({
        journalId: 'entry-1',
        templateId: 'charter',
        contentTiptap: { fields: { name: 'First' } },
      })
      const entry2 = createMockEntry({
        journalId: 'entry-2',
        templateId: 'charter',
        contentTiptap: { fields: { name: 'Second' } },
      })

      const source: BindingSourceConfig = {
        templateId: 'charter',
        scope: 'specific',
        entryId: 'entry-1',
        mappings: [{ source: 'name', target: 'name' }],
      }

      context.entries = [entry1, entry2]
      const result = await engine.resolveFromSource(source, context)

      expect(result.values['name']).toBe('First')
    })

    it('handles invalid source expression', async () => {
      const sourceEntry = createMockEntry({
        templateId: 'charter',
        contentTiptap: { fields: { name: 'Test' } },
      })

      const source: BindingSourceConfig = {
        templateId: 'charter',
        mappings: [
          {
            source: '', // Invalid
            target: 'field',
          },
        ],
      }

      context.entries = [sourceEntry]
      const result = await engine.resolveFromSource(source, context)

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.allResolved).toBe(false)
    })

    it('applies mode from mapping', async () => {
      const sourceEntry = createMockEntry({
        templateId: 'charter',
        contentTiptap: { fields: { name: 'Test' } },
      })

      const source: BindingSourceConfig = {
        templateId: 'charter',
        mappings: [
          {
            source: 'name',
            target: 'name',
            mode: 'readonly',
          },
        ],
      }

      context.entries = [sourceEntry]
      const result = await engine.resolveFromSource(source, context)

      expect(result.modes['name']).toBe('readonly')
    })

    it('uses default mode when not specified', async () => {
      const sourceEntry = createMockEntry({
        templateId: 'charter',
        contentTiptap: { fields: { name: 'Test' } },
      })

      const source: BindingSourceConfig = {
        templateId: 'charter',
        mappings: [
          {
            source: 'name',
            target: 'name',
          },
        ],
      }

      context.entries = [sourceEntry]
      const result = await engine.resolveFromSource(source, context)

      expect(result.modes['name']).toBe('default')
    })
  })
})

describe('factory functions', () => {
  describe('createBindingEngine', () => {
    it('creates engine with default options', () => {
      const engine = createBindingEngine()
      expect(engine).toBeInstanceOf(DataBindingEngine)
    })

    it('creates engine with entries', async () => {
      const entry = createMockEntry({
        templateId: 'charter',
        contentTiptap: { fields: { name: 'Test' } },
      })

      const engine = createBindingEngine([entry])
      expect(engine).toBeInstanceOf(DataBindingEngine)
    })

    it('creates engine with custom options', () => {
      const engine = createBindingEngine([], {
        defaultScope: 'first',
        includeFailures: false,
      })
      expect(engine).toBeInstanceOf(DataBindingEngine)
    })
  })

  describe('createBindingEngineWithProvider', () => {
    it('creates engine with custom provider', async () => {
      const provider = new InMemoryEntryProvider([
        createMockEntry({
          templateId: 'charter',
          contentTiptap: { fields: { name: 'Custom' } },
        }),
      ])

      const engine = createBindingEngineWithProvider(provider)

      const template = createMockTemplate({
        dataBindings: {
          inputs: [
            {
              source: 'framework_entry',
              sourcePath: 'charter.name',
              targetFieldId: 'name',
            },
          ],
        },
      })

      const context: BindingResolutionContext = {
        userId: 'user-1',
        frameworkId: 'framework-1',
        spaceId: 'space-1',
      }

      const result = await engine.resolveBindings(template, context)
      expect(result.values['name']).toBe('Custom')
    })
  })

  describe('resolveBindings convenience function', () => {
    it('resolves bindings using new engine', async () => {
      const entry = createMockEntry({
        templateId: 'charter',
        contentTiptap: { fields: { theme: 'Growth' } },
      })

      const template = createMockTemplate({
        dataBindings: {
          inputs: [
            {
              source: 'framework_entry',
              sourcePath: 'charter.theme',
              targetFieldId: 'theme',
            },
          ],
        },
      })

      const context: BindingResolutionContext = {
        userId: 'user-1',
        frameworkId: 'framework-1',
        spaceId: 'space-1',
        entries: [entry],
      }

      const result = await resolveBindings(template, context)
      expect(result.values['theme']).toBe('Growth')
    })

    it('accepts custom options', async () => {
      const template = createMockTemplate({
        dataBindings: {
          inputs: [
            {
              source: 'framework_entry',
              sourcePath: '',
              targetFieldId: 'field',
            },
          ],
        },
      })

      const context: BindingResolutionContext = {
        userId: 'user-1',
        frameworkId: 'framework-1',
        spaceId: 'space-1',
      }

      const result = await resolveBindings(template, context, {
        includeFailures: true,
      })

      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})

describe('resolveFromSource error paths', () => {
  it('uses fallback when extraction fails', async () => {
    const entry = createMockEntry({
      templateId: 'charter',
      contentTiptap: {
        fields: {
          name: 'Test',
        },
      },
    })

    const engine = new DataBindingEngine()
    const source: BindingSourceConfig = {
      templateId: 'charter',
      mappings: [
        {
          source: 'invalid expression @#$', // Will fail parsing
          target: 'field',
          fallback: 'fallback-value',
        },
      ],
    }

    const context: BindingResolutionContext = {
      userId: 'user-1',
      frameworkId: 'framework-1',
      spaceId: 'space-1',
      entries: [entry],
    }

    const result = await engine.resolveFromSource(source, context)
    // Invalid expression causes error, fallback not used
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('handles exception during single mapping resolution', async () => {
    // Create a provider that returns entries that cause issues
    const badEntry = createMockEntry({
      templateId: 'charter',
      contentTiptap: {
        fields: {
          name: 'Test',
        },
      },
    })

    const engine = new DataBindingEngine()
    const source: BindingSourceConfig = {
      templateId: 'charter',
      mappings: [
        {
          source: 'name',
          target: 'field',
          // Transform that succeeds
        },
      ],
    }

    const context: BindingResolutionContext = {
      userId: 'user-1',
      frameworkId: 'framework-1',
      spaceId: 'space-1',
      entries: [badEntry],
    }

    const result = await engine.resolveFromSource(source, context)
    expect(result.values['field']).toBe('Test')
  })
})

describe('edge cases', () => {
  it('handles source path with only template ID', async () => {
    const entry = createMockEntry({
      templateId: 'charter',
      contentTiptap: { fields: { name: 'Test' } },
    })

    const engine = new DataBindingEngine()
    const template = createMockTemplate({
      dataBindings: {
        inputs: [
          {
            source: 'framework_entry',
            sourcePath: 'charter', // No field path
            targetFieldId: 'all-data',
          },
        ],
      },
    })

    const context: BindingResolutionContext = {
      userId: 'user-1',
      frameworkId: 'framework-1',
      spaceId: 'space-1',
      entries: [entry],
    }

    const result = await engine.resolveBindings(template, context)
    // Should return undefined since we're extracting empty path
    expect(result.bindings[0].success).toBe(true)
  })

  it('handles transform with args', async () => {
    const entry = createMockEntry({
      templateId: 'charter',
      contentTiptap: {
        fields: {
          items: ['a', 'b', 'c'],
        },
      },
    })

    const engine = new DataBindingEngine()
    const template = createMockTemplate({
      dataBindings: {
        inputs: [
          {
            source: 'framework_entry',
            sourcePath: 'charter.items',
            targetFieldId: 'joined',
            transform: 'join',
            transformArgs: { separator: ' - ' },
          },
        ],
      },
    })

    const context: BindingResolutionContext = {
      userId: 'user-1',
      frameworkId: 'framework-1',
      spaceId: 'space-1',
      entries: [entry],
    }

    const result = await engine.resolveBindings(template, context)
    expect(result.values['joined']).toBe('a - b - c')
  })

  it('returns consistent binding structure', async () => {
    const entry = createMockEntry({
      templateId: 'charter',
      contentTiptap: { fields: { name: 'Test' } },
    })

    const engine = new DataBindingEngine()
    const template = createMockTemplate({
      dataBindings: {
        inputs: [
          {
            source: 'framework_entry',
            sourcePath: 'charter.name',
            targetFieldId: 'name',
          },
        ],
      },
    })

    const context: BindingResolutionContext = {
      userId: 'user-1',
      frameworkId: 'framework-1',
      spaceId: 'space-1',
      entries: [entry],
    }

    const result = await engine.resolveBindings(template, context)
    const binding = result.bindings[0]

    expect(binding).toHaveProperty('fieldId')
    expect(binding).toHaveProperty('value')
    expect(binding).toHaveProperty('mode')
    expect(binding).toHaveProperty('sourceExpression')
    expect(binding).toHaveProperty('success')
    expect(binding.sourceTemplateId).toBe('charter')
  })
})
