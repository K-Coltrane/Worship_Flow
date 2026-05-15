import { useState, useEffect } from 'react';
import { ChevronRight, BookOpen, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DetectedScripture {
  id: string;
  reference: string;
  timestamp: string;
  confidence: number;
}

interface RightPanelProps {
  isOpen: boolean;
  isMicActive: boolean;
  onScriptureToPreview: (scripture: DetectedScripture) => void;
}

const mockTranscription = [
  'And the Lord says in John chapter 3 verse 16...',
  'For God so loved the world that he gave his one and only Son...',
  'Turn with me to Psalm 23...',
  'The Lord is my shepherd, I shall not want...',
  'As it says in Romans 8:28...',
];

export function RightPanel({ isOpen, isMicActive, onScriptureToPreview }: RightPanelProps) {
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [detectedScriptures] = useState<DetectedScripture[]>([
    { id: '1', reference: 'John 3:16', timestamp: '10:23 AM', confidence: 0.95 },
    { id: '2', reference: 'Psalm 23:1-6', timestamp: '10:24 AM', confidence: 0.92 },
    { id: '3', reference: 'Romans 8:28', timestamp: '10:26 AM', confidence: 0.88 },
  ]);

  useEffect(() => {
    if (isMicActive && transcriptLines.length < mockTranscription.length) {
      const timer = setTimeout(() => {
        setTranscriptLines((prev) => [...prev, mockTranscription[prev.length]]);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isMicActive, transcriptLines.length]);

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
          <div className="p-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-3 h-3 rounded-full ${isMicActive ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground'}`}
              ></div>
              <h2 className="text-foreground font-semibold">AI Assistant</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              {isMicActive ? 'Listening and detecting scriptures...' : 'Microphone inactive'}
            </p>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto min-h-0 p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-3">
                <Mic size={16} className="text-muted-foreground" />
                <h3 className="text-foreground font-semibold text-sm">Live Transcription</h3>
              </div>
              <div className="space-y-2 text-sm">
                {transcriptLines.length === 0 ? (
                  <p className="text-muted-foreground italic">Waiting for speech...</p>
                ) : (
                  transcriptLines.map((line, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-foreground/90 leading-relaxed"
                    >
                      {line}
                    </motion.p>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-4">
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen size={16} className="text-muted-foreground shrink-0" />
                  <h3 className="text-foreground font-semibold text-sm truncate">Detected Scriptures</h3>
                </div>
                <button
                  onClick={() =>
                    detectedScriptures.length > 0 && onScriptureToPreview(detectedScriptures[0])
                  }
                  disabled={detectedScriptures.length === 0}
                  className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-white text-xs font-semibold rounded transition-colors shrink-0"
                  title="Load latest to preview"
                >
                  Preview Latest
                </button>
              </div>
              <div className="space-y-2">
                {detectedScriptures.map((scripture) => (
                  <div
                    key={scripture.id}
                    className="p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors group cursor-pointer"
                    onClick={() => onScriptureToPreview(scripture)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-foreground font-medium mb-1">{scripture.reference}</div>
                        <div className="text-muted-foreground text-xs">
                          {scripture.timestamp} • Click to preview
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onScriptureToPreview(scripture);
                        }}
                        className="p-1.5 bg-yellow-600 hover:bg-yellow-700 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        title="Load to preview"
                      >
                        <ChevronRight size={14} className="text-white" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${scripture.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {Math.round(scripture.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
