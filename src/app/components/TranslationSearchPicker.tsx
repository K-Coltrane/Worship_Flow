import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { TranslationInfo } from '../lib/backend';

const FALLBACK_TRANSLATIONS: TranslationInfo[] = [
  { code: 'MSG', label: 'The Message', language: 'English', verseCount: 0 },
  { code: 'AMP', label: 'Amplified Bible', language: 'English', verseCount: 0 },
  { code: 'NLT', label: 'New Living Translation', language: 'English', verseCount: 0 },
];

interface TranslationSearchPickerProps {
  translations: TranslationInfo[];
  value: string;
  onChange: (code: string) => void;
  label?: string;
  showImportHint?: boolean;
  className?: string;
  tone?: 'default' | 'toolbar';
}

function sortTranslations(list: TranslationInfo[]): TranslationInfo[] {
  return [...list].sort((a, b) => {
    const priority = ['MSG', 'AMP', 'AMPC', 'NLT', 'NIV', 'ESV'];
    const aRank = priority.indexOf(a.code);
    const bRank = priority.indexOf(b.code);
    if (aRank !== -1 || bRank !== -1) {
      return (aRank === -1 ? 99 : aRank) - (bRank === -1 ? 99 : bRank);
    }
    if (a.verseCount > 0 && b.verseCount === 0) return -1;
    if (b.verseCount > 0 && a.verseCount === 0) return 1;
    return a.label.localeCompare(b.label);
  });
}

export function TranslationSearchPicker({
  translations,
  value,
  onChange,
  label = 'Translation',
  showImportHint = false,
  className = '',
  tone = 'default',
}: TranslationSearchPickerProps) {
  const isToolbar = tone === 'toolbar';
  const inputClass = isToolbar
    ? 'bg-[#2a2a2a] border-[#444] text-[#e0e0e0] placeholder:text-[#666]'
    : 'bg-muted border-border text-foreground placeholder:text-muted-foreground';
  const listClass = isToolbar
    ? 'border-[#444] bg-[#252525]'
    : 'border-border bg-card';
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const catalog = useMemo(
    () => sortTranslations(translations.length > 0 ? translations : FALLBACK_TRANSLATIONS),
    [translations],
  );

  const selected = catalog.find((t) => t.code === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return catalog;
    }
    return catalog.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.language.toLowerCase().includes(q),
    );
  }, [catalog, query]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, open]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const pickTranslation = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (!open) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && filtered[highlightIndex]) {
      event.preventDefault();
      pickTranslation(filtered[highlightIndex].code);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={containerRef} className={`relative min-w-0 ${label ? 'space-y-1' : ''} ${className}`}>
      {label && (
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          size={16}
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          placeholder={isToolbar ? 'Translation…' : 'Type to search translations…'}
          value={open ? query : selected?.label ?? value}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onKeyDown={handleKeyDown}
          className={`w-full pl-9 py-2 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${inputClass} ${
            selected && !open ? 'pr-14' : 'pr-3'
          }`}
        />
        {selected && !open && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted-foreground">
            {selected.code}
          </span>
        )}
      </div>

      {open && (
        <ul
          role="listbox"
          className={`absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg border shadow-lg py-1 ${listClass}`}
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">No matching translations</li>
          ) : (
            filtered.map((translation, index) => (
              <li key={translation.code} role="option" aria-selected={translation.code === value}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => pickTranslation(translation.code)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    index === highlightIndex || translation.code === value
                      ? 'bg-blue-600/15 text-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <div className="font-medium truncate">{translation.label}</div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{translation.code}</span>
                    <span>
                      {translation.verseCount > 0
                        ? `${(translation.verseCount / 1000).toFixed(0)}k verses`
                        : 'Importing…'}
                    </span>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {showImportHint && selected && selected.verseCount === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          This translation is still downloading. Run{' '}
          <code className="text-[11px]">npm run scripture:seed:popular</code>.
        </p>
      )}
    </div>
  );
}
