import { useEffect, useState } from 'react';
import { ChevronRight, BookOpen, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { backendApi, DetectedScripture, TranslationInfo } from '../lib/backend';
import type { SpeechRecognitionStatus } from '../hooks/useSpeechRecognition';

interface RightPanelProps {
  isOpen: boolean;
  isMicActive: boolean;
  micStatus: SpeechRecognitionStatus;
  interimTranscript: string;
  preferredTranslation: string;
  onTranslationChange: (translation: string) => void;
  transcriptLines: string[];
  detectedScriptures: DetectedScripture[];
  onScriptureToPreview: (scripture: DetectedScripture) => void;
}

function micStatusMessage(
  isMicActive: boolean,
  micStatus: SpeechRecognitionStatus,
): string {
  if (!isMicActive) {
    return 'Microphone inactive — click the mic in the top bar to listen.';
  }
  switch (micStatus) {
    case 'listening':
      return 'Listening… speak naturally (e.g. “turn to John chapter 3 verse 16”).';
    case 'unsupported':
      return 'Speech recognition is not supported in this browser. Use Chrome or Edge.';
    case 'denied':
      return 'Microphone permission denied. Allow mic access in browser settings.';
    case 'error':
      return 'Speech recognition error. Try toggling the mic off and on.';
    default:
      return 'Starting microphone…';
  }
}

export function RightPanel({
  isOpen,
  isMicActive,
  micStatus,
  interimTranscript,
  preferredTranslation,
  onTranslationChange,
  transcriptLines,
  detectedScriptures,
  onScriptureToPreview,
}: RightPanelProps) {
  const [translations, setTranslations] = useState<TranslationInfo[]>([]);

  useEffect(() => {
    backendApi.listTranslations().then(setTranslations).catch(console.error);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 360, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-card border-l border-border flex flex-col overflow-hidden min-h-0 min-w-0"
        >
          <motion.div className="p-4 border-b border-border shrink-0">
            <motion.div className="flex items-center gap-2 mb-2">
              <motion.div
                className={`w-3 h-3 rounded-full ${isMicActive && micStatus === 'listening' ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground'}`}
              />
              <h2 className="text-foreground font-semibold">AI Assistant</h2>
            </motion.div>
            <p className="text-muted-foreground text-sm">{micStatusMessage(isMicActive, micStatus)}</p>
          <div className="mt-3 space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Project scriptures in
          </label>
          <select
            value={preferredTranslation}
            onChange={(e) => onTranslationChange(e.target.value)}
            className="w-full py-2 px-3 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(translations.length > 0
              ? translations
              : [{ code: 'KJV', label: 'King James Version', language: 'English', verseCount: 0 }]
            ).map((t) => (
              <option key={t.code} value={t.code}>
                {t.language} — {t.label}
              </option>
            ))}
          </select>
        </div>
          </motion.div>

          <motion.div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <motion.div className="flex-1 overflow-y-auto min-h-0 p-4 border-b border-border">
              <motion.div className="flex items-center gap-2 mb-3">
                <Mic size={16} className="text-muted-foreground" />
                <h3 className="text-foreground font-semibold text-sm">Live Transcription</h3>
              </motion.div>
              <motion.div className="space-y-2 text-sm">
                {transcriptLines.length === 0 && !interimTranscript ? (
                  <p className="text-muted-foreground italic">Waiting for speech...</p>
                ) : (
                  <>
                    {transcriptLines.map((line, i) => (
                      <motion.p
                        key={`${i}-${line.slice(0, 12)}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-foreground/90 leading-relaxed"
                      >
                        {line}
                      </motion.p>
                    ))}
                    {interimTranscript && (
                      <p className="text-muted-foreground italic leading-relaxed">{interimTranscript}…</p>
                    )}
                  </>
                )}
              </motion.div>
            </motion.div>

            <motion.div className="flex-1 overflow-y-auto min-h-0 p-4">
              <motion.div className="flex items-center justify-between mb-3 gap-2">
                <motion.div className="flex items-center gap-2 min-w-0">
                  <BookOpen size={16} className="text-muted-foreground shrink-0" />
                  <h3 className="text-foreground font-semibold text-sm truncate">Detected Scriptures</h3>
                </motion.div>
                <button
                  type="button"
                  onClick={() =>
                    detectedScriptures.length > 0 && onScriptureToPreview(detectedScriptures[0])
                  }
                  disabled={detectedScriptures.length === 0}
                  className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-white text-xs font-semibold rounded transition-colors shrink-0"
                  title="Load latest to preview"
                >
                  Preview Latest
                </button>
              </motion.div>
              <motion.div className="space-y-2">
                {detectedScriptures.length === 0 ? (
                  <p className="text-muted-foreground text-sm italic">
                    Speak a reference (e.g. John 3:16) or quote a verse — matches are checked
                    against every imported Bible translation.
                  </p>
                ) : (
                  detectedScriptures.map((scripture) => (
                    <motion.div
                      key={scripture.id}
                      className="p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors group cursor-pointer"
                      onClick={() => onScriptureToPreview(scripture)}
                    >
                      <motion.div className="flex items-start justify-between gap-2">
                        <motion.div className="flex-1 min-w-0">
                          <motion.div className="text-foreground font-medium mb-1">{scripture.reference}</motion.div>
                          <motion.div className="text-muted-foreground text-xs">
                            {scripture.timestamp} • Click to preview ({preferredTranslation})
                          </motion.div>
                        </motion.div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onScriptureToPreview(scripture);
                          }}
                          className="p-1.5 bg-yellow-600 hover:bg-yellow-700 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          title="Load to preview"
                        >
                          <ChevronRight size={14} className="text-white" />
                        </button>
                      </motion.div>
                      <motion.div className="mt-2 flex items-center gap-1">
                        <motion.div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${scripture.confidence * 100}%` }}
                          />
                        </motion.div>
                        <span className="text-muted-foreground text-xs">
                          {Math.round(scripture.confidence * 100)}%
                        </span>
                      </motion.div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
