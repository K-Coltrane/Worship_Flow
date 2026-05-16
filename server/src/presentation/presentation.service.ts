import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { parseJson, stringifyJson } from '../common/json';
import { DetectedScripture, PresentationContent, PresentationState } from '../common/domain.types';
import { nowIso } from '../common/time';
import { DatabaseService } from '../database/database.service';
import { RealtimeEvents } from '../realtime/realtime.events';
import { RealtimeService } from '../realtime/realtime.service';
import { ScriptureService } from '../scripture/scripture.service';
import { detectScriptureReferences } from '../scripture/scripture-reference.parser';

type PresentationStateRow = {
  preview_json: string | null;
  live_json: string | null;
  updated_at: string;
};

type DetectedScriptureRow = {
  id: string;
  reference: string;
  book: string;
  chapter: number;
  verse_start: number | null;
  verse_end: number | null;
  confidence: number;
  source_text: string;
  created_at: string;
};

@Injectable()
export class PresentationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly realtime: RealtimeService,
    private readonly scriptureService: ScriptureService,
  ) {}

  getState(): PresentationState {
    const row = this.database.db
      .prepare(`SELECT preview_json, live_json, updated_at FROM presentation_state WHERE id = 'singleton'`)
      .get() as PresentationStateRow;

    return {
      preview: parseJson<PresentationContent | null>(row.preview_json, null),
      live: parseJson<PresentationContent | null>(row.live_json, null),
      updatedAt: row.updated_at,
    };
  }

  setPreview(item: PresentationContent): PresentationState {
    const preview = this.cloneContent(item);
    const timestamp = nowIso();

    this.database.db
      .prepare(`UPDATE presentation_state SET preview_json = ?, updated_at = ? WHERE id = 'singleton'`)
      .run(stringifyJson(preview), timestamp);

    const state = this.getState();
    this.realtime.emit(RealtimeEvents.PreviewUpdated, { preview, state });
    this.realtime.emit(RealtimeEvents.PresentationStateUpdated, state);
    return state;
  }

  goLive(): PresentationState {
    const state = this.getState();
    if (!state.preview) {
      throw new BadRequestException('Cannot go live without preview content');
    }

    const live = this.cloneContent(state.preview);
    const timestamp = nowIso();
    this.database.db
      .prepare(`UPDATE presentation_state SET live_json = ?, updated_at = ? WHERE id = 'singleton'`)
      .run(stringifyJson(live), timestamp);

    const updatedState = this.getState();
    this.realtime.emit(RealtimeEvents.LiveUpdated, { live, state: updatedState });
    this.realtime.emit(RealtimeEvents.PresentationStateUpdated, updatedState);
    return updatedState;
  }

  clearLive(): PresentationState {
    const timestamp = nowIso();
    this.database.db
      .prepare(`UPDATE presentation_state SET live_json = NULL, updated_at = ? WHERE id = 'singleton'`)
      .run(timestamp);

    const state = this.getState();
    this.realtime.emit(RealtimeEvents.LiveUpdated, { live: null, state });
    this.realtime.emit(RealtimeEvents.PresentationStateUpdated, state);
    return state;
  }

  projectScripture(referenceText?: string, translation = 'KJV'): PresentationState {
    const reference = referenceText
      ? detectScriptureReferences(referenceText)[0]
      : this.getLatestDetectedScripture();

    if (!reference) {
      throw new NotFoundException('No scripture reference is available to project');
    }

    const content = this.scriptureService.buildPresentationContent(reference, translation);
    const timestamp = nowIso();
    this.database.db
      .prepare(`UPDATE presentation_state SET live_json = ?, updated_at = ? WHERE id = 'singleton'`)
      .run(stringifyJson(content), timestamp);

    const state = this.getState();
    this.realtime.emit(RealtimeEvents.LiveUpdated, { live: content, state });
    this.realtime.emit(RealtimeEvents.PresentationStateUpdated, state);
    return state;
  }

  private getLatestDetectedScripture(): DetectedScripture | null {
    const row = this.database.db
      .prepare(`SELECT * FROM detected_scriptures ORDER BY created_at DESC LIMIT 1`)
      .get() as DetectedScriptureRow | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      reference: row.reference,
      book: row.book,
      chapter: row.chapter,
      verseStart: row.verse_start ?? undefined,
      verseEnd: row.verse_end ?? undefined,
      confidence: row.confidence,
      sourceText: row.source_text,
      timestamp: row.created_at,
    };
  }

  private cloneContent(item: PresentationContent): PresentationContent {
    if (!item?.id || !item.type || !item.title) {
      throw new BadRequestException('Presentation content requires id, type, and title');
    }

    return JSON.parse(JSON.stringify(item)) as PresentationContent;
  }
}
