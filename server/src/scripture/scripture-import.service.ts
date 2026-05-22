import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseService } from '../database/database.service';
import {
  BIBLE_BOOK_NAMES,
  BIBLE_TRANSLATION_CATALOG,
  BibleTranslationEntry,
  DEFAULT_IMPORT_TRANSLATION_CODES,
} from './bible-books';
import { fetchBollsTranslation } from './bolls-import';
import { parseHelloAoComplete } from './helloao-parser';

const HELLOAO_API_BASE = 'https://bible.helloao.org/api';

const BIBLE_JSON_BASE =
  'https://raw.githubusercontent.com/thiagobodruk/bible/master/json';

type ThiagobodrukBook = {
  abbrev: string;
  chapters: string[][];
};

@Injectable()
export class ScriptureImportService implements OnModuleInit {
  private readonly logger = new Logger(ScriptureImportService.name);
  private importPromise: Promise<void> | null = null;

  constructor(private readonly database: DatabaseService) {}

  onModuleInit(): void {
    const count = this.getVerseCount();
    const pending = BIBLE_TRANSLATION_CATALOG.filter((translation) => {
      const row = this.database.db
        .prepare('SELECT COUNT(*) AS count FROM scriptures WHERE translation = ?')
        .get(translation.code) as { count: number };
      return row.count < 25_000;
    });

    if (pending.length > 0) {
      this.logger.log(
        `Scripture library has ${count} verses — importing ${pending.length} pending translation(s) in the background…`,
      );
      this.importPromise = this.importDefaultTranslations().catch((error) => {
        this.logger.error(`Bible import failed: ${String(error)}`);
      });
    }
  }

  async importDefaultTranslations(): Promise<void> {
    const configured = process.env.SCRIPTURE_TRANSLATIONS?.split(',').map((t) => t.trim());
    const targets = (configured?.length
      ? BIBLE_TRANSLATION_CATALOG.filter((t) => configured.includes(t.code))
      : BIBLE_TRANSLATION_CATALOG.filter((t) =>
          (DEFAULT_IMPORT_TRANSLATION_CODES as readonly string[]).includes(t.code),
        )
    ).sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

    for (const translation of targets) {
      const existing = this.database.db
        .prepare('SELECT COUNT(*) AS count FROM scriptures WHERE translation = ?')
        .get(translation.code) as { count: number };

      if (existing.count > 25_000) {
        this.logger.log(`${translation.code} already imported (${existing.count} verses)`);
        continue;
      }

      if (translation.source === 'bolls') {
        await this.importBollsTranslation(translation);
      } else if (translation.source === 'helloao' && translation.helloaoId) {
        await this.importHelloAoTranslation(translation);
      } else if (translation.file) {
        await this.importTranslation(translation.code, translation.file, translation.label);
      }
    }

    this.logger.log('Bible import complete');
  }

