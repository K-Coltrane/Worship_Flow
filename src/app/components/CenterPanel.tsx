import { useState, type ReactNode } from 'react';
import { ArrowRight, Check, Monitor } from 'lucide-react';
import { motion } from 'motion/react';
import { SlideContent } from './SlideContent';

interface CenterPanelProps {
  previewSlide: any;
  liveSlide: any;
  onGoLive: () => void;
}

function OutputStrip({
  label,
  slide,
  emptyMessage,
}: {
  label: string;
  slide: any;
  emptyMessage: string;
}) {
  return (
    <div className="h-[130px] shrink-0 flex flex-col border-t border-[#3a3a3a] bg-[#252525]">
      <div className="h-6 shrink-0 flex items-center px-2 border-b border-[#3a3a3a]/60">
        <span className="text-[11px] font-semibold text-[#aaa] tracking-wide">{label}</span>
      </div>
      <div className="flex-1 flex items-center gap-3 px-3 min-h-0">
        <div className="w-28 h-[72px] shrink-0 bg-black border border-[#444] rounded overflow-hidden flex items-center justify-center">
          {slide ? (
            <div className="w-full h-full flex items-center justify-center p-1 scale-[0.35] origin-center pointer-events-none">
              <SlideContent slide={slide} className="!text-xs" />
            </div>
          ) : (
            <div className="w-full h-full bg-black" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {slide ? (
            <>
              <p className="text-sm text-[#e0e0e0] font-medium truncate">{slide.title}</p>
              <p className="text-xs text-[#888] mt-0.5">Slide 1 of 1</p>
            </>
          ) : (
            <p className="text-xs text-[#666] italic">{emptyMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkspaceColumn({
  title,
  dotColor,
  slide,
  outputLabel,
  emptyMain,
  emptyOutput,
  headerExtra,
}: {
  title: string;
  dotColor: string;
  slide: any;
  outputLabel: string;
  emptyMain: string;
  emptyOutput: string;
  headerExtra?: ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-[#3a3a3a] last:border-r-0">
      <div className="h-7 shrink-0 flex items-center gap-2 px-2 border-b border-[#3a3a3a] bg-[#252525]">
        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-xs font-semibold text-[#c8c8c8]">{title}</span>
        {headerExtra}
      </div>
      <div className="flex-1 min-h-0 bg-black flex items-center justify-center p-4 overflow-hidden">
        {slide ? (
          <SlideContent slide={slide} />
        ) : (
          <p className="text-[#555] text-sm">{emptyMain}</p>
        )}
      </div>
      <OutputStrip label={outputLabel} slide={slide} emptyMessage={emptyOutput} />
    </div>
  );
}

export function CenterPanel({ previewSlide, liveSlide, onGoLive }: CenterPanelProps) {
  const [justWentLive, setJustWentLive] = useState(false);

  const handleGoLive = () => {
    onGoLive();
    setJustWentLive(true);
    setTimeout(() => setJustWentLive(false), 1500);
  };

  return (
    <div className="flex-1 flex min-h-0 min-w-0 bg-[#1a1a1a]">
      <WorkspaceColumn
        title="Preview"
        dotColor="bg-amber-500"
        slide={previewSlide}
        outputLabel="Preview Output"
        emptyMain="Select an item to preview"
        emptyOutput="Nothing in preview"
      />

      <div className="w-11 shrink-0 flex flex-col items-center justify-center gap-2 bg-[#222] border-x border-[#3a3a3a]">
        <motion.button
          type="button"
          onClick={handleGoLive}
          disabled={!previewSlide}
          whileTap={{ scale: 0.95 }}
          title="Go Live (Enter)"
          className={`w-9 py-6 rounded flex flex-col items-center justify-center gap-1 transition-colors ${
            justWentLive
              ? 'bg-blue-600 text-white'
              : previewSlide
                ? 'bg-green-700 hover:bg-green-600 text-white'
                : 'bg-[#333] text-[#666] cursor-not-allowed'
          }`}
        >
          {justWentLive ? (
            <Check size={18} />
          ) : (
            <ArrowRight size={18} className="rotate-90" />
          )}
          <span
            className="text-[9px] font-bold"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            LIVE
          </span>
        </motion.button>
      </div>

      <WorkspaceColumn
        title="Live"
        dotColor="bg-red-500 animate-pulse"
        slide={liveSlide}
        outputLabel="Live Output"
        emptyMain="Nothing live"
        emptyOutput="Clear or go live to show output"
        headerExtra={
          <Monitor size={12} className="ml-auto text-red-500/80" />
        }
      />
    </div>
  );
}
