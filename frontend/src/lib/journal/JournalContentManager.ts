import { ParsedJournal, SectionContent, DisplaySection } from './types';

export class JournalContentManager {
  private static readonly METADATA_REGEX = /^<!--\s*@(\w+):\s*(.+?)\s*-->/;
  private static readonly SECTION_START_REGEX = /^<!--\s*section:(\w+)(.*?)-->/;
  private static readonly SECTION_END_REGEX = /^<!--\s*\/section:(\w+)\s*-->/;

  static parse(content: string): ParsedJournal {
    const lines = content.split('\n');
    const parsed: ParsedJournal = {
      template: null,
      templateVersion: null,
      created: null,
      metadata: {},
      sections: {},
      rawContent: content
    };

    let inMetadataBlock = false;
    let currentSection: string | null = null;
    let sectionContent: string[] = [];
    let sectionAttributes: Record<string, any> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Handle metadata block
      if (line === '<!--') {
        inMetadataBlock = true;
        continue;
      }

      if (line === '-->' && inMetadataBlock) {
        inMetadataBlock = false;
        continue;
      }

      if (inMetadataBlock) {
        const metaMatch = line.match(/@(\w+):\s*(.+)/);
        if (metaMatch) {
          const [, key, value] = metaMatch;
          if (key === 'metadata') {
            try {
              parsed.metadata = JSON.parse(value);
            } catch (e) {
              console.error('Failed to parse metadata JSON:', e);
            }
          } else if (key === 'template') {
            parsed.template = value;
          } else if (key === 'version') {
            parsed.templateVersion = value;
          } else if (key === 'created') {
            parsed.created = value;
          }
        }
        continue;
      }

      // Handle section start
      const sectionStartMatch = line.match(this.SECTION_START_REGEX);
      if (sectionStartMatch) {
        // Save previous section if exists
        if (currentSection) {
          parsed.sections[currentSection] = {
            content: sectionContent.join('\n'),
            ...sectionAttributes
          };
        }

        currentSection = sectionStartMatch[1];
        sectionAttributes = this.parseAttributes(sectionStartMatch[2]);
        sectionContent = [];
        continue;
      }

      // Handle section end
      const sectionEndMatch = line.match(this.SECTION_END_REGEX);
      if (sectionEndMatch && sectionEndMatch[1] === currentSection) {
        parsed.sections[currentSection] = {
          content: sectionContent.join('\n'),
          ...sectionAttributes
        };
        currentSection = null;
        sectionContent = [];
        sectionAttributes = {};
        continue;
      }

      // Collect section content
      if (currentSection) {
        sectionContent.push(lines[i]); // Use original line with spacing
      }
    }

    // Handle unclosed section
    if (currentSection) {
      parsed.sections[currentSection] = {
        content: sectionContent.join('\n'),
        ...sectionAttributes
      };
    }

    return parsed;
  }

  static serialize(data: {
    template: string;
    templateVersion: string;
    metadata: Record<string, any>;
    sections: Record<string, { content: string; title: string; type: string }>;
  }): string {
    const lines: string[] = [];

    // Add metadata header
    lines.push('<!--');
    lines.push(`@template: ${data.template}`);
    lines.push(`@version: ${data.templateVersion}`);
    lines.push(`@created: ${new Date().toISOString()}`);
    lines.push(`@metadata: ${JSON.stringify(data.metadata)}`);
    lines.push('-->');
    lines.push('');

    // Add sections
    for (const [sectionId, section] of Object.entries(data.sections)) {
      lines.push(`<!-- section:${sectionId} @title:"${section.title}" @type:${section.type} -->`);
      lines.push(section.content);
      lines.push(`<!-- /section:${sectionId} -->`);
      lines.push('');
    }

    return lines.join('\n');
  }

  static extractCleanMarkdown(content: string): string {
    const lines = content.split('\n');
    const cleanLines: string[] = [];
    let inMetadataBlock = false;
    let inSection = false;

    for (const line of lines) {
      // Skip metadata blocks
      if (line.trim() === '<!--') {
        inMetadataBlock = true;
        continue;
      }
      if (line.trim() === '-->' && inMetadataBlock) {
        inMetadataBlock = false;
        continue;
      }
      if (inMetadataBlock) continue;

      // Skip section markers but keep content
      if (line.match(this.SECTION_START_REGEX)) {
        inSection = true;
        continue;
      }
      if (line.match(this.SECTION_END_REGEX)) {
        inSection = false;
        cleanLines.push(''); // Add spacing between sections
        continue;
      }

      // Keep all non-metadata lines
      if (!line.trim().startsWith('<!--')) {
        cleanLines.push(line);
      }
    }

    return cleanLines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  static extractDisplaySections(content: string): DisplaySection[] {
    const parsed = this.parse(content);
    const sections: DisplaySection[] = [];

    for (const [sectionId, section] of Object.entries(parsed.sections)) {
      sections.push({
        id: sectionId,
        title: section.title || sectionId,
        content: section.content,
        type: section.type || 'prose'
      });
    }

    return sections;
  }

  private static parseAttributes(attrString: string): Record<string, any> {
    const attrs: Record<string, any> = {};
    const regex = /@(\w+):"([^"]+)"|@(\w+):(\S+)/g;
    let match;

    while ((match = regex.exec(attrString)) !== null) {
      if (match[1] && match[2]) {
        // Quoted attribute
        attrs[match[1]] = match[2];
      } else if (match[3] && match[4]) {
        // Unquoted attribute
        attrs[match[3]] = match[4];
      }
    }

    return attrs;
  }
}
