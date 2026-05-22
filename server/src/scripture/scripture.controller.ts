import { Body, Controller, Get, ParseIntPipe, Post, Query } from '@nestjs/common';
import { DetectedScripture } from '../common/domain.types';
import { nowIso } from '../common/time';
import { detectScriptureReferences } from './scripture-reference.parser';
import { DetectSpeechDto } from './scripture.dto';
import { ScriptureService } from './scripture.service';

@Controller('scripture')
export class ScriptureController {
  constructor(private readonly scriptureService: ScriptureService) {}

  @Get('translations')
  listTranslations() {
    return this.scriptureService.listTranslations();
  }

  @Get('books')
  listBooks(@Query('translation') translation?: string) {
    return this.scriptureService.listBooks(translation ?? 'NLT');
  }

  @Get('chapters')
  listChapters(@Query('book') book: string, @Query('translation') translation?: string) {
    return this.scriptureService.listChapters(book, translation ?? 'NLT');
  }

  @Get('chapter')
  getChapter(
    @Query('book') book: string,
    @Query('chapter', ParseIntPipe) chapter: number,
    @Query('translation') translation?: string,
  ) {
    return this.scriptureService.getChapter(book, chapter, translation ?? 'KJV');
  }

  @Get('verse')
  getVerse(
    @Query('book') book: string,
    @Query('chapter', ParseIntPipe) chapter: number,
    @Query('verse', ParseIntPipe) verse: number,
    @Query('translation') translation?: string,
  ) {
    return this.scriptureService.getVerse(book, chapter, verse, translation);
  }

  @Get('search')
  searchScripture(@Query('q') query: string, @Query('translation') translation?: string) {
    return this.scriptureService.searchScripture(query ?? '', translation ?? 'NLT');
  }

  @Get('passage')
  getPassage(
    @Query('reference') reference: string,
    @Query('translation') translation?: string,
  ) {
    const parsedReference = detectScriptureReferences(reference ?? '')[0];
    return this.scriptureService.buildPresentationContent(
      parsedReference ?? {
        reference,
        book: reference,
        chapter: 1,
      },
      translation ?? 'NLT',
    );
  }

  @Get('detect')
  detectReferences(@Query('q') query: string, @Query('translation') translation?: string) {
    return this.scriptureService.detectReferences(query ?? '', translation ?? 'NLT');
  }

  /** Fast live detection while mic is on — no transcription persistence. */
  @Post('detect-speech')
  detectSpeech(@Body() input: DetectSpeechDto): DetectedScripture[] {
    const translation = input.translation?.trim() || 'NLT';
    const timestamp = nowIso();
    return this.scriptureService.detectFromSpeech(input.text ?? '', translation).map((match) => ({
      id: `live-${match.reference}-${match.matchedTranslation}`,
      reference: match.reference,
      book: match.book,
      chapter: match.chapter,
      verseStart: match.verseStart,
      verseEnd: match.verseEnd,
      confidence: match.confidence,
      sourceText: input.text,
      timestamp,
      matchedTranslation: match.matchedTranslation,
      verseText: match.verseText,
      matchType: match.matchType,
    }));
  }
}
