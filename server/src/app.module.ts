import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AiModule } from './ai/ai.module';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { PresentationModule } from './presentation/presentation.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ScriptureModule } from './scripture/scripture.module';
import { ServiceFlowModule } from './service-flow/service-flow.module';
import { SongsModule } from './songs/songs.module';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 50,
    }),
    DatabaseModule,
    RealtimeModule,
    SongsModule,
    ScriptureModule,
    PresentationModule,
    ServiceFlowModule,
    AiModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
