import { Injectable, NotFoundException } from '@nestjs/common';
import { ScriptureReference, ScriptureVerse } from '../common/domain.types';
import { assertPositiveInteger } from '../common/validators';
import { DatabaseService } from '../database/database.service';
import { BIBLE_BOOK_NAMES, BIBLE_TRANSLATION_CATALOG } from './bible-books';
import { CHAPTERS_PER_BOOK, getTestament } from './bible-chapters';
import {
  ParsedScriptureReference,
  canonicalBookName,
  detectScriptureReferences,
  formatReference,
} from './scripture-reference.parser';

type ScriptureRow = {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
};

export interface TranslationInfo {
  code: string;
  label: string;
  language: string;
  verseCount: number;
}

export interface BibleBookInfo {
  name: string;
  testament: 'OT' | 'NT';
  chapters: number;
  versesAvailable: number;
}

@Injectable()
export class ScriptureService {
  constructor(private readonly database: DatabaseService) {}

  listTranslations(): TranslationInfo[] {
    const rows = this.database.db
      .prepare(
        `SELECT translation AS code, COUNT(*) AS verseCount
         FROM scriptures
         GROUP BY translation`,
      )
      .all() as { code: string; verseCount: number }[];

    const imported = new Map(rows.map((row) => [row.code, row.verseCount]));

    return BIBLE_TRANSLATION_CATALOG.map((translation) => ({
      code: translation.code,
      label: translation.label,
      language: translation.language,
      verseCount: imported.get(translation.code) ?? 0,
    })).sort((a, b) => a.language.localeCompare(b.language) || a.label.localeCompare(b.label));
  }

  listBooks(translation = 'KJV'): BibleBookInfo[] {
    const resolved = translation?.trim() || 'KJV';
    const rows = this.database.db
      .prepare(
        `SELECT book, COUNT(*) AS verses
         FROM scriptures
         WHERE translation = ?
         GROUP BY book`,
      )
      .all(resolved) as { book: string; verses: number }[];

    const verseMap = new Map(rows.map((row) => [row.book, row.verses]));

    return BIBLE_BOOK_NAMES.map((name) => ({
      name,
      testament: getTestament(name),
      chapters: CHAPTERS_PER_BOOK[name],
      versesAvailable: verseMap.get(name) ?? 0,
    }));
  }

