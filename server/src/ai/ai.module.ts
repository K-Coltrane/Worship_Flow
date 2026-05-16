import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ScriptureModule } from '../scripture/scripture.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { SpeechToTextService } from './speech-to-text.service';

@Module({
  imports: [DatabaseModule, RealtimeModule, ScriptureModule],
  controllers: [AiController],
  providers: [AiService, SpeechToTextService],
  exports: [AiService],
})
export class AiModule {}
