/**
 * Tests for EntryDataResolver
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  EntryDataResolver,
  InMemoryEntryProvider,
  createInMemoryResolver,
  createResolver,
  type EntryProvider,
  type EntryResolutionContext,
} from '../EntryDataResolver'
import type { JournalEntry } from '../../../types/journal.types'

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

describe('InMemoryEntryProvider', () => {
  let provider: InMemoryEntryProvider

  beforeEach(() => {
    provider = new InMemoryEntryProvider()
  })

  describe('constructor', () => {
    it('creates empty provider', () => {
      const emptyProvider = new InMemoryEntryProvider()
      expect(emptyProvider).toBeInstanceOf(InMemoryEntryProvider)
    })

    it('creates provider with initial entries', () => {
      const entry = createMockEntry()
      const providerWithEntries = new InMemoryEntryProvider([entry])
      expect(providerWithEntries).toBeInstanceOf(InMemoryEntryProvider)
    })
  })

  describe('setEntries', () => {
    it('replaces all entries', async () => {
      const entry1 = createMockEntry({ journalId: 'entry-1' })
      const entry2 = createMockEntry({ journalId: 'entry-2' })

      provider.setEntries([entry1])
      provider.setEntries([entry2])

      const context: EntryResolutionContext = {
        userId: 'user-1',
        frameworkId: 'framework-1',
        spaceId: 'space-1',
      }

      const entries = await provider.getEntriesForTemplate(context, 'template-1')
      expect(entries).toHaveLength(1)
      expect(entries[0].journalId).toBe('entry-2')
    })
  })

  describe('addEntry', () => {
    it('adds entry to existing list', async () => {
      const entry1 = createMockEntry({ journalId: 'entry-1' })
      const entry2 = createMockEntry({ journalId: 'entry-2' })

      provider.addEntry(entry1)
      provider.addEntry(entry2)

      const context: EntryResolutionContext = {
        userId: 'user-1',
        frameworkId: 'framework-1',
        spaceId: 'space-1',
      }

      const entries = await provider.getEntriesForTemplate(context, 'template-1')
      expect(entries).toHaveLength(2)
    })
  })

  describe('getEntriesForTemplate', () => {
    it('filters by userId, spaceId, frameworkId, and templateId', async () => {
      provider.setEntries([
        createMockEntry({ journalId: 'e1', userId: 'user-1', templateId: 'template-1' }),
        createMockEntry({ journalId: 'e2', userId: 'user-2', templateId: 'template-1' }),
        createMockEntry({ journalId: 'e3', userId: 'user-1', templateId: 'template-2' }),
        createMockEntry({ journalId: 'e4', userId: 'user-1', templateId: 'template-1', spaceId: 'space-2' }),
        createMockEntry({ journalId: 'e5', userId: 'user-1', templateId: 'template-1', frameworkId: 'framework-2' }),
      ])

      const context: EntryResolutionContext = {
        userId: 'user-1',
        frameworkId: 'framework-1',
        spaceId: 'space-1',
      }

      const entries = await provider.getEntriesForTemplate(context, 'template-1')
      expect(entries).toHaveLength(1)
      expect(entries[0].journalId).toBe('e1')
    })

    it('returns empty array when no matches', async () => {
      provider.setEntries([
        createMockEntry({ templateId: 'other-template' }),
      ])

      const context: EntryResolutionContext = {
        userId: 'user-1',
        frameworkId: 'framework-1',
        spaceId: 'space-1',
      }

      const entries = await provider.getEntriesForTemplate(context, 'template-1')
      expect(entries).toHaveLength(0)
    })
  })

  describe('getEntryById', () => {
    it('returns entry when found', async () => {
      const entry = createMockEntry({ journalId: 'target-entry' })
      provider.setEntries([entry])

      const result = await provider.getEntryById('target-entry')
      expect(result).not.toBeNull()
      expect(result?.journalId).toBe('target-entry')
    })

    it('returns null when not found', async () => {
      provider.setEntries([createMockEntry({ journalId: 'other-entry' })])

      const result = await provider.getEntryById('non-existent')
      expect(result).toBeNull()
    })
  })
})

describe('EntryDataResolver', () => {
  let resolver: EntryDataResolver
  let provider: InMemoryEntryProvider

  const context: EntryResolutionContext = {
    userId: 'user-1',
    frameworkId: 'framework-1',
    spaceId: 'space-1',
  }

  beforeEach(() => {
    provider = new InMemoryEntryProvider()
    resolver = new EntryDataResolver(provider)
  })

  describe('getLatestEntry', () => {
    it('returns null when no entries exist', async () => {
      const result = await resolver.getLatestEntry(context, 'template-1')
      expect(result).toBeNull()
    })

    it('returns the most recent entry by createdAt', async () => {
      provider.setEntries([
        createMockEntry({ journalId: 'old', createdAt: '2024-01-01T00:00:00Z' }),
        createMockEntry({ journalId: 'newest', createdAt: '2024-03-01T00:00:00Z' }),
        createMockEntry({ journalId: 'middle', createdAt: '2024-02-01T00:00:00Z' }),
      ])

      const result = await resolver.getLatestEntry(context, 'template-1')
      expect(result?.journalId).toBe('newest')
    })
  })

  describe('getFirstEntry', () => {
    it('returns null when no entries exist', async () => {
      const result = await resolver.getFirstEntry(context, 'template-1')
      expect(result).toBeNull()
    })

    it('returns the oldest entry by createdAt', async () => {
      provider.setEntries([
        createMockEntry({ journalId: 'middle', createdAt: '2024-02-01T00:00:00Z' }),
        createMockEntry({ journalId: 'oldest', createdAt: '2024-01-01T00:00:00Z' }),
        createMockEntry({ journalId: 'newest', createdAt: '2024-03-01T00:00:00Z' }),
      ])

      const result = await resolver.getFirstEntry(context, 'template-1')
      expect(result?.journalId).toBe('oldest')
    })
  })

  describe('getEntryById', () => {
    it('returns entry when found', async () => {
      provider.setEntries([createMockEntry({ journalId: 'target' })])

      const result = await resolver.getEntryById('target')
      expect(result?.journalId).toBe('target')
    })

    it('returns null when not found', async () => {
      const result = await resolver.getEntryById('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('getEntry', () => {
    beforeEach(() => {
      provider.setEntries([
        createMockEntry({ journalId: 'oldest', createdAt: '2024-01-01T00:00:00Z' }),
        createMockEntry({ journalId: 'newest', createdAt: '2024-03-01T00:00:00Z' }),
      ])
    })

    it('returns latest entry for "latest" scope', async () => {
      const result = await resolver.getEntry(context, 'template-1', 'latest')
      expect(result?.journalId).toBe('newest')
    })

    it('returns first entry for "first" scope', async () => {
      const result = await resolver.getEntry(context, 'template-1', 'first')
      expect(result?.journalId).toBe('oldest')
    })

    it('returns specific entry for "specific" scope', async () => {
      const result = await resolver.getEntry(context, 'template-1', 'specific', 'oldest')
      expect(result?.journalId).toBe('oldest')
    })

    it('returns null for "specific" scope without entryId', async () => {
      const result = await resolver.getEntry(context, 'template-1', 'specific')
      expect(result).toBeNull()
    })

    it('returns null for unknown scope', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await resolver.getEntry(context, 'template-1', 'unknown' as any)
      expect(result).toBeNull()
    })
  })

  describe('getEntryFieldData', () => {
    it('extracts fields from contentTiptap.fields', () => {
      const entry = createMockEntry({
        contentTiptap: {
          fields: {
            name: 'John',
            age: 30,
          },
        },
      })

      const data = resolver.getEntryFieldData(entry)
      expect(data).toEqual({ name: 'John', age: 30 })
    })

    it('extracts fields from contentTiptap.data', () => {
      const entry = createMockEntry({
        contentTiptap: {
          data: {
            title: 'Test',
            items: [1, 2, 3],
          },
        },
      })

      const data = resolver.getEntryFieldData(entry)
      expect(data).toEqual({ title: 'Test', items: [1, 2, 3] })
    })

    it('returns contentTiptap directly if it looks like field data', () => {
      const entry = createMockEntry({
        contentTiptap: {
          name: 'Direct',
          value: 42,
        },
      })

      const data = resolver.getEntryFieldData(entry)
      expect(data).toEqual({ name: 'Direct', value: 42 })
    })

    it('ignores contentTiptap with type/content (Tiptap structure)', () => {
      const entry = createMockEntry({
        contentTiptap: {
          type: 'doc',
          content: [],
        },
      })

      const data = resolver.getEntryFieldData(entry)
      expect(data).toEqual({})
    })

    it('parses JSON from content field', () => {
      const entry = createMockEntry({
        contentTiptap: null,
        content: JSON.stringify({ parsed: true, value: 123 }),
      })

      const data = resolver.getEntryFieldData(entry)
      expect(data).toEqual({ parsed: true, value: 123 })
    })

    it('returns empty object for non-JSON content', () => {
      const entry = createMockEntry({
        contentTiptap: null,
        content: 'Just plain text',
      })

      const data = resolver.getEntryFieldData(entry)
      expect(data).toEqual({})
    })

    it('returns empty object for invalid JSON content', () => {
      const entry = createMockEntry({
        contentTiptap: null,
        content: '{ invalid json }',
      })

      const data = resolver.getEntryFieldData(entry)
      expect(data).toEqual({})
    })

    it('returns empty object for null contentTiptap and empty content', () => {
      const entry = createMockEntry({
        contentTiptap: null,
        content: '',
      })

      const data = resolver.getEntryFieldData(entry)
      expect(data).toEqual({})
    })
  })

  describe('extractFieldValue', () => {
    describe('simple property access', () => {
      it('extracts top-level property', () => {
        const entry = createMockEntry({
          contentTiptap: { fields: { name: 'Alice' } },
        })

        const result = resolver.extractFieldValue(entry, 'name')
        expect(result.success).toBe(true)
        expect(result.value).toBe('Alice')
      })

      it('extracts nested property', () => {
        const entry = createMockEntry({
          contentTiptap: {
            fields: {
              user: {
                profile: {
                  email: 'alice@example.com',
                },
              },
            },
          },
        })

        const result = resolver.extractFieldValue(entry, 'user.profile.email')
        expect(result.success).toBe(true)
        expect(result.value).toBe('alice@example.com')
      })

      it('returns undefined for missing property', () => {
        const entry = createMockEntry({
          contentTiptap: { fields: { name: 'Alice' } },
        })

        const result = resolver.extractFieldValue(entry, 'age')
        expect(result.success).toBe(true)
        expect(result.value).toBeUndefined()
      })
    })

    describe('array index access', () => {
      it('extracts array element by index', () => {
        const entry = createMockEntry({
          contentTiptap: {
            fields: {
              items: ['first', 'second', 'third'],
            },
          },
        })

        const result = resolver.extractFieldValue(entry, 'items[1]')
        expect(result.success).toBe(true)
        expect(result.value).toBe('second')
      })

      it('extracts property from array element', () => {
        const entry = createMockEntry({
          contentTiptap: {
            fields: {
              users: [{ name: 'Alice' }, { name: 'Bob' }],
            },
          },
        })

        const result = resolver.extractFieldValue(entry, 'users[0].name')
        expect(result.success).toBe(true)
        expect(result.value).toBe('Alice')
      })

      it('returns undefined for out-of-bounds index', () => {
        const entry = createMockEntry({
          contentTiptap: {
            fields: {
              items: ['one', 'two'],
            },
          },
        })

        const result = resolver.extractFieldValue(entry, 'items[10]')
        expect(result.success).toBe(true)
        expect(result.value).toBeUndefined()
      })

      it('returns undefined for negative index', () => {
        const entry = createMockEntry({
          contentTiptap: {
            fields: {
              items: ['one', 'two'],
            },
          },
        })

        // Parser rejects negative indices, so this should fail parsing
        const result = resolver.extractFieldValue(entry, 'items[-1]')
        expect(result.success).toBe(false)
      })
    })

    describe('wildcard access', () => {
      it('collects all values from array', () => {
        const entry = createMockEntry({
          contentTiptap: {
            fields: {
              items: ['a', 'b', 'c'],
            },
          },
        })

        const result = resolver.extractFieldValue(entry, 'items[*]')
        expect(result.success).toBe(true)
        expect(result.value).toEqual(['a', 'b', 'c'])
      })

      it('collects property from all array elements', () => {
        const entry = createMockEntry({
          contentTiptap: {
            fields: {
              users: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }],
            },
          },
        })

        const result = resolver.extractFieldValue(entry, 'users[*].name')
        expect(result.success).toBe(true)
        expect(result.value).toEqual(['Alice', 'Bob', 'Charlie'])
      })

      it('filters out undefined values from wildcard', () => {
        const entry = createMockEntry({
          contentTiptap: {
            fields: {
              users: [{ name: 'Alice' }, { age: 30 }, { name: 'Charlie' }],
            },
          },
        })

        const result = resolver.extractFieldValue(entry, 'users[*].name')
        expect(result.success).toBe(true)
        expect(result.value).toEqual(['Alice', 'Charlie'])
      })

      it('returns undefined for wildcard on non-array', () => {
        const entry = createMockEntry({
          contentTiptap: {
            fields: {
              user: { name: 'Alice' },
            },
          },
        })

        const result = resolver.extractFieldValue(entry, 'user[*]')
        expect(result.success).toBe(true)
        expect(result.value).toBeUndefined()
      })
    })

    describe('complex paths', () => {
      it('handles focus-areas[0].name pattern', () => {
        const entry = createMockEntry({
          contentTiptap: {
            fields: {
              'focus-areas': [
                { name: 'Health', priority: 1 },
                { name: 'Career', priority: 2 },
              ],
            },
          },
        })

        const result = resolver.extractFieldValue(entry, 'focus-areas[0].name')
        expect(result.success).toBe(true)
        expect(result.value).toBe('Health')
      })

      it('handles focus-areas[*].name pattern', () => {
        const entry = createMockEntry({
          contentTiptap: {
            fields: {
              'focus-areas': [
                { name: 'Health', priority: 1 },
                { name: 'Career', priority: 2 },
              ],
            },
          },
        })

        const result = resolver.extractFieldValue(entry, 'focus-areas[*].name')
        expect(result.success).toBe(true)
        expect(result.value).toEqual(['Health', 'Career'])
      })

      it('handles nested arrays with wildcards', () => {
        const entry = createMockEntry({
          contentTiptap: {
            fields: {
              categories: [
                { items: [{ id: 1 }, { id: 2 }] },
                { items: [{ id: 3 }, { id: 4 }] },
              ],
            },
          },
        })

        const result = resolver.extractFieldValue(entry, 'categories[*].items[0].id')
        expect(result.success).toBe(true)
        expect(result.value).toEqual([1, 3])
      })
    })

    describe('error handling', () => {
      it('returns error for invalid expression', () => {
        const entry = createMockEntry({
          contentTiptap: { fields: { name: 'Alice' } },
        })

        const result = resolver.extractFieldValue(entry, '')
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('returns entire field data for empty path after parsing with allowEmpty', () => {
        const entry = createMockEntry({
          contentTiptap: {
            fields: {
              name: 'Alice',
              age: 30,
            },
          },
        })

        // Parse with allowEmpty to get empty segments array
        const parsed = {
          original: '',
          segments: [],
          hasWildcard: false,
          isValid: true,
        }

        const result = resolver.extractFieldValue(entry, parsed)
        expect(result.success).toBe(true)
        // With empty segments, returns entire field data
        expect(result.value).toEqual({ name: 'Alice', age: 30 })
      })

      it('accepts pre-parsed expression', () => {
        const entry = createMockEntry({
          contentTiptap: { fields: { name: 'Alice' } },
        })

        const parsed = {
          original: 'name',
          segments: [{ type: 'property' as const, name: 'name' }],
          hasWildcard: false,
          isValid: true,
        }

        const result = resolver.extractFieldValue(entry, parsed)
        expect(result.success).toBe(true)
        expect(result.value).toBe('Alice')
      })

      it('handles invalid pre-parsed expression', () => {
        const entry = createMockEntry({
          contentTiptap: { fields: { name: 'Alice' } },
        })

        const parsed = {
          original: 'invalid',
          segments: [],
          hasWildcard: false,
          isValid: false,
          error: 'Test error',
        }

        const result = resolver.extractFieldValue(entry, parsed)
        expect(result.success).toBe(false)
        expect(result.error).toBe('Test error')
      })

      it('returns undefined for property access on null', () => {
        const entry = createMockEntry({
          contentTiptap: { fields: { value: null } },
        })

        const result = resolver.extractFieldValue(entry, 'value.nested')
        expect(result.success).toBe(true)
        expect(result.value).toBeUndefined()
      })

      it('returns undefined for property access on primitive', () => {
        const entry = createMockEntry({
          contentTiptap: { fields: { value: 42 } },
        })

        const result = resolver.extractFieldValue(entry, 'value.nested')
        expect(result.success).toBe(true)
        expect(result.value).toBeUndefined()
      })

      it('returns undefined for index access on non-array', () => {
        const entry = createMockEntry({
          contentTiptap: { fields: { value: 'string' } },
        })

        const result = resolver.extractFieldValue(entry, 'value[0]')
        expect(result.success).toBe(true)
        expect(result.value).toBeUndefined()
      })
    })
  })

  describe('hasPath', () => {
    it('returns true when path exists', () => {
      const entry = createMockEntry({
        contentTiptap: { fields: { name: 'Alice' } },
      })

      expect(resolver.hasPath(entry, 'name')).toBe(true)
    })

    it('returns false when path does not exist', () => {
      const entry = createMockEntry({
        contentTiptap: { fields: { name: 'Alice' } },
      })

      expect(resolver.hasPath(entry, 'age')).toBe(false)
    })

    it('returns false for invalid expression', () => {
      const entry = createMockEntry({
        contentTiptap: { fields: { name: 'Alice' } },
      })

      expect(resolver.hasPath(entry, '')).toBe(false)
    })
  })

  describe('getAvailablePaths', () => {
    it('collects all paths in simple object', () => {
      const entry = createMockEntry({
        contentTiptap: {
          fields: {
            name: 'Alice',
            age: 30,
          },
        },
      })

      const paths = resolver.getAvailablePaths(entry)
      expect(paths).toContain('name')
      expect(paths).toContain('age')
    })

    it('collects nested paths', () => {
      const entry = createMockEntry({
        contentTiptap: {
          fields: {
            user: {
              profile: {
                email: 'test@example.com',
              },
            },
          },
        },
      })

      const paths = resolver.getAvailablePaths(entry)
      expect(paths).toContain('user')
      expect(paths).toContain('user.profile')
      expect(paths).toContain('user.profile.email')
    })

    it('includes wildcard paths for arrays', () => {
      const entry = createMockEntry({
        contentTiptap: {
          fields: {
            items: ['a', 'b', 'c'],
          },
        },
      })

      const paths = resolver.getAvailablePaths(entry)
      expect(paths).toContain('items')
      expect(paths).toContain('items[*]')
      // Note: getAvailablePaths returns wildcard [*] for arrays, not indexed [0]
    })

    it('limits depth to maxDepth', () => {
      const entry = createMockEntry({
        contentTiptap: {
          fields: {
            a: { b: { c: { d: { e: { f: 'deep' } } } } },
          },
        },
      })

      const paths = resolver.getAvailablePaths(entry, 2)
      expect(paths).toContain('a')
      expect(paths).toContain('a.b')
      expect(paths).not.toContain('a.b.c')
    })

    it('handles empty field data', () => {
      const entry = createMockEntry({
        contentTiptap: null,
        content: '',
      })

      const paths = resolver.getAvailablePaths(entry)
      expect(paths).toHaveLength(0)
    })

    it('handles null values in data', () => {
      const entry = createMockEntry({
        contentTiptap: {
          fields: {
            name: 'Alice',
            empty: null,
          },
        },
      })

      const paths = resolver.getAvailablePaths(entry)
      expect(paths).toContain('name')
      expect(paths).toContain('empty')
    })
  })
})

describe('factory functions', () => {
  describe('createInMemoryResolver', () => {
    it('creates resolver with no entries', () => {
      const resolver = createInMemoryResolver()
      expect(resolver).toBeInstanceOf(EntryDataResolver)
    })

    it('creates resolver with initial entries', async () => {
      const entry = createMockEntry()
      const resolver = createInMemoryResolver([entry])

      const context: EntryResolutionContext = {
        userId: 'user-1',
        frameworkId: 'framework-1',
        spaceId: 'space-1',
      }

      const result = await resolver.getLatestEntry(context, 'template-1')
      expect(result).not.toBeNull()
    })
  })

  describe('createResolver', () => {
    it('creates resolver with custom provider', async () => {
      const customProvider: EntryProvider = {
        async getEntriesForTemplate() {
          return [createMockEntry({ title: 'Custom' })]
        },
        async getEntryById() {
          return null
        },
      }

      const resolver = createResolver(customProvider)
      const context: EntryResolutionContext = {
        userId: 'user-1',
        frameworkId: 'framework-1',
        spaceId: 'space-1',
      }

      const result = await resolver.getLatestEntry(context, 'template-1')
      expect(result?.title).toBe('Custom')
    })
  })
})
