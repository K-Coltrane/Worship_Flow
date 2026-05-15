export function QuickHints() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-sm border-t border-zinc-800 px-4 py-2 flex items-center justify-center gap-6 text-xs text-zinc-400 z-40">
      <div className="flex items-center gap-1.5">
        <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300">Space</kbd>
        <span>Next</span>
      </div>
      <div className="w-px h-3 bg-zinc-700"></div>
      <div className="flex items-center gap-1.5">
        <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300">Enter</kbd>
        <span>Go Live</span>
      </div>
      <div className="w-px h-3 bg-zinc-700"></div>
      <div className="flex items-center gap-1.5">
        <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300">Esc</kbd>
        <span>Clear</span>
      </div>
      <div className="w-px h-3 bg-zinc-700"></div>
      <div className="flex items-center gap-1.5">
        <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300">Ctrl</kbd>
        <span>+</span>
        <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300">P</kbd>
        <span>Project Scripture</span>
      </div>
    </div>
  );
}
