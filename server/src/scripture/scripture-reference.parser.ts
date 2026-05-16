import { ScriptureReference } from '../common/domain.types';
import { bookAliases } from './bible-books';

const numberWords: Record<string, string> = {
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  eleven: '11',
  twelve: '12',
  thirteen: '13',
  fourteen: '14',
  fifteen: '15',
  sixteen: '16',
  seventeen: '17',
  eighteen: '18',
  nineteen: '19',
  twenty: '20',
  first: '1',
  second: '2',
  third: '3',
};

export interface ParsedScriptureReference extends ScriptureReference {
  confidence: number;
}

export function detectScriptureReferences(input: string): ParsedScriptureReference[] {
  const normalized = normalizeReferenceInput(input);
  const matches: ParsedScriptureReference[] = [];

  const colonPattern =
    /\b([1-3]?\s?[a-z]+)\s+(\d+)\s*:\s*(\d+)(?:\s*(?:-|to|through)\s*(\d+))?/gi;
  for (const match of normalized.matchAll(colonPattern)) {
    const book = canonicalBookName(match[1]);
    const chapter = Number(match[2]);
    const verseStart = Number(match[3]);
    const verseEnd = match[4] ? Number(match[4]) : verseStart;
    if (Number.isInteger(chapter) && chapter > 0 && Number.isInteger(verseStart) && verseStart > 0) {
      matches.push({
        book,
        chapter,
        verseStart,
        verseEnd,
        reference: formatReference(book, chapter, verseStart, verseEnd),
        confidence: 0.95,
      });
    }
  }

  for (const [book, aliases] of Object.entries(bookAliases)) {
    for (const alias of aliases) {
      const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(
        `\\b${escapedAlias}\\b\\s+(?:chapter\\s+)?(\\d+)(?:\\s*(?::|verse|verses)?\\s*(\\d+)(?:\\s*(?:-|to|through)\\s*(\\d+))?)?`,
        'gi',
      );

      for (const match of normalized.matchAll(pattern)) {
        const chapter = Number(match[1]);
        const verseStart = match[2] ? Number(match[2]) : undefined;
        const verseEnd = match[3] ? Number(match[3]) : verseStart;

        if (!Number.isInteger(chapter) || chapter < 1) {
          continue;
        }

        matches.push({
          book,
          chapter,
          verseStart,
          verseEnd,
          reference: formatReference(book, chapter, verseStart, verseEnd),
          confidence: verseStart ? 0.92 : 0.78,
        });
      }
    }
  }

  return dedupeReferences(matches);
}

export function normalizeReferenceInput(input: string): string {
  const lowercase = input.toLowerCase().replace(/[“”"]/g, '').replace(/[,.!?;]/g, ' ');

  return lowercase
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => numberWords[token] ?? token)
    .join(' ');
}

export function formatReference(
  book: string,
  chapter: number,
  verseStart?: number,
  verseEnd?: number,
): string {
  if (!verseStart) {
    return `${book} ${chapter}`;
  }

  if (verseEnd && verseEnd !== verseStart) {
    return `${book} ${chapter}:${verseStart}-${verseEnd}`;
  }

  return `${book} ${chapter}:${verseStart}`;
}

export function canonicalBookName(input: string): string {
  const normalized = normalizeReferenceInput(input);
  for (const [book, aliases] of Object.entries(bookAliases)) {
    if (aliases.includes(normalized)) {
      return book;
    }
  }

  return input
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dedupeReferences(matches: ParsedScriptureReference[]): ParsedScriptureReference[] {
  const seen = new Set<string>();
  return matches.filter((match) => {
    const key = `${match.book}:${match.chapter}:${match.verseStart ?? ''}:${match.verseEnd ?? ''}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