  listChapters(book: string, translation = 'KJV'): number[] {
    const canonicalBook = canonicalBookName(book);
    const resolved = translation?.trim() || 'KJV';

    const rows = this.database.db
      .prepare(
        `SELECT DISTINCT chapter
         FROM scriptures
         WHERE book = ? AND translation = ?
         ORDER BY chapter ASC`,
      )
      .all(canonicalBook, resolved) as { chapter: number }[];

    if (rows.length > 0) {
      return rows.map((row) => row.chapter);
    }

    const total = CHAPTERS_PER_BOOK[canonicalBook as keyof typeof CHAPTERS_PER_BOOK] ?? 1;
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  getVerse(book: string, chapter: number, verse: number, translation = 'KJV'): ScriptureVerse {
    const canonicalBook = canonicalBookName(book);
    assertPositiveInteger(chapter, 'chapter');
    assertPositiveInteger(verse, 'verse');

    const row = this.database.db
      .prepare(
        `SELECT * FROM scriptures
         WHERE book = ? AND chapter = ? AND verse = ? AND translation = ?`,
      )
      .get(canonicalBook, chapter, verse, translation) as ScriptureRow | undefined;

    if (!row) {
      throw new NotFoundException(`${canonicalBook} ${chapter}:${verse} (${translation}) was not found`);
    }

    return row;
  }

  getPassage(reference: ScriptureReference, translation = 'KJV'): ScriptureVerse[] {
    const canonicalBook = canonicalBookName(reference.book);
    assertPositiveInteger(reference.chapter, 'chapter');

    if (!reference.verseStart) {
      return this.getChapter(canonicalBook, reference.chapter, translation);
    }

    const verseEnd = reference.verseEnd ?? reference.verseStart;
    const rows = this.database.db
      .prepare(
        `SELECT * FROM scriptures
         WHERE book = ? AND chapter = ? AND verse BETWEEN ? AND ? AND translation = ?
         ORDER BY verse ASC`,
      )
      .all(canonicalBook, reference.chapter, reference.verseStart, verseEnd, translation) as ScriptureRow[];

    if (rows.length === 0) {
      throw new NotFoundException(`${reference.reference} (${translation})`);
    }

    return rows;
  }

  getChapter(book: string, chapter: number, translation = 'KJV'): ScriptureVerse[] {
    const rows = this.database.db
      .prepare(
        `SELECT * FROM scriptures
         WHERE book = ? AND chapter = ? AND translation = ?
         ORDER BY verse ASC`,
      )
      .all(canonicalBookName(book), chapter, translation) as ScriptureRow[];

    if (rows.length === 0) {
      throw new NotFoundException(`${book} ${chapter} (${translation}) was not found`);
    }

    return rows;
  }

  searchScripture(query: string, translation = 'KJV'): ScriptureVerse[] {
    const normalized = query.trim();
    const resolvedTranslation = translation?.trim() || 'KJV';

    if (!normalized) {
      return this.database.db
        .prepare(
          `SELECT * FROM scriptures
           WHERE translation = ?
           ORDER BY book ASC, chapter ASC, verse ASC
           LIMIT 75`,
        )
        .all(resolvedTranslation) as ScriptureRow[];
    }

    const referenceMatches = detectScriptureReferences(normalized);
    if (referenceMatches.length > 0) {
      const verses: ScriptureVerse[] = [];
      for (const reference of referenceMatches) {
        try {
          verses.push(...this.getPassage(reference, resolvedTranslation));
        } catch {
          // try next parsed reference
        }
      }
      if (verses.length > 0) {
        return verses.slice(0, 75);
      }
    }

    return this.database.db
      .prepare(
        `SELECT * FROM scriptures
         WHERE translation = ?
           AND (
             book LIKE ?
             OR text LIKE ?
             OR (book || ' ' || chapter || ':' || verse) LIKE ?
           )
         ORDER BY book ASC, chapter ASC, verse ASC
         LIMIT 75`,
      )
      .all(
        resolvedTranslation,
        `%${normalized}%`,
        `%${normalized}%`,
        `%${normalized}%`,
      ) as ScriptureRow[];
  }

  detectReferences(text: string, translation = 'KJV'): ParsedScriptureReference[] {
    return detectScriptureReferences(text).filter((reference) =>
      this.referenceExists(reference, translation),
    );
  }

  /** Parse spoken/typed references and match verse text against all imported translations. */
  detectFromSpeech(text: string, translation = 'KJV'): ParsedScriptureReference[] {
    const resolvedTranslation = translation?.trim() || 'KJV';
    const fromReferences = detectScriptureReferences(text)
      .map((reference) => this.resolveReference(reference, resolvedTranslation))
      .filter((reference): reference is ParsedScriptureReference => reference !== null);

    const fromVerseText = this.findByVerseTextOverlap(text, resolvedTranslation, true);

    const merged = new Map<string, ParsedScriptureReference>();
    for (const reference of [...fromReferences, ...fromVerseText]) {
      merged.set(reference.reference, reference);
    }

    return [...merged.values()].slice(0, 12);
  }

  private resolveReference(
    reference: ParsedScriptureReference,
    translation: string,
  ): ParsedScriptureReference | null {
    if (this.referenceExists(reference, translation)) {
      return reference;
    }
    if (translation !== 'KJV' && this.referenceExists(reference, 'KJV')) {
      return { ...reference, confidence: reference.confidence * 0.9 };
    }
    return null;
  }

  private findByVerseTextOverlap(
    text: string,
    translation: string,
    searchAllTranslations = false,
  ): ParsedScriptureReference[] {
    const normalized = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (normalized.length < 12) {
      return [];
    }

    const stopWords = new Set([
      'the',
      'and',
      'that',
      'for',
      'with',
      'unto',
      'thee',
      'thou',
      'shall',
      'said',
      'lord',
      'god',
      'into',
      'from',
      'they',
      'them',
      'have',
      'hath',
      'was',
      'are',
      'his',
      'her',
      'you',
      'your',
      'our',
      'who',
      'whom',
      'which',
      'this',
      'these',
      'those',
      'what',
      'when',
      'where',
      'there',
      'their',
      'then',
      'than',
      'also',
      'even',
      'every',
      'upon',
      'because',
      'behold',
    ]);

    const words = normalized
      .split(' ')
      .filter((word) => word.length > 2 && !stopWords.has(word));

    if (words.length < 3) {
      return [];
    }

    const windowSize = Math.min(10, words.length);
    const phrase = words.slice(0, windowSize).join(' ');

    const rows = searchAllTranslations
      ? (this.database.db
          .prepare(
            `SELECT book, chapter, verse, text, translation FROM scriptures
             WHERE length(text) > 15
               AND lower(text) LIKE '%' || lower(?) || '%'
             ORDER BY
               CASE WHEN translation = ? THEN 0 WHEN translation = 'KJV' THEN 1 ELSE 2 END,
               length(text) ASC
             LIMIT 15`,
          )
          .all(phrase, translation) as (ScriptureRow & { translation: string })[])
      : (this.database.db
          .prepare(
            `SELECT book, chapter, verse, text, translation FROM scriptures
             WHERE translation = ?
               AND length(text) > 15
               AND lower(text) LIKE '%' || lower(?) || '%'
             ORDER BY length(text) ASC
             LIMIT 8`,
          )
          .all(translation, phrase) as (ScriptureRow & { translation: string })[]);

    const fallbackRows =
      rows.length > 0 || !searchAllTranslations
        ? rows
        : (this.database.db
            .prepare(
              `SELECT book, chapter, verse, text, translation FROM scriptures
               WHERE length(text) > 15
                 AND lower(text) LIKE '%' || lower(?) || '%'
               ORDER BY length(text) ASC
               LIMIT 8`,
            )
            .all(phrase) as (ScriptureRow & { translation: string })[]);

    const seen = new Set<string>();
    const results: ParsedScriptureReference[] = [];
    for (const row of fallbackRows) {
      const key = `${row.book}:${row.chapter}:${row.verse}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      results.push({
      book: row.book,
      chapter: row.chapter,
      verseStart: row.verse,
      verseEnd: row.verse,
        reference: formatReference(row.book, row.chapter, row.verse, row.verse),
        confidence: row.translation === translation ? 0.82 : 0.75,
      });
    }

    return results;
  }

  buildPresentationContent(reference: ScriptureReference, translation = 'KJV') {
    const verses = this.getPassage(reference, translation);
    const normalizedReference = {
      ...reference,
      book: canonicalBookName(reference.book),
      reference: formatReference(
        canonicalBookName(reference.book),
        reference.chapter,
        reference.verseStart,
        reference.verseEnd,
      ),
    };

    return {
      id: `scripture:${normalizedReference.reference}:${translation}`,
      type: 'scripture' as const,
      title: normalizedReference.reference,
      subtitle: translation,
      content: verses.map((verse) => verse.text).join(' '),
      payload: {
        reference: normalizedReference,
        verses,
        translation,
      },
    };
  }

  private referenceExists(reference: ScriptureReference, translation: string): boolean {
    try {
      this.getPassage(reference, translation);
      return true;
    } catch {
      return false;
    }
  }
}
