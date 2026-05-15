import { ChevronLeft, ChevronRight, Monitor, Mic, Settings, BookOpen, Waves } from 'lucide-react';

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
  isMicActive
}: TopBarProps) {
  return (
    <div className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold text-white mr-4">Worship Pro</h1>

        <button
          onClick={onPrevious}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <ChevronLeft size={20} />
          Previous
        </button>

        <button
          onClick={onNext}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          Next
          <ChevronRight size={20} />
        </button>

        <button
          onClick={onClear}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <Monitor size={20} />
          Clear
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onProjectScripture}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold flex items-center gap-2"
        >
          <BookOpen size={20} />
          Project Scripture
        </button>

        <div className="w-px h-8 bg-zinc-700 mx-2" />

        <button
          onClick={onToggleAI}
          className={`p-2 rounded-lg transition-colors ${
            isAIOpen ? 'bg-purple-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
          }`}
          title="Toggle AI Panel"
        >
          <Waves size={20} />
        </button>

        <button
          onClick={onToggleMic}
          className={`p-2 rounded-lg transition-colors ${
            isMicActive ? 'bg-red-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
          }`}
          title="Toggle Microphone"
        >
          <Mic size={20} />
        </button>

        <button
          className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
}
