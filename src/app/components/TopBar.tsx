import { useEffect, useState } from 'react';
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
} from 'lucide-react';

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-10 w-10 shrink-0 rounded-lg bg-secondary" aria-hidden />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-lg transition-colors bg-secondary hover:bg-secondary/80 text-secondary-foreground"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

interface TopBarProps {
  onNext: () => void;
  onPrevious: () => void;
  onClear: () => void;
  onProjectScripture: () => void;
  onToggleAI: () => void;
  onToggleMic: () => void;
  isAIOpen: boolean;
  isMicActive: boolean;
}

export function TopBar({
  onNext,
  onPrevious,
  onClear,
  onProjectScripture,
  onToggleAI,
  onToggleMic,
  isAIOpen,
  isMicActive,
}: TopBarProps) {
  return (
    <div className="h-16 shrink-0 bg-card border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-xl font-semibold text-foreground mr-2 sm:mr-4 shrink-0">Lumina</h1>

        <button
          onClick={onPrevious}
          className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors flex items-center gap-2"
        >
          <ChevronLeft size={20} />
          Previous
        </button>

        <button
          onClick={onNext}
          className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors flex items-center gap-2"
        >
          Next
          <ChevronRight size={20} />
        </button>

        <button
          onClick={onClear}
          className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors flex items-center gap-2"
        >
          <Monitor size={20} />
          Clear
        </button>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onProjectScripture}
          className="px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold flex items-center gap-2"
        >
          <BookOpen size={20} />
          <span className="hidden sm:inline">Project Scripture</span>
        </button>

        <div className="w-px h-8 bg-border mx-1 sm:mx-2" />

        <button
          onClick={onToggleAI}
          className={`p-2 rounded-lg transition-colors ${
            isAIOpen ? 'bg-purple-600 text-white' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
          }`}
          title="Toggle AI Panel"
        >
          <Waves size={20} />
        </button>

        <button
          onClick={onToggleMic}
          className={`p-2 rounded-lg transition-colors ${
            isMicActive ? 'bg-red-600 text-white' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
          }`}
          title="Toggle Microphone"
        >
          <Mic size={20} />
        </button>

        <ThemeToggle />

        <button
          className="p-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors"
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
}
