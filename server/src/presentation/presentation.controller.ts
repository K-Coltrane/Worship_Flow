import { Body, Controller, Get, Post } from '@nestjs/common';
import { ProjectScriptureDto, SetPreviewDto } from './presentation.dto';
import { PresentationService } from './presentation.service';

@Controller('presentation')
export class PresentationController {
  constructor(private readonly presentationService: PresentationService) {}

  @Get('state')
  getState() {
    return this.presentationService.getState();
  }

  @Post('preview')
  setPreview(@Body() input: SetPreviewDto) {
    return this.presentationService.setPreview(input.item);
  }

  @Post('go-live')
  goLive() {
    return this.presentationService.goLive();
  }

  @Post('clear-live')
  clearLive() {
    return this.presentationService.clearLive();
  }

  @Post('project-scripture')
  projectScripture(@Body() input: ProjectScriptureDto) {
    return this.presentationService.projectScripture(input.reference, input.translation);
  }
}
