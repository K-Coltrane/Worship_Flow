import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RealtimeEventName } from './realtime.events';

@Injectable()
export class RealtimeService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  emit<TPayload>(event: RealtimeEventName, payload: TPayload): void {
    this.eventEmitter.emit(event, payload);
  }
}
