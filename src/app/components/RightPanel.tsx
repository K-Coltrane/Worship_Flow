import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Mic, X, Waves } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  backendApi,
  DetectedScripture,
  ScriptureMatchType,
  TranslationInfo,
} from '../lib/backend';
import { TranslationSearchPicker } from './TranslationSearchPicker';
import type { SpeechRecognitionStatus } from '../hooks/useSpeechRecognition';

interface RightPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  isMicActive: boolean;
  micStatus: SpeechRecognitionStatus;
  interimTranscript: string;
  preferredTranslation: string;
  onTranslationChange: (translation: string) => void;
  transcriptLines: string[];
  detectedScriptures: DetectedScripture[];
  onClearDetections: () => void;
  onScriptureToPreview: (scripture: DetectedScripture) => void;
}

function matchTypeLabel(type?: ScriptureMatchType): string {
  switch (type) {
    case 'reference':
      return 'Reference spoken';
    case 'quote':
      return 'Verse quoted';
    case 'keyword':
      return 'Keyword match';
    default:
      return 'Detected';
  }
}

function micStatusMessage(
  isMicActive: boolean,
  micStatus: SpeechRecognitionStatus,
): string {
  if (!isMicActive) {
    return 'Microphone inactive — click the mic in the toolbar to listen.';
  }
  switch (micStatus) {
    case 'listening':
      return 'Listening… scripture matching starts as soon as words appear.';
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
  onToggle,
  isMicActive,
  micStatus,
  interimTranscript,
  preferredTranslation,
  onTranslationChange,
  transcriptLines,
  detectedScriptures,
  onClearDetections,
  onScriptureToPreview,
}: RightPanelProps) {
  const [translations, setTranslations] = useState<TranslationInfo[]>([]);

  useEffect(() => {
    backendApi.listTranslations().then(setTranslations).catch(console.error);
  }, []);

  return (
    <div className="relative shrink-0 flex h-full min-h-0">
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.aside
            key="ai-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="h-full bg-[#1e1e1e] border-l border-[#3a3a3a] flex flex-col overflow-hidden min-h-0"
          >
            <div className="p-3 border-b border-[#3a3a3a] shrink-0 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${isMicActive && micStatus === 'listening' ? 'bg-red-500 animate-pulse' : 'bg-[#666]'}`}
                  />
                  <h2 className="text-[#e0e0e0] font-semibold text-sm">AI Transcription</h2>
                </div>
                <p className="text-[#888] text-xs leading-relaxed">
                  {micStatusMessage(isMicActive, micStatus)}
                </p>
                <div className="mt-2">
                  <TranslationSearchPicker
                    translations={translations}
                    value={preferredTranslation}
                    onChange={onTranslationChange}
                    label="Project scriptures in"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={onToggle}
                className="p-1.5 rounded text-[#888] hover:text-[#e0e0e0] hover:bg-[#333] shrink-0"
                title="Collapse AI panel (Ctrl+A)"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto min-h-0 p-3 border-b border-[#3a3a3a]">
                <div className="flex items-center gap-2 mb-2">
                  <Mic size={14} className="text-[#888]" />
                  <h3 className="text-[#ccc] font-semibold text-xs">Live Transcription</h3>
                </div>
                <div className="space-y-2 text-sm">
                  {transcriptLines.length === 0 && !interimTranscript ? (
                    <p className="text-[#666] italic text-xs">Waiting for speech...</p>
                  ) : (
                    <>
                      {transcriptLines.map((line, i) => (
                        <p key={`${i}-${line.slice(0, 12)}`} className="text-[#d0d0d0] text-xs leading-relaxed">
                          {line}
                        </p>
                      ))}
                      {interimTranscript && (
                        <p className="text-[#888] italic text-xs leading-relaxed">
                          {interimTranscript}…
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 p-3">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookOpen size={14} className="text-[#888] shrink-0" />
                    <h3 className="text-[#ccc] font-semibold text-xs truncate">Detected Scriptures</h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={onClearDetections}
                      disabled={detectedScriptures.length === 0}
                      className="px-2 py-1 border border-[#444] hover:bg-[#333] disabled:opacity-40 text-[#ccc] text-[10px] font-medium rounded flex items-center gap-1"
                    >
                      <X size={10} />
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        detectedScriptures.length > 0 && onScriptureToPreview(detectedScriptures[0])
                      }
                      disabled={detectedScriptures.length === 0}
                      className="px-2 py-1 bg-amber-700 hover:bg-amber-600 disabled:bg-[#333] disabled:text-[#666] text-white text-[10px] font-semibold rounded"
                    >
                      Preview
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {detectedScriptures.length === 0 ? (
                    <p className="text-[#666] text-xs italic leading-relaxed">
                      Speak a reference or quote — Lumina matches against imported translations.
                    </p>
                  ) : (
                    detectedScriptures.map((scripture) => (
                      <div
                        key={`${scripture.id}-${scripture.matchedTranslation ?? 'x'}`}
                        className="p-2.5 bg-[#2a2a2a] rounded hover:bg-[#333] transition-colors group cursor-pointer"
                        onClick={() => onScriptureToPreview(scripture)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-[#e0e0e0] font-medium text-xs mb-0.5">
                              {scripture.reference}
                            </div>
                            <div className="text-[#888] text-[10px] flex flex-wrap gap-x-1">
                              <span>{scripture.matchedTranslation ?? preferredTranslation}</span>
                              <span>•</span>
                              <span>{matchTypeLabel(scripture.matchType)}</span>
                            </div>
                            {scripture.verseText ? (
                              <p className="text-[#888] text-[10px] mt-1 line-clamp-2 leading-relaxed">
                                {scripture.verseText}
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onScriptureToPreview(scripture);
                            }}
                            className="p-1 bg-amber-700 hover:bg-amber-600 rounded opacity-0 group-hover:opacity-100 shrink-0"
                          >
                            <ChevronRight size={12} className="text-white" />
                          </button>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1">
                          <div className="flex-1 h-0.5 bg-[#444] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-600 rounded-full"
                              style={{ width: `${scripture.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-[#888] text-[10px]">
                            {Math.round(scripture.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {!isOpen && (
        <button
          type="button"
          onClick={onToggle}
          className="w-8 h-full flex flex-col items-center justify-center gap-2 bg-[#252525] border-l border-[#3a3a3a] hover:bg-[#2f2f2f] text-[#888] hover:text-[#ccc] transition-colors"
          title="Expand AI panel (Ctrl+A)"
        >
          <Waves size={16} className="text-purple-400" />
          <span
            className="text-[10px] font-semibold tracking-wider"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            AI
          </span>
          <ChevronLeft size={14} />
        </button>
      )}
    </div>
  );
}
