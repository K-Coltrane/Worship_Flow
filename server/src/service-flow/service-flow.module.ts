import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PresentationModule } from '../presentation/presentation.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ServiceFlowController } from './service-flow.controller';
import { ServiceFlowService } from './service-flow.service';

@Module({
  imports: [DatabaseModule, PresentationModule, RealtimeModule],
  controllers: [ServiceFlowController],
  providers: [ServiceFlowService],
})
export class ServiceFlowModule {}
