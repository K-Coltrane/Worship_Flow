import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { parseJson, stringifyJson } from '../common/json';
import { Song, SongSegment } from '../common/domain.types';
import { nowIso } from '../common/time';
import { assertNotBlank } from '../common/validators';
import { DatabaseService } from '../database/database.service';
import { CreateSongDto, UpdateSongDto } from './songs.dto';

type SongRow = {
  id: string;
  title: string;
  artist: string | null;
  default_key: string | null;
  verses_json: string;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class SongsService {
  constructor(private readonly database: DatabaseService) {}

  createSong(input: CreateSongDto): Song {
    const timestamp = nowIso();
    const song: Song = {
      id: randomUUID(),
      title: assertNotBlank(input.title, 'title'),
      artist: input.artist?.trim() || undefined,
      defaultKey: input.defaultKey?.trim() || undefined,
      verses: input.verses.map((segment) => ({
        ...segment,
        label: segment.label?.trim() || undefined,
        content: assertNotBlank(segment.content, 'segment content'),
      })),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.database.db
      .prepare(
        `INSERT INTO songs (id, title, artist, default_key, verses_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        song.id,
        song.title,
        song.artist ?? null,
        song.defaultKey ?? null,
        stringifyJson(song.verses),
        song.createdAt,
        song.updatedAt,
      );

    return song;
  }

  updateSong(id: string, input: UpdateSongDto): Song {
    const existing = this.getSong(id);
    const updated: Song = {
      ...existing,
      title: input.title === undefined ? existing.title : assertNotBlank(input.title, 'title'),
      artist: input.artist === undefined ? existing.artist : input.artist.trim() || undefined,
      defaultKey:
        input.defaultKey === undefined ? existing.defaultKey : input.defaultKey.trim() || undefined,
      verses:
        input.verses === undefined
          ? existing.verses
          : input.verses.map((segment) => ({
              ...segment,
              label: segment.label?.trim() || undefined,
              content: assertNotBlank(segment.content, 'segment content'),
            })),
      updatedAt: nowIso(),
    };

    this.database.db
      .prepare(
        `UPDATE songs
         SET title = ?, artist = ?, default_key = ?, verses_json = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        updated.title,
        updated.artist ?? null,
        updated.defaultKey ?? null,
        stringifyJson(updated.verses),
        updated.updatedAt,
        id,
      );

    return updated;
  }

  getSong(id: string): Song {
    const row = this.database.db.prepare('SELECT * FROM songs WHERE id = ?').get(id) as
      | SongRow
      | undefined;

    if (!row) {
      throw new NotFoundException(`Song ${id} was not found`);
    }

    return this.mapRow(row);
  }

  searchSongs(query?: string): Song[] {
    const normalized = query?.trim();
    const rows = normalized
      ? (this.database.db
          .prepare(
            `SELECT * FROM songs
             WHERE title LIKE ? OR artist LIKE ? OR verses_json LIKE ?
             ORDER BY title COLLATE NOCASE ASC`,
          )
          .all(`%${normalized}%`, `%${normalized}%`, `%${normalized}%`) as SongRow[])
      : (this.database.db
          .prepare('SELECT * FROM songs ORDER BY title COLLATE NOCASE ASC')
          .all() as SongRow[]);

    return rows.map((row) => this.mapRow(row));
  }

  deleteSong(id: string): void {
    const result = this.database.db.prepare('DELETE FROM songs WHERE id = ?').run(id);
    if (result.changes === 0) {
      throw new NotFoundException(`Song ${id} was not found`);
    }
  }

  private mapRow(row: SongRow): Song {
    return {
      id: row.id,
      title: row.title,
      artist: row.artist ?? undefined,
      defaultKey: row.default_key ?? undefined,
      verses: parseJson<SongSegment[]>(row.verses_json, []),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
