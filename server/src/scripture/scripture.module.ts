import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ScriptureController } from './scripture.controller';
import { ScriptureImportService } from './scripture-import.service';
import { ScriptureService } from './scripture.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ScriptureController],
  providers: [ScriptureService, ScriptureImportService],
  exports: [ScriptureService],
})
export class ScriptureModule {}
