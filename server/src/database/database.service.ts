import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import Database, { Database as SqliteDatabase } from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { nowIso } from '../common/time';

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  private connection?: SqliteDatabase;

  onModuleInit(): void {
    const dbPath = process.env.WORSHIP_DB_PATH ?? join(process.cwd(), 'data', 'worship.sqlite');
    mkdirSync(dirname(dbPath), { recursive: true });

    this.connection = new Database(dbPath);
    this.connection.pragma('journal_mode = WAL');
    this.connection.pragma('foreign_keys = ON');
    this.connection.pragma('busy_timeout = 5000');

    this.migrate();
    this.seedOfflineContent();
  }

  onApplicationShutdown(): void {
    this.connection?.close();
  }

  get db(): SqliteDatabase {
    if (!this.connection) {
      throw new Error('Database connection has not been initialized');
    }

    return this.connection;
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT,
        default_key TEXT,
        verses_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);

      CREATE TABLE IF NOT EXISTS scriptures (
        book TEXT NOT NULL,
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        text TEXT NOT NULL,
        translation TEXT NOT NULL DEFAULT 'KJV',
        PRIMARY KEY (book, chapter, verse, translation)
      );

      CREATE INDEX IF NOT EXISTS idx_scriptures_lookup ON scriptures(book, chapter, verse);
      CREATE INDEX IF NOT EXISTS idx_scriptures_text ON scriptures(text);

      CREATE TABLE IF NOT EXISTS media (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS service_items (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT,
        item_ref TEXT,
        content_json TEXT NOT NULL,
        position INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_service_items_position ON service_items(position);

      CREATE TABLE IF NOT EXISTS service_flow_state (
        id TEXT PRIMARY KEY CHECK (id = 'singleton'),
        active_item_id TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (active_item_id) REFERENCES service_items(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS presentation_state (
        id TEXT PRIMARY KEY CHECK (id = 'singleton'),
        preview_json TEXT,
        live_json TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS detected_scriptures (
        id TEXT PRIMARY KEY,
        reference TEXT NOT NULL,
        book TEXT NOT NULL,
        chapter INTEGER NOT NULL,
        verse_start INTEGER,
        verse_end INTEGER,
        confidence REAL NOT NULL,
        source_text TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    this.db
      .prepare(
        `INSERT OR IGNORE INTO presentation_state (id, preview_json, live_json, updated_at)
         VALUES ('singleton', NULL, NULL, ?)`,
      )
      .run(nowIso());

    this.db
      .prepare(
        `INSERT OR IGNORE INTO service_flow_state (id, active_item_id, updated_at)
         VALUES ('singleton', NULL, ?)`,
      )
      .run(nowIso());
  }

  private seedOfflineContent(): void {
    const existingScriptures = this.db.prepare('SELECT COUNT(*) AS count FROM scriptures').get() as {
      count: number;
    };

    if (existingScriptures.count === 0) {
      const insert = this.db.prepare(
        `INSERT INTO scriptures (book, chapter, verse, text, translation)
         VALUES (?, ?, ?, ?, ?)`,
      );
      const seed = this.db.transaction(() => {
        [
          ['John', 3, 16, 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'],
          ['Psalm', 23, 1, 'The Lord is my shepherd; I shall not want.'],
          ['Psalm', 23, 2, 'He maketh me to lie down in green pastures: he leadeth me beside the still waters.'],
          ['Psalm', 23, 3, 'He restoreth my soul: he leadeth me in the paths of righteousness for his name sake.'],
          ['Genesis', 1, 1, 'In the beginning God created the heaven and the earth.'],
          ['Romans', 8, 28, 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.'],
          ['1 Corinthians', 13, 4, 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up.'],
        ].forEach(([book, chapter, verse, text]) => insert.run(book, chapter, verse, text, 'KJV'));
      });
      seed();
    }

    const existingSongs = this.db.prepare('SELECT COUNT(*) AS count FROM songs').get() as {
      count: number;
    };

    if (existingSongs.count === 0) {
      const timestamp = nowIso();
      this.db
        .prepare(
          `INSERT INTO songs (id, title, artist, default_key, verses_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          'song-amazing-grace',
          'Amazing Grace',
          'Traditional',
          'G',
          JSON.stringify([
            {
              type: 'verse',
              label: 'Verse 1',
              content: 'Amazing grace, how sweet the sound\nThat saved a wretch like me\nI once was lost, but now am found\nWas blind, but now I see',
            },
          ]),
          timestamp,
          timestamp,
        );
    }
  }
}
