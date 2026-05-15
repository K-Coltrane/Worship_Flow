import { useState } from 'react';
import { Monitor, ArrowDown, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface CenterPanelProps {
  previewSlide: any;
  liveSlide: any;
  onGoLive: () => void;
}

export function CenterPanel({ previewSlide, liveSlide, onGoLive }: CenterPanelProps) {
  const [justWentLive, setJustWentLive] = useState(false);

  const handleGoLive = () => {
    onGoLive();
    setJustWentLive(true);
    setTimeout(() => setJustWentLive(false), 1500);
  };
  return (
    <div className="flex-1 flex flex-col gap-3 p-4 min-h-0 min-w-0">
      {/* PREVIEW on top */}
      <div className="flex-1 min-h-0 bg-card rounded-lg border border-border overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border flex items-center gap-2 shrink-0">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-foreground font-semibold">PREVIEW</span>
          <span className="text-muted-foreground text-sm ml-2">Review before going live</span>
          {previewSlide && (
            <span className="text-muted-foreground text-xs ml-auto">
              Press Enter or click GO LIVE ↓
            </span>
          )}
        </div>
        <div className="flex-1 min-h-0 bg-muted flex items-center justify-center p-8">
          {previewSlide ? (
            <div className="text-center">
              <h2 className="text-4xl text-foreground font-bold mb-4">{previewSlide.title}</h2>
              {previewSlide.content && (
                <p className="text-2xl text-foreground/90 leading-relaxed whitespace-pre-line">
                  {previewSlide.content}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="text-muted-foreground text-xl mb-2">No preview</div>
              <div className="text-muted-foreground/80 text-sm">Select an item to preview</div>
            </div>
          )}
        </div>
      </div>

      {/* GO LIVE button */}
      <motion.button
        onClick={handleGoLive}
        disabled={!previewSlide}
        whileTap={{ scale: 0.98 }}
        className={`h-14 shrink-0 rounded-lg transition-all shadow-lg flex items-center justify-center gap-3 group ${
          justWentLive
            ? 'bg-gradient-to-r from-blue-600 to-blue-700'
            : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 hover:shadow-green-500/50'
        } ${
          !previewSlide ? 'from-muted to-muted cursor-not-allowed shadow-none' : ''
        } text-white font-bold`}
      >
        {justWentLive ? (
          <>
            <Check size={20} />
            <span className="text-lg">LIVE UPDATED</span>
            <Check size={20} />
          </>
        ) : (
          <>
            <ArrowDown size={20} className="group-hover:translate-y-0.5 transition-transform" />
            <span className="text-lg">GO LIVE</span>
            <ArrowDown size={20} className="group-hover:translate-y-0.5 transition-transform" />
          </>
        )}
      </motion.button>

      {/* LIVE on bottom */}
      <div className="flex-1 min-h-0 bg-card rounded-lg border-2 border-red-500/50 shadow-lg shadow-red-500/20 overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border flex items-center gap-2 bg-red-500/10 shrink-0">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50"></div>
          <span className="text-foreground font-bold">LIVE</span>
          <span className="text-red-600 dark:text-red-400 text-sm ml-2">Now showing on screen</span>
          <Monitor size={16} className="ml-auto text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1 min-h-0 bg-background flex items-center justify-center p-8">
          {liveSlide ? (
            <div className="text-center">
              <h2 className="text-4xl text-foreground font-bold mb-4">{liveSlide.title}</h2>
              {liveSlide.content && (
                <p className="text-2xl text-foreground/90 leading-relaxed whitespace-pre-line">
                  {liveSlide.content}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="text-muted-foreground text-xl mb-2">Nothing live</div>
              <div className="text-muted-foreground/80 text-sm">Preview and go live to display</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
