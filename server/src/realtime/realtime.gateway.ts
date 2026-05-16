import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RealtimeEvents } from './realtime.events';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  private server?: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  afterInit(): void {
    this.logger.log('Realtime gateway ready');
  }

  handleConnection(client: Socket): void {
    client.emit('connected', {
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent(RealtimeEvents.PreviewUpdated)
  onPreviewUpdated(payload: unknown): void {
    this.emit(RealtimeEvents.PreviewUpdated, payload);
  }

  @OnEvent(RealtimeEvents.LiveUpdated)
  onLiveUpdated(payload: unknown): void {
    this.emit(RealtimeEvents.LiveUpdated, payload);
  }

  @OnEvent(RealtimeEvents.PresentationStateUpdated)
  onPresentationStateUpdated(payload: unknown): void {
    this.emit(RealtimeEvents.PresentationStateUpdated, payload);
  }

  @OnEvent(RealtimeEvents.ServiceFlowUpdated)
  onServiceFlowUpdated(payload: unknown): void {
    this.emit(RealtimeEvents.ServiceFlowUpdated, payload);
  }

  @OnEvent(RealtimeEvents.TranscriptionUpdate)
  onTranscriptionUpdate(payload: unknown): void {
    this.emit(RealtimeEvents.TranscriptionUpdate, payload);
  }

  @OnEvent(RealtimeEvents.ScriptureDetected)
  onScriptureDetected(payload: unknown): void {
    this.emit(RealtimeEvents.ScriptureDetected, payload);
  }

  private emit(event: string, payload: unknown): void {
    this.server?.emit(event, payload);
  }
}
