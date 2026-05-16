import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ScriptureModule } from '../scripture/scripture.module';
import { PresentationController } from './presentation.controller';
import { PresentationService } from './presentation.service';

@Module({
  imports: [DatabaseModule, RealtimeModule, ScriptureModule],
  controllers: [PresentationController],
  providers: [PresentationService],
  exports: [PresentationService],
})
export class PresentationModule {}
