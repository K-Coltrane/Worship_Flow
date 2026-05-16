export type ContentType = 'song' | 'scripture' | 'media' | 'blank';

export interface SongSegment {
  type: 'verse' | 'chorus' | 'bridge' | 'tag' | 'intro' | 'outro';
  label?: string;
  content: string;
}

export interface Song {
  id: string;
  title: string;
  artist?: string;
  defaultKey?: string;
  verses: SongSegment[];
  createdAt: string;
  updatedAt: string;
}

export interface ScriptureVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
}

export interface ScriptureReference {
  reference: string;
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

export interface PresentationContent {
  id: string;
  type: ContentType;
  title: string;
  subtitle?: string;
  content?: string;
  payload?: Record<string, unknown>;
}

export interface PresentationState {
  preview: PresentationContent | null;
  live: PresentationContent | null;
  updatedAt: string;
}

export interface ServiceFlowItem {
  id: string;
  type: Exclude<ContentType, 'blank'>;
  title: string;
  subtitle?: string;
  content: PresentationContent;
  itemRef?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface DetectedScripture extends ScriptureReference {
  id: string;
  confidence: number;
  sourceText: string;
  timestamp: string;
}
