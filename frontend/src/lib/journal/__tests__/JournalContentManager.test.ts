import { JournalContentManager } from '../JournalContentManager';

describe('JournalContentManager', () => {
  const sampleContent = `<!--
@template: daily-journal
@version: 1.0
@created: 2024-01-15T10:30:00Z
@metadata: {"mood":"optimistic","weather":"sunny"}
-->

<!-- section:gratitude @title:"Three Things I'm Grateful For" @type:list -->
- Morning coffee
- Team meeting went well
- Good weather for a walk
<!-- /section:gratitude -->

<!-- section:reflection @title:"Today's Reflection" @type:prose -->
Today was productive. Fixed the bug that was bothering me.
The solution was simpler than expected.
<!-- /section:reflection -->`;

  describe('parse', () => {
    it('should extract template metadata', () => {
      const parsed = JournalContentManager.parse(sampleContent);

      expect(parsed.template).toBe('daily-journal');
      expect(parsed.templateVersion).toBe('1.0');
      expect(parsed.created).toBe('2024-01-15T10:30:00Z');
      expect(parsed.metadata).toEqual({
        mood: 'optimistic',
        weather: 'sunny'
      });
    });

    it('should extract sections with content', () => {
      const parsed = JournalContentManager.parse(sampleContent);

      expect(parsed.sections.gratitude).toBeDefined();
      expect(parsed.sections.gratitude.content).toContain('Morning coffee');
      expect(parsed.sections.gratitude.title).toBe("Three Things I'm Grateful For");
      expect(parsed.sections.gratitude.type).toBe('list');

      expect(parsed.sections.reflection).toBeDefined();
      expect(parsed.sections.reflection.content).toContain('productive');
    });

    it('should handle content without sections', () => {
      const simple = `Just plain markdown content`;
      const parsed = JournalContentManager.parse(simple);

      expect(parsed.template).toBeNull();
      expect(Object.keys(parsed.sections)).toHaveLength(0);
      expect(parsed.rawContent).toBe(simple);
    });

    it('should handle empty content', () => {
      const parsed = JournalContentManager.parse('');

      expect(parsed.template).toBeNull();
      expect(parsed.sections).toEqual({});
      expect(parsed.metadata).toEqual({});
    });

    it('should handle malformed metadata JSON gracefully', () => {
      const malformed = `<!--
@template: test
@metadata: {invalid json}
-->`;
      const parsed = JournalContentManager.parse(malformed);

      expect(parsed.template).toBe('test');
      expect(parsed.metadata).toEqual({});
    });

    it('should handle unclosed sections', () => {
      const unclosed = `<!-- section:test @title:"Test" @type:prose -->
This is content without a closing tag`;

      const parsed = JournalContentManager.parse(unclosed);

      expect(parsed.sections.test).toBeDefined();
      expect(parsed.sections.test.content).toBe('This is content without a closing tag');
    });

    it('should preserve whitespace in section content', () => {
      const withWhitespace = `<!-- section:code @title:"Code" @type:prose -->
    function test() {
      return true;
    }
<!-- /section:code -->`;

      const parsed = JournalContentManager.parse(withWhitespace);

      expect(parsed.sections.code.content).toContain('    function test()');
      expect(parsed.sections.code.content).toContain('      return true;');
    });
  });

  describe('serialize', () => {
    it('should create properly formatted content', () => {
      const data = {
        template: 'daily-journal',
        templateVersion: '1.0',
        metadata: { mood: 'happy' },
        sections: {
          gratitude: {
            content: '- Item 1\n- Item 2',
            title: 'Gratitude',
            type: 'list'
          }
        }
      };

      const serialized = JournalContentManager.serialize(data);

      expect(serialized).toContain('@template: daily-journal');
      expect(serialized).toContain('@version: 1.0');
      expect(serialized).toContain('@metadata: {"mood":"happy"}');
      expect(serialized).toContain('<!-- section:gratitude');
      expect(serialized).toContain('@title:"Gratitude"');
      expect(serialized).toContain('@type:list');
      expect(serialized).toContain('- Item 1');
      expect(serialized).toContain('- Item 2');
      expect(serialized).toContain('<!-- /section:gratitude -->');
    });

    it('should create valid content that can be re-parsed', () => {
      const data = {
        template: 'test-template',
        templateVersion: '2.0',
        metadata: { foo: 'bar', nested: { value: 123 } },
        sections: {
          section1: {
            content: 'Content 1',
            title: 'Section One',
            type: 'prose'
          },
          section2: {
            content: 'Content 2',
            title: 'Section Two',
            type: 'list'
          }
        }
      };

      const serialized = JournalContentManager.serialize(data);
      const parsed = JournalContentManager.parse(serialized);

      expect(parsed.template).toBe('test-template');
      expect(parsed.templateVersion).toBe('2.0');
      expect(parsed.metadata).toEqual({ foo: 'bar', nested: { value: 123 } });
      expect(parsed.sections.section1.content).toBe('Content 1');
      expect(parsed.sections.section2.content).toBe('Content 2');
    });

    it('should handle empty sections', () => {
      const data = {
        template: 'test',
        templateVersion: '1.0',
        metadata: {},
        sections: {}
      };

      const serialized = JournalContentManager.serialize(data);

      expect(serialized).toContain('@template: test');
      expect(serialized).not.toContain('section:');
    });
  });

  describe('extractCleanMarkdown', () => {
    it('should remove all metadata and return clean markdown', () => {
      const clean = JournalContentManager.extractCleanMarkdown(sampleContent);

      expect(clean).not.toContain('<!--');
      expect(clean).not.toContain('@template');
      expect(clean).not.toContain('section:');
      expect(clean).toContain('Morning coffee');
      expect(clean).toContain('productive');
    });

    it('should preserve markdown formatting', () => {
      const formatted = `<!--
@template: test
-->

<!-- section:main @title:"Main" @type:prose -->
# Heading

**Bold text** and *italic text*

- List item 1
- List item 2
<!-- /section:main -->`;

      const clean = JournalContentManager.extractCleanMarkdown(formatted);

      expect(clean).toContain('# Heading');
      expect(clean).toContain('**Bold text**');
      expect(clean).toContain('- List item 1');
    });

    it('should handle content without metadata', () => {
      const plain = `Just some plain text\n\nWith multiple paragraphs`;
      const clean = JournalContentManager.extractCleanMarkdown(plain);

      expect(clean).toBe(plain);
    });

    it('should reduce excessive newlines', () => {
      const excessive = `Content 1\n\n\n\n\nContent 2`;
      const clean = JournalContentManager.extractCleanMarkdown(excessive);

      expect(clean).toBe('Content 1\n\nContent 2');
    });
  });

  describe('extractDisplaySections', () => {
    it('should return sections ready for display', () => {
      const sections = JournalContentManager.extractDisplaySections(sampleContent);

      expect(sections).toHaveLength(2);
      expect(sections[0].id).toBe('gratitude');
      expect(sections[0].title).toBe("Three Things I'm Grateful For");
      expect(sections[0].type).toBe('list');
      expect(sections[0].content).toContain('Morning coffee');

      expect(sections[1].id).toBe('reflection');
      expect(sections[1].title).toBe("Today's Reflection");
      expect(sections[1].type).toBe('prose');
    });

    it('should return empty array for content without sections', () => {
      const sections = JournalContentManager.extractDisplaySections('Plain content');

      expect(sections).toEqual([]);
    });

    it('should use section id as title fallback', () => {
      const noTitle = `<!-- section:test @type:prose -->
Content
<!-- /section:test -->`;

      const sections = JournalContentManager.extractDisplaySections(noTitle);

      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('test');
    });

    it('should use prose as type fallback', () => {
      const noType = `<!-- section:test @title:"Test" -->
Content
<!-- /section:test -->`;

      const sections = JournalContentManager.extractDisplaySections(noType);

      expect(sections).toHaveLength(1);
      expect(sections[0].type).toBe('prose');
    });
  });

  describe('parseAttributes', () => {
    it('should parse quoted attributes', () => {
      const content = `<!-- section:test @title:"My Title" @type:prose -->
Content
<!-- /section:test -->`;

      const parsed = JournalContentManager.parse(content);

      expect(parsed.sections.test.title).toBe('My Title');
      expect(parsed.sections.test.type).toBe('prose');
    });

    it('should parse unquoted attributes', () => {
      const content = `<!-- section:test @type:list @required:true -->
Content
<!-- /section:test -->`;

      const parsed = JournalContentManager.parse(content);

      expect(parsed.sections.test.type).toBe('list');
      expect(parsed.sections.test.required).toBe('true');
    });

    it('should handle mixed quoted and unquoted attributes', () => {
      const content = `<!-- section:test @title:"My Title" @type:prose @limit:100 -->
Content
<!-- /section:test -->`;

      const parsed = JournalContentManager.parse(content);

      expect(parsed.sections.test.title).toBe('My Title');
      expect(parsed.sections.test.type).toBe('prose');
      expect(parsed.sections.test.limit).toBe('100');
    });
  });
});
