import { useEffect, useState, type ReactNode } from 'react';
import { useTheme } from 'next-themes';
import {
  ChevronLeft,
  ChevronRight,
  Monitor,
  Mic,
  Settings,
  BookOpen,
  Waves,
  Sun,
  Moon,
  Radio,
  Square,
} from 'lucide-react';

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-8 w-8 shrink-0 rounded bg-[#333]" aria-hidden />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-1.5 rounded transition-colors bg-[#333] hover:bg-[#444] text-[#ccc]"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

interface TopBarProps {
  onNext: () => void;
  onPrevious: () => void;
  onClear: () => void;
  onGoLive: () => void;
  onProjectScripture: () => void;
  onToggleAI: () => void;
  onToggleMic: () => void;
  isAIOpen: boolean;
  isMicActive: boolean;
  hasPreview: boolean;
}

export function TopBar({
  onNext,
  onPrevious,
  onClear,
  onGoLive,
  onProjectScripture,
  onToggleAI,
  onToggleMic,
  isAIOpen,
  isMicActive,
  hasPreview,
}: TopBarProps) {
  return (
    <div className="shrink-0 flex flex-col bg-[#252525] border-b border-[#3a3a3a]">
      <div className="h-6 flex items-center px-3 gap-4 text-[11px] text-[#999] border-b border-[#333]">
        <span className="hover:text-[#ccc] cursor-default">File</span>
        <span className="hover:text-[#ccc] cursor-default">Edit</span>
        <span className="hover:text-[#ccc] cursor-default">Live</span>
        <span className="hover:text-[#ccc] cursor-default">View</span>
        <span className="hover:text-[#ccc] cursor-default">Help</span>
        <span className="ml-auto text-[#666]">Lumina Presentation</span>
      </div>

      <div className="h-12 flex items-center justify-between px-3 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[#e0e0e0] font-bold text-sm mr-2 shrink-0">Lumina</span>

          <ToolbarButton onClick={onPrevious} title="Previous slide">
            <ChevronLeft size={16} />
            <span className="hidden md:inline">Previous</span>
          </ToolbarButton>
          <ToolbarButton onClick={onNext} title="Next slide">
            <span className="hidden md:inline">Next</span>
            <ChevronRight size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={onClear} title="Clear live (Esc)">
            <Square size={14} />
            <span className="hidden md:inline">Clear</span>
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onGoLive}
            disabled={!hasPreview}
            className={`px-4 py-1.5 rounded font-bold text-sm flex items-center gap-2 transition-colors ${
              hasPreview
                ? 'bg-red-700 hover:bg-red-600 text-white'
                : 'bg-[#333] text-[#666] cursor-not-allowed'
            }`}
            title="Go Live (Enter)"
          >
            <Radio size={16} />
            Go Live
          </button>

          <button
            type="button"
            onClick={onProjectScripture}
            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded text-sm font-medium flex items-center gap-1.5"
          >
            <BookOpen size={16} />
            <span className="hidden sm:inline">Scripture</span>
          </button>

          <div className="w-px h-7 bg-[#444] mx-0.5" />

          <button
            type="button"
            onClick={onToggleAI}
            className={`p-1.5 rounded transition-colors ${
              isAIOpen ? 'bg-purple-700 text-white' : 'bg-[#333] hover:bg-[#444] text-[#ccc]'
            }`}
            title="Toggle AI Panel (Ctrl+A)"
          >
            <Waves size={16} />
          </button>

          <button
            type="button"
            onClick={onToggleMic}
            className={`p-1.5 rounded transition-colors ${
              isMicActive ? 'bg-red-700 text-white' : 'bg-[#333] hover:bg-[#444] text-[#ccc]'
            }`}
            title="Toggle Microphone (Ctrl+M)"
          >
            <Mic size={16} />
          </button>

          <ThemeToggle />

          <button
            type="button"
            className="p-1.5 bg-[#333] hover:bg-[#444] text-[#ccc] rounded"
            title="Settings"
          >
            <Settings size={16} />
          </button>

          <button
            type="button"
            className="p-1.5 bg-[#333] hover:bg-[#444] text-[#ccc] rounded hidden lg:flex"
            title="Output monitor"
          >
            <Monitor size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="px-2.5 py-1.5 bg-[#333] hover:bg-[#444] text-[#ccc] rounded text-xs font-medium flex items-center gap-1 transition-colors"
    >
      {children}
    </button>
  );
}
