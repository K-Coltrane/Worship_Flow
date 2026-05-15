export function QuickHints() {
  return (
    <div className="shrink-0 w-full min-w-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 py-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-foreground">
          Space
        </kbd>
        <span>Next</span>
      </div>
      <div className="w-px h-3 bg-border"></div>
      <div className="flex items-center gap-1.5">
        <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-foreground">
          Enter
        </kbd>
        <span>Go Live</span>
      </div>
      <div className="w-px h-3 bg-border"></div>
      <div className="flex items-center gap-1.5">
        <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-foreground">
          Esc
        </kbd>
        <span>Clear</span>
      </div>
      <div className="w-px h-3 bg-border"></div>
      <div className="flex items-center gap-1.5">
        <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-foreground">
          Ctrl
        </kbd>
        <span>+</span>
        <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-foreground">
          P
        </kbd>
        <span>Project Scripture</span>
      </div>
    </div>
  );
}
