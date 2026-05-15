import { useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function KeyboardHints() {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    { key: 'Space / →', action: 'Next slide' },
    { key: '←', action: 'Previous slide' },
    { key: 'Enter', action: 'Go Live' },
    { key: 'Esc', action: 'Clear Live' },
    { key: 'Ctrl + P', action: 'Project Scripture' },
    { key: 'Ctrl + A', action: 'Toggle AI Panel' },
    { key: 'Ctrl + M', action: 'Toggle Microphone' },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-lg border border-zinc-700 transition-colors z-50"
        title="Keyboard Shortcuts"
      >
        <Keyboard size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 w-96 max-w-[90vw]"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Keyboard size={20} className="text-blue-400" />
                  <h3 className="text-white font-semibold">Keyboard Shortcuts</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-zinc-800 rounded transition-colors"
                >
                  <X size={18} className="text-zinc-400" />
                </button>
              </div>
              <div className="p-4 space-y-2">
                {shortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                  >
                    <span className="text-zinc-300">{shortcut.action}</span>
                    <kbd className="px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded text-sm font-mono text-white">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-zinc-800 text-center text-zinc-500 text-sm">
                Press <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs">?</kbd> anytime to toggle this menu
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
