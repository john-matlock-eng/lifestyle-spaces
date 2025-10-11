export interface TemplateSection {
  id: string;
  title: string;
  type: 'list' | 'prose' | 'scale' | 'checkbox' | 'grid';
  required?: boolean;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  limit?: number;
  options?: string[];
}

export interface ParsedJournal {
  template: string | null;
  templateVersion: string | null;
  created: string | null;
  metadata: Record<string, any>;
  sections: Record<string, SectionContent>;
  rawContent: string;
}

export interface SectionContent {
  content: string;
  title?: string;
  type?: string;
  attributes?: Record<string, any>;
}

export interface DisplaySection {
  id: string;
  title: string;
  content: string;
  type: string;
}
