import { Injectable, NotFoundException } from '@nestjs/common';
import { ScriptureReference, ScriptureVerse } from '../common/domain.types';
import { assertPositiveInteger } from '../common/validators';
import { DatabaseService } from '../database/database.service';
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

@Injectable()
export class ScriptureService {
  constructor(private readonly database: DatabaseService) {}

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
      throw new NotFoundException(`${canonicalBook} ${chapter}:${verse} was not found`);
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
      throw new NotFoundException(reference.reference);
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
      throw new NotFoundException(`${book} ${chapter} was not found`);
    }

    return rows;
  }

  searchScripture(query: string, translation = 'KJV'): ScriptureVerse[] {
    const normalized = query.trim();
    if (!normalized) {
      return this.database.db
        .prepare(
          `SELECT * FROM scriptures
           WHERE translation = ?
           ORDER BY book ASC, chapter ASC, verse ASC
           LIMIT 50`,
        )
        .all(translation) as ScriptureRow[];
    }

    return this.database.db
      .prepare(
        `SELECT * FROM scriptures
         WHERE translation = ?
           AND (book LIKE ? OR text LIKE ? OR (book || ' ' || chapter || ':' || verse) LIKE ?)
         ORDER BY book ASC, chapter ASC, verse ASC
         LIMIT 50`,
      )
      .all(translation, `%${normalized}%`, `%${normalized}%`, `%${normalized}%`) as ScriptureRow[];
  }

  detectReferences(text: string): ParsedScriptureReference[] {
    return detectScriptureReferences(text).filter((reference) => this.referenceExists(reference));
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
      },
    };
  }

  private referenceExists(reference: ScriptureReference): boolean {
    try {
      this.getPassage(reference);
      return true;
    } catch {
      return false;
    }
  }
}
