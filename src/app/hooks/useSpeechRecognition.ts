import { useEffect, useRef, useState } from 'react';

export type SpeechRecognitionStatus = 'idle' | 'listening' | 'unsupported' | 'denied' | 'error';

interface UseSpeechRecognitionOptions {
  enabled: boolean;
  onFinalTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  /** Called whenever speech changes — full session text (finalized + current interim). */
  onLiveTranscript?: (fullText: string, interimOnly: string) => void;
  /** Fires as soon as the browser detects voice (before full words are recognized). */
  onSpeechStart?: () => void;
}

export function useSpeechRecognition({
  enabled,
  onFinalTranscript,
  onInterimTranscript,
  onLiveTranscript,
  onSpeechStart,
}: UseSpeechRecognitionOptions) {
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const callbacksRef = useRef({
    onFinalTranscript,
    onInterimTranscript,
    onLiveTranscript,
    onSpeechStart,
  });
  const finalizedRef = useRef('');

  callbacksRef.current = {
    onFinalTranscript,
    onInterimTranscript,
    onLiveTranscript,
    onSpeechStart,
  };

  useEffect(() => {
    if (!enabled) {
      finalizedRef.current = '';
    }
  }, [enabled]);

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

    finalizedRef.current = '';

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setStatus('listening');

    recognition.onspeechstart = () => {
      callbacksRef.current.onSpeechStart?.();
    };

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

      const interimTrimmed = interim.trim();
      if (finalText.trim()) {
        finalizedRef.current = `${finalizedRef.current} ${finalText}`.replace(/\s+/g, ' ').trim();
      }

      const fullText = [finalizedRef.current, interimTrimmed].filter(Boolean).join(' ').trim();

      if (interimTrimmed) {
        callbacksRef.current.onInterimTranscript?.(interimTrimmed);
        callbacksRef.current.onLiveTranscript?.(fullText || interimTrimmed, interimTrimmed);
      } else if (fullText) {
        callbacksRef.current.onLiveTranscript?.(fullText, '');
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
