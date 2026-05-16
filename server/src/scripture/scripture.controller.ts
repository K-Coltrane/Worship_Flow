import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
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

  @Get('detect')
  detectReferences(@Query('q') query: string) {
    return this.scriptureService.detectReferences(query ?? '');
  }
}
