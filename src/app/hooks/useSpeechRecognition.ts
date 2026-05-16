import { useEffect, useRef, useState } from 'react';

export type SpeechRecognitionStatus = 'idle' | 'listening' | 'unsupported' | 'denied' | 'error';

interface UseSpeechRecognitionOptions {
  enabled: boolean;
  onFinalTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
}

export function useSpeechRecognition({
  enabled,
  onFinalTranscript,
  onInterimTranscript,
}: UseSpeechRecognitionOptions) {
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const callbacksRef = useRef({ onFinalTranscript, onInterimTranscript });

  callbacksRef.current = { onFinalTranscript, onInterimTranscript };

  useEffect(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setStatus('unsupported');
      return;
    }

    if (!enabled) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setStatus('idle');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setStatus('listening');

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let finalText = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript?.trim() ?? '';
        if (!transcript) {
          continue;
        }
        if (result.isFinal) {
          finalText += `${transcript} `;
        } else {
          interim += `${transcript} `;
        }
      }

      if (interim.trim()) {
        callbacksRef.current.onInterimTranscript?.(interim.trim());
      }

      if (finalText.trim()) {
        callbacksRef.current.onFinalTranscript(finalText.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setStatus('denied');
        return;
      }
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setStatus('error');
        console.error('Speech recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      if (enabled && recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch {
          setStatus('idle');
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error(error);
      setStatus('error');
    }

    return () => {
      recognitionRef.current = null;
      recognition.onend = null;
      recognition.stop();
      setStatus('idle');
    };
  }, [enabled]);

  return { status };
}
