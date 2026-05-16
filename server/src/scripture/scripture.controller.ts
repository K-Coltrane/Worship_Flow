import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { detectScriptureReferences } from './scripture-reference.parser';
import { ScriptureService } from './scripture.service';

@Controller('scripture')
export class ScriptureController {
  constructor(private readonly scriptureService: ScriptureService) {}

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
    return this.scriptureService.searchScripture(query ?? '', translation);
  }

  @Get('passage')
  getPassage(@Query('reference') reference: string, @Query('translation') translation?: string) {
    const parsedReference = detectScriptureReferences(reference ?? '')[0];
    return this.scriptureService.buildPresentationContent(
      parsedReference ?? {
        reference,
        book: reference,
        chapter: 1,
      },
      translation,
    );
  }

  @Get('detect')
  detectReferences(@Query('q') query: string) {
    return this.scriptureService.detectReferences(query ?? '');
  }
}
