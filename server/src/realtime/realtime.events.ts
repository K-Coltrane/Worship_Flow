export const RealtimeEvents = {
  PreviewUpdated: 'preview_updated',
  LiveUpdated: 'live_updated',
  PresentationStateUpdated: 'presentation_state_updated',
  ServiceFlowUpdated: 'service_flow_updated',
  TranscriptionUpdate: 'transcription_update',
  ScriptureDetected: 'scripture_detected',
} as const;

export type RealtimeEventName = (typeof RealtimeEvents)[keyof typeof RealtimeEvents];