  async importTranslation(code: string, fileName: string, label: string): Promise<void> {
    const cacheDir = join(process.cwd(), 'server', 'data', 'bibles');
    mkdirSync(cacheDir, { recursive: true });
    const cachePath = join(cacheDir, fileName);

    if (!existsSync(cachePath)) {
      this.logger.log(`Downloading ${label} (${fileName})…`);
      const response = await fetch(`${BIBLE_JSON_BASE}/${fileName}`);
      if (!response.ok) {
        throw new Error(`Failed to download ${fileName}: ${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      writeFileSync(cachePath, buffer);
    }

    this.logger.log(`Importing ${label} into SQLite…`);
    const raw = readFileSync(cachePath, 'utf8').replace(/^\uFEFF/, '');
    const books = JSON.parse(raw) as ThiagobodrukBook[];

    if (books.length !== BIBLE_BOOK_NAMES.length) {
      this.logger.warn(
        `Expected ${BIBLE_BOOK_NAMES.length} books in ${fileName}, got ${books.length}`,
      );
    }

    const deleteTranslation = this.database.db.prepare(
      'DELETE FROM scriptures WHERE translation = ?',
    );
    const insert = this.database.db.prepare(
      `INSERT INTO scriptures (book, chapter, verse, text, translation)
       VALUES (?, ?, ?, ?, ?)`,
    );

    const importBooks = this.database.db.transaction(() => {
      deleteTranslation.run(code);
      books.forEach((bookJson, bookIndex) => {
        const bookName = BIBLE_BOOK_NAMES[bookIndex] ?? bookJson.abbrev;
        bookJson.chapters.forEach((verses, chapterIndex) => {
          verses.forEach((verseText, verseIndex) => {
            const text = cleanVerseText(verseText);
            if (!text) {
              return;
            }
            insert.run(bookName, chapterIndex + 1, verseIndex + 1, text, code);
          });
        });
      });
    });

    importBooks();
    const count = this.database.db
      .prepare('SELECT COUNT(*) AS count FROM scriptures WHERE translation = ?')
      .get(code) as { count: number };
    this.logger.log(`Imported ${count.count} verses for ${code} (${label})`);
  }

  async importBollsTranslation(translation: BibleTranslationEntry): Promise<void> {
    const code = translation.code;
    const label = translation.label;
    const cacheDir = join(process.cwd(), 'server', 'data', 'bibles');
    mkdirSync(cacheDir, { recursive: true });
    const cachePath = join(cacheDir, `bolls_${code}.json`);

    let parsed: Awaited<ReturnType<typeof fetchBollsTranslation>>;
    if (existsSync(cachePath)) {
      this.logger.log(`Loading cached ${label} (${code})…`);
      parsed = JSON.parse(readFileSync(cachePath, 'utf8').replace(/^\uFEFF/, ''));
    } else {
      this.logger.log(`Downloading ${label} from Bolls.life (${code})…`);
      parsed = await fetchBollsTranslation(code);
      writeFileSync(cachePath, JSON.stringify(parsed));
    }

    this.logger.log(`Importing ${label} into SQLite…`);
    const deleteTranslation = this.database.db.prepare(
      'DELETE FROM scriptures WHERE translation = ?',
    );
    const insert = this.database.db.prepare(
      `INSERT INTO scriptures (book, chapter, verse, text, translation)
       VALUES (?, ?, ?, ?, ?)`,
    );

    const importVerses = this.database.db.transaction(() => {
      deleteTranslation.run(code);
      for (const verse of parsed) {
        insert.run(verse.book, verse.chapter, verse.verse, verse.text, code);
      }
    });

    importVerses();
    const count = this.database.db
      .prepare('SELECT COUNT(*) AS count FROM scriptures WHERE translation = ?')
      .get(code) as { count: number };
    this.logger.log(`Imported ${count.count} verses for ${code} (${label})`);
  }

  async importHelloAoTranslation(translation: BibleTranslationEntry): Promise<void> {
    const code = translation.code;
    const helloaoId = translation.helloaoId!;
    const label = translation.label;
    const cacheDir = join(process.cwd(), 'server', 'data', 'bibles');
    mkdirSync(cacheDir, { recursive: true });
    const cachePath = join(cacheDir, `helloao_${helloaoId}.json`);

    if (!existsSync(cachePath)) {
      this.logger.log(`Downloading ${label} from HelloAO (${helloaoId})…`);
      const response = await fetch(`${HELLOAO_API_BASE}/${helloaoId}/complete.json`);
      if (!response.ok) {
        throw new Error(`Failed to download HelloAO ${helloaoId}: ${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      writeFileSync(cachePath, buffer);
    }

    this.logger.log(`Importing ${label} into SQLite…`);
    const raw = readFileSync(cachePath, 'utf8').replace(/^\uFEFF/, '');
    const parsed = parseHelloAoComplete(JSON.parse(raw));

    const deleteTranslation = this.database.db.prepare(
      'DELETE FROM scriptures WHERE translation = ?',
    );
    const insert = this.database.db.prepare(
      `INSERT INTO scriptures (book, chapter, verse, text, translation)
       VALUES (?, ?, ?, ?, ?)`,
    );

    const importVerses = this.database.db.transaction(() => {
      deleteTranslation.run(code);
      for (const verse of parsed) {
        insert.run(verse.book, verse.chapter, verse.verse, verse.text, code);
      }
    });

    importVerses();
    const count = this.database.db
      .prepare('SELECT COUNT(*) AS count FROM scriptures WHERE translation = ?')
      .get(code) as { count: number };
    this.logger.log(`Imported ${count.count} verses for ${code} (${label})`);
  }

  private getVerseCount(): number {
    const row = this.database.db.prepare('SELECT COUNT(*) AS count FROM scriptures').get() as {
      count: number;
    };
    return row.count;
  }
}

function cleanVerseText(text: string): string {
  return text.replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim();
}
