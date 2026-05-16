import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateSongDto, UpdateSongDto } from './songs.dto';
import { SongsService } from './songs.service';

@Controller('songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Post()
  createSong(@Body() input: CreateSongDto) {
    return this.songsService.createSong(input);
  }

  @Get()
  searchSongs(@Query('q') query?: string) {
    return this.songsService.searchSongs(query);
  }

  @Get(':id')
  getSong(@Param('id') id: string) {
    return this.songsService.getSong(id);
  }

  @Patch(':id')
  updateSong(@Param('id') id: string, @Body() input: UpdateSongDto) {
    return this.songsService.updateSong(id, input);
  }

  @Delete(':id')
  deleteSong(@Param('id') id: string) {
    this.songsService.deleteSong(id);
    return { deleted: true };
  }
}
