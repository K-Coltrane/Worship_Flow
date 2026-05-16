import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { detectScriptureReferences } from './scripture-reference.parser';
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
    return this.scriptureService.listBooks(translation ?? 'KJV');
  }

  @Get('chapters')
  listChapters(@Query('book') book: string, @Query('translation') translation?: string) {
    return this.scriptureService.listChapters(book, translation ?? 'KJV');
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
    return this.scriptureService.searchScripture(query ?? '', translation ?? 'KJV');
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
      translation ?? 'KJV',
    );
  }

  @Get('detect')
  detectReferences(@Query('q') query: string, @Query('translation') translation?: string) {
    return this.scriptureService.detectReferences(query ?? '', translation ?? 'KJV');
  }
}
