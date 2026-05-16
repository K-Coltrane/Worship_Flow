import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AiService } from './ai.service';
import { AudioInputDto, TranscriptionInputDto } from './ai.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('transcriptions')
  processText(@Body() input: TranscriptionInputDto) {
    return this.aiService.processText(
      input.text,
      input.source,
      input.translation,
      input.persist !== false,
    );
  }

  @Post('audio')
  processAudio(@Body() input: AudioInputDto) {
    return this.aiService.processAudio(input.audioBase64);
  }

  @Get('scripture-detections')
  listDetections(@Query('limit') limit?: string) {
    return this.aiService.listDetections(limit ? Number(limit) : 25);
  }

  @Get('scripture-detections/latest')
  getLatestDetection() {
    return this.aiService.getLatestDetection();
  }
}
