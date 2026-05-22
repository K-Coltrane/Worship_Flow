import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ScriptureMatchType,
  ScriptureReference,
  ScriptureVerse,
} from '../common/domain.types';
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

export interface LiveScriptureMatch extends ParsedScriptureReference {
  matchType: ScriptureMatchType;
  matchedTranslation: string;
  verseText: string;
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
    })).sort((a, b) => {
      const priority = ['MSG', 'AMP', 'AMPC', 'NLT', 'NIV', 'ESV'];
      const aRank = priority.indexOf(a.code);
      const bRank = priority.indexOf(b.code);
      if (aRank !== -1 || bRank !== -1) {
        return (aRank === -1 ? 99 : aRank) - (bRank === -1 ? 99 : bRank);
      }
      if (a.verseCount > 0 && b.verseCount === 0) return -1;
      if (b.verseCount > 0 && a.verseCount === 0) return 1;
      return a.label.localeCompare(b.label);
    });
  }

  listBooks(translation = 'NLT'): BibleBookInfo[] {
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

  /** Live speech: references + quoted text + keywords across all imported Bibles. */
  detectFromSpeech(text: string, translation = 'NLT'): LiveScriptureMatch[] {
    const resolvedTranslation = translation?.trim() || 'NLT';
    const trimmed = text?.trim() ?? '';
    if (trimmed.length < 3) {
      return [];
    }

    const recentPhrase = extractRecentPhrase(trimmed, 14);
    const segments = [trimmed, recentPhrase].filter(
      (segment, index, list) => segment.length >= 4 && list.indexOf(segment) === index,
    );

    const merged = new Map<string, LiveScriptureMatch>();

    for (const segment of segments) {
      for (const reference of detectScriptureReferences(segment)) {
        const enriched = this.enrichReferenceMatch(reference, resolvedTranslation);
        if (enriched) {
          merged.set(enriched.reference, enriched);
        }
      }
    }

    for (const quoteMatch of this.findQuotedVerseMatches(trimmed, recentPhrase, resolvedTranslation)) {
      merged.set(quoteMatch.reference, quoteMatch);
    }

    for (const keywordMatch of this.findKeywordVerseMatches(recentPhrase, resolvedTranslation)) {
      if (!merged.has(keywordMatch.reference)) {
        merged.set(keywordMatch.reference, keywordMatch);
      }
    }

    return [...merged.values()]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 12);
  }

  private enrichReferenceMatch(
    reference: ParsedScriptureReference,
    preferredTranslation: string,
  ): LiveScriptureMatch | null {
    const snippet = this.lookupVerseSnippet(reference, preferredTranslation);
    if (snippet) {
      return {
        ...reference,
        confidence: Math.min(reference.confidence + 0.05, 0.98),
        matchType: 'reference',
        matchedTranslation: snippet.translation,
        verseText: snippet.text,
      };
    }

    if (reference.confidence >= 0.78 && reference.verseStart) {
      return {
        ...reference,
        confidence: reference.confidence * 0.88,
        matchType: 'reference',
        matchedTranslation: preferredTranslation,
        verseText: '',
      };
    }

    if (reference.confidence >= 0.75 && reference.chapter && !reference.verseStart) {
      return {
        ...reference,
        confidence: reference.confidence * 0.8,
        matchType: 'keyword',
        matchedTranslation: preferredTranslation,
        verseText: `${reference.book} chapter ${reference.chapter} mentioned`,
      };
    }

    return null;
  }

  private lookupVerseSnippet(
    reference: ParsedScriptureReference,
    preferredTranslation: string,
  ): { text: string; translation: string } | null {
    const book = canonicalBookName(reference.book);
    const verse = reference.verseStart ?? 1;

    const preferred = this.database.db
      .prepare(
        `SELECT text, translation FROM scriptures
         WHERE book = ? AND chapter = ? AND verse = ? AND translation = ?
         LIMIT 1`,
      )
      .get(book, reference.chapter, verse, preferredTranslation) as
      | { text: string; translation: string }
      | undefined;

    if (preferred) {
      return preferred;
    }

    const anyTranslation = this.database.db
      .prepare(
        `SELECT text, translation FROM scriptures
         WHERE book = ? AND chapter = ? AND verse = ?
         ORDER BY CASE WHEN translation = 'KJV' THEN 0 ELSE 1 END
         LIMIT 1`,
      )
      .get(book, reference.chapter, verse) as { text: string; translation: string } | undefined;

    return anyTranslation ?? null;
  }

  private referenceExistsInAnyTranslation(reference: ParsedScriptureReference): boolean {
    const book = canonicalBookName(reference.book);
    const row = this.database.db
      .prepare(
        `SELECT 1 FROM scriptures
         WHERE book = ? AND chapter = ?
           AND verse >= ? AND verse <= ?
         LIMIT 1`,
      )
      .get(
        book,
        reference.chapter,
        reference.verseStart ?? 1,
        reference.verseEnd ?? reference.verseStart ?? 1,
      );
    return Boolean(row);
  }

  private findQuotedVerseMatches(
    fullText: string,
    recentPhrase: string,
    preferredTranslation: string,
  ): LiveScriptureMatch[] {
    const phrases = [
      recentPhrase,
      extractRecentPhrase(fullText, 10),
      extractRecentPhrase(fullText, 8),
    ].filter((phrase, index, list) => phrase.length >= 10 && list.indexOf(phrase) === index);

    const rows = this.queryVerseTextAcrossTranslations(phrases, preferredTranslation);
    return rows.map((row) => ({
      book: row.book,
      chapter: row.chapter,
      verseStart: row.verse,
      verseEnd: row.verse,
      reference: formatReference(row.book, row.chapter, row.verse, row.verse),
      confidence: row.translation === preferredTranslation ? 0.84 : 0.76,
      matchType: 'quote' as ScriptureMatchType,
      matchedTranslation: row.translation,
      verseText: row.text,
    }));
  }

  private findKeywordVerseMatches(
    recentPhrase: string,
    preferredTranslation: string,
  ): LiveScriptureMatch[] {
    const normalized = recentPhrase
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (normalized.length < 10) {
      return [];
    }

    const stopWords = new Set([
      'the',
      'and',
      'that',
      'for',
      'with',
      'said',
      'lord',
      'god',
      'you',
      'your',
      'our',
      'who',
      'this',
      'that',
      'have',
      'has',
      'was',
      'are',
      'from',
      'they',
      'them',
      'when',
      'where',
      'what',
      'how',
      'all',
      'not',
      'but',
      'his',
      'her',
      'shall',
      'will',
      'would',
      'there',
      'their',
      'then',
      'also',
      'into',
      'unto',
      'thee',
      'thou',
    ]);

    const words = normalized.split(' ').filter((w) => w.length > 2 && !stopWords.has(w));
    if (words.length < 3) {
      return [];
    }

    const keywordPhrase = words.slice(-6).join(' ');
    const rows = this.database.db
      .prepare(
        `SELECT book, chapter, verse, text, translation FROM scriptures
         WHERE length(text) > 15
           AND lower(text) LIKE '%' || lower(?) || '%'
         ORDER BY
           CASE WHEN translation = ? THEN 0 ELSE 1 END,
           length(text) ASC
         LIMIT 4`,
      )
      .all(keywordPhrase, preferredTranslation) as ScriptureRow[];

    return rows.map((row) => ({
      book: row.book,
      chapter: row.chapter,
      verseStart: row.verse,
      verseEnd: row.verse,
      reference: formatReference(row.book, row.chapter, row.verse, row.verse),
      confidence: 0.68,
      matchType: 'keyword' as ScriptureMatchType,
      matchedTranslation: row.translation,
      verseText: row.text,
    }));
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

    if (normalized.length < 8) {
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
    const phrases = [
      words.slice(-windowSize).join(' '),
      words.slice(0, windowSize).join(' '),
      words.slice(Math.max(0, words.length - 14), words.length).join(' '),
    ].filter((phrase, index, list) => phrase.length >= 8 && list.indexOf(phrase) === index);

    const rows = searchAllTranslations
      ? this.queryVerseTextAcrossTranslations(phrases, translation)
      : this.queryVerseTextForTranslation(phrases[0] ?? '', translation);

    const fallbackRows = rows;

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
        confidence: row.translation === translation ? 0.85 : 0.78,
      });
    }

    return results;
  }

  private queryVerseTextForTranslation(phrase: string, translation: string): ScriptureRow[] {
    if (!phrase) {
      return [];
    }
    return this.database.db
      .prepare(
        `SELECT book, chapter, verse, text, translation FROM scriptures
         WHERE translation = ?
           AND length(text) > 12
           AND lower(text) LIKE '%' || lower(?) || '%'
         ORDER BY length(text) ASC
         LIMIT 6`,
      )
      .all(translation, phrase) as ScriptureRow[];
  }

  private queryVerseTextAcrossTranslations(
    phrases: string[],
    preferredTranslation: string,
  ): ScriptureRow[] {
    const merged: ScriptureRow[] = [];
    const seen = new Set<string>();

    for (const phrase of phrases) {
      const batch = this.database.db
        .prepare(
          `SELECT book, chapter, verse, text, translation FROM scriptures
           WHERE length(text) > 12
             AND lower(text) LIKE '%' || lower(?) || '%'
           ORDER BY
             CASE WHEN translation = ? THEN 0 ELSE 1 END,
             length(text) ASC
           LIMIT 10`,
        )
        .all(phrase, preferredTranslation) as ScriptureRow[];

      for (const row of batch) {
        const key = `${row.book}:${row.chapter}:${row.verse}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        merged.push(row);
      }
    }

    return merged.slice(0, 15);
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

function extractRecentPhrase(text: string, wordCount = 12): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= wordCount) {
    return words.join(' ');
  }
  return words.slice(-wordCount).join(' ');
}
