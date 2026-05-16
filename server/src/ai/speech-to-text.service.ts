import { Injectable, Logger } from '@nestjs/common';

export interface TranscriptionResult {
  text: string;
  engine: 'whisper' | 'vosk' | 'manual' | 'unavailable';
  confidence: number;
}

@Injectable()
export class SpeechToTextService {
  private readonly logger = new Logger(SpeechToTextService.name);

  async transcribeAudio(audioBase64: string): Promise<TranscriptionResult> {
    try {
      return await this.transcribeWithWhisper(audioBase64);
    } catch (whisperError) {
      this.logger.warn(`Whisper transcription failed: ${String(whisperError)}`);
    }

    try {
      return await this.transcribeWithVosk(audioBase64);
    } catch (voskError) {
      this.logger.warn(`Vosk transcription failed: ${String(voskError)}`);
      return {
        text: '',
        engine: 'unavailable',
        confidence: 0,
      };
    }
  }

  fromText(text: string): TranscriptionResult {
    return {
      text,
      engine: 'manual',
      confidence: 1,
    };
  }

  private async transcribeWithWhisper(_audioBase64: string): Promise<TranscriptionResult> {
    if (!process.env.WHISPER_API_KEY) {
      throw new Error('WHISPER_API_KEY is not configured');
    }

    // The backend contract is ready for an online Whisper provider; keeping this
    // adapter isolated ensures transcription outages cannot affect presentation.
    throw new Error('Whisper provider adapter is not configured');
  }

  private async transcribeWithVosk(_audioBase64: string): Promise<TranscriptionResult> {
    if (!process.env.VOSK_MODEL_PATH) {
      throw new Error('VOSK_MODEL_PATH is not configured');
    }

    throw new Error('Vosk provider adapter is not configured');
  }
}
