import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DetectedScripture } from '../common/domain.types';
import { nowIso } from '../common/time';
import { DatabaseService } from '../database/database.service';
import { RealtimeEvents } from '../realtime/realtime.events';
import { RealtimeService } from '../realtime/realtime.service';
import { ScriptureService } from '../scripture/scripture.service';
import { SpeechToTextService, TranscriptionResult } from './speech-to-text.service';

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
  matched_translation: string | null;
  verse_text: string | null;
  match_type: string | null;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly realtime: RealtimeService,
    private readonly scriptureService: ScriptureService,
    private readonly speechToText: SpeechToTextService,
  ) {}

  processText(text: string, source = 'manual', translation = 'KJV', persist = true) {
    const transcription = this.speechToText.fromText(text);
    return this.processTranscription(transcription, source, translation, persist);
  }

  async processAudio(audioBase64: string) {
    const transcription = await this.speechToText.transcribeAudio(audioBase64);
    return this.processTranscription(transcription, 'microphone');
  }

  getLatestDetection(): DetectedScripture | null {
    const row = this.database.db
      .prepare(`SELECT * FROM detected_scriptures ORDER BY created_at DESC LIMIT 1`)
      .get() as DetectedScriptureRow | undefined;

    return row ? this.mapDetection(row) : null;
  }

  listDetections(limit = 25): DetectedScripture[] {
    const rows = this.database.db
      .prepare(`SELECT * FROM detected_scriptures ORDER BY created_at DESC LIMIT ?`)
      .all(limit) as DetectedScriptureRow[];

    return rows.map((row) => this.mapDetection(row));
  }

  clearDetections(): { cleared: number } {
    const result = this.database.db.prepare(`DELETE FROM detected_scriptures`).run();
    return { cleared: result.changes };
  }

  private processTranscription(
    transcription: TranscriptionResult,
    source: string,
    translation = 'KJV',
    persist = true,
  ) {
    const timestamp = nowIso();
    const transcriptPayload = {
      text: transcription.text,
      engine: transcription.engine,
      confidence: transcription.confidence,
      source,
      timestamp,
    };

    this.realtime.emit(RealtimeEvents.TranscriptionUpdate, transcriptPayload);

    try {
      const detections = transcription.text
        ? this.scriptureService
            .detectFromSpeech(transcription.text, translation)
            .map((match) =>
              persist
                ? this.storeDetection({
                    reference: match.reference,
                    book: match.book,
                    chapter: match.chapter,
                    verseStart: match.verseStart,
                    verseEnd: match.verseEnd,
                    confidence: Math.min(match.confidence, transcription.confidence),
                    sourceText: transcription.text,
                    matchedTranslation: match.matchedTranslation,
                    verseText: match.verseText,
                    matchType: match.matchType,
                  })
                : {
                    id: `ephemeral-${match.reference}-${match.matchedTranslation}`,
                    reference: match.reference,
                    book: match.book,
                    chapter: match.chapter,
                    verseStart: match.verseStart,
                    verseEnd: match.verseEnd,
                    confidence: Math.min(match.confidence, transcription.confidence),
                    sourceText: transcription.text,
                    timestamp,
                    matchedTranslation: match.matchedTranslation,
                    verseText: match.verseText,
                    matchType: match.matchType,
                  },
            )
        : [];

      detections.forEach((detection) =>
        this.realtime.emit(RealtimeEvents.ScriptureDetected, detection),
      );

      return {
        transcription: transcriptPayload,
        detections,
      };
    } catch (error) {
      this.logger.warn(`Scripture detection failed: ${String(error)}`);
      return {
        transcription: transcriptPayload,
        detections: [],
        warning: 'Scripture detection failed; presentation control is unaffected.',
      };
    }
  }

  private storeDetection(input: {
    reference: string;
    book: string;
    chapter: number;
    verseStart?: number;
    verseEnd?: number;
    confidence: number;
    sourceText: string;
    matchedTranslation?: string;
    verseText?: string;
    matchType?: string;
  }): DetectedScripture {
    const detection: DetectedScripture = {
      id: randomUUID(),
      reference: input.reference,
      book: input.book,
      chapter: input.chapter,
      verseStart: input.verseStart,
      verseEnd: input.verseEnd,
      confidence: input.confidence,
      sourceText: input.sourceText,
      timestamp: nowIso(),
      matchedTranslation: input.matchedTranslation,
      verseText: input.verseText,
      matchType: input.matchType as DetectedScripture['matchType'],
    };

    this.database.db
      .prepare(
        `INSERT INTO detected_scriptures
          (id, reference, book, chapter, verse_start, verse_end, confidence, source_text, created_at,
           matched_translation, verse_text, match_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        detection.id,
        detection.reference,
        detection.book,
        detection.chapter,
        detection.verseStart ?? null,
        detection.verseEnd ?? null,
        detection.confidence,
        detection.sourceText,
        detection.timestamp,
        detection.matchedTranslation ?? null,
        detection.verseText ?? null,
        detection.matchType ?? null,
      );

    return detection;
  }

  private mapDetection(row: DetectedScriptureRow): DetectedScripture {
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
      matchedTranslation: row.matched_translation ?? undefined,
      verseText: row.verse_text ?? undefined,
      matchType: (row.match_type as DetectedScripture['matchType']) ?? undefined,
    };
  }
}
