import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Search } from 'lucide-react';
import {
  backendApi,
  ScriptureLibraryItem,
  TranslationInfo,
} from '../lib/backend';

type BrowseView = 'books' | 'chapters' | 'verses';

interface ScriptureBrowserProps {
  preferredTranslation: string;
  onTranslationChange: (translation: string) => void;
  onPreview: (verse: ScriptureLibraryItem) => void;
  onGoLive: (verse: ScriptureLibraryItem) => void;
}

export function ScriptureBrowser({
  preferredTranslation,
  onTranslationChange,
  onPreview,
  onGoLive,
}: ScriptureBrowserProps) {
  const [view, setView] = useState<BrowseView>('books');
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [translations, setTranslations] = useState<TranslationInfo[]>([]);
  const [books, setBooks] = useState<Awaited<ReturnType<typeof backendApi.listBibleBooks>>>([]);
  const [chapters, setChapters] = useState<number[]>([]);
  const [verses, setVerses] = useState<ScriptureLibraryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    backendApi.listTranslations().then(setTranslations).catch(console.error);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    backendApi
      .listBibleBooks(preferredTranslation)
      .then(setBooks)
      .catch((err) => {
        console.error(err);
        setError('Could not load books. Is the backend running?');
      })
      .finally(() => setIsLoading(false));
  }, [preferredTranslation]);

  const loadChapter = useCallback(
    async (book: string, chapter: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const results = await backendApi.getBibleChapter(book, chapter, preferredTranslation);
        setVerses(results);
        setView('verses');
      } catch (err) {
        console.error(err);
        setError(
          `Chapter not in library yet for ${preferredTranslation}. Run npm run scripture:seed or wait for import.`,
        );
      } finally {
        setIsLoading(false);
      }
    },
    [preferredTranslation],
  );

  const loadChapters = useCallback(
    async (book: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const results = await backendApi.listBibleChapters(book, preferredTranslation);
        setChapters(results);
        setSelectedBook(book);
        setSelectedChapter(null);
        setVerses([]);
        setView('chapters');
      } catch (err) {
        console.error(err);
        setError('Could not load chapters.');
      } finally {
        setIsLoading(false);
      }
    },
    [preferredTranslation],
  );

  const handleSearchSubmit = async () => {
    const query = searchQuery.trim();
    if (!query) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const results = await backendApi.searchScriptures(query, preferredTranslation);
      if (results.length === 0) {
        setError('No matching verses.');
        return;
      }
      const first = results[0];
      setSelectedBook(first.book);
      setSelectedChapter(first.chapter);
      setVerses(results.filter((v) => v.chapter === first.chapter && v.book === first.book));
      setView('verses');
    } catch (err) {
      console.error(err);
      setError('Search failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const goToBooks = () => {
    setView('books');
    setSelectedBook(null);
    setSelectedChapter(null);
    setVerses([]);
  };

  const goToChapters = () => {
    if (!selectedBook) {
      goToBooks();
      return;
    }
    setView('chapters');
    setSelectedChapter(null);
    setVerses([]);
  };

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || view !== 'books') {
      return books;
    }
    return books.filter((book) => book.name.toLowerCase().includes(q));
  }, [books, searchQuery, view]);

  const groupedBooks = useMemo(() => {
    return {
      ot: filteredBooks.filter((b) => b.testament === 'OT'),
      nt: filteredBooks.filter((b) => b.testament === 'NT'),
    };
  }, [filteredBooks]);

  const selectedTranslationMeta = translations.find((t) => t.code === preferredTranslation);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-3 border-b border-border shrink-0 space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Translation
        </label>
        <select
          value={preferredTranslation}
          onChange={(e) => {
            onTranslationChange(e.target.value);
            goToBooks();
          }}
          className="w-full py-2 px-3 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {(translations.length > 0
            ? translations
            : [{ code: 'KJV', label: 'King James Version', language: 'English', verseCount: 0 }]
          )
            .sort((a, b) => {
              if (a.language !== b.language) {
                return a.language.localeCompare(b.language);
              }
              if (a.verseCount > 0 && b.verseCount === 0) return -1;
              if (b.verseCount > 0 && a.verseCount === 0) return 1;
              return a.label.localeCompare(b.label);
            })
            .map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
                {t.verseCount > 0 ? ` (${(t.verseCount / 1000).toFixed(0)}k)` : ' — importing…'}
              </option>
            ))}
        </select>
        {selectedTranslationMeta && selectedTranslationMeta.verseCount === 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            This translation is still downloading. Try KJV or run{' '}
            <code className="text-[11px]">npm run scripture:seed</code>.
          </p>
        )}
      </div>

      <div className="px-3 py-2 border-b border-border shrink-0 flex items-center gap-1 text-sm min-w-0">
        {view !== 'books' && (
          <button
            type="button"
            onClick={view === 'verses' ? goToChapters : goToBooks}
            className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0"
            aria-label="Back"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <button
          type="button"
          onClick={goToBooks}
          className={`truncate hover:underline ${view === 'books' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
        >
          Bible
        </button>
        {selectedBook && (
          <>
            <span className="text-muted-foreground shrink-0">/</span>
            <button
              type="button"
              onClick={goToChapters}
              className={`truncate hover:underline max-w-[120px] ${view === 'chapters' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
            >
              {selectedBook}
            </button>
          </>
        )}
        {selectedChapter !== null && view === 'verses' && (
          <>
            <span className="text-muted-foreground shrink-0">/</span>
            <span className="text-foreground font-medium shrink-0">{selectedChapter}</span>
          </>
        )}
      </div>

      <div className="p-3 border-b border-border shrink-0">
        <div className="relative flex gap-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Jump: Genesis 1 or John 3:16…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            className="flex-1 pl-9 pr-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleSearchSubmit}
            className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium shrink-0"
          >
            Go
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading && (
          <p className="p-3 text-sm text-muted-foreground">Loading…</p>
        )}
        {error && <p className="p-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {view === 'books' && !isLoading && (
          <div className="p-2 space-y-4">
            <BookGrid
              title="Old Testament"
              books={groupedBooks.ot}
              onSelect={loadChapters}
            />
            <BookGrid
              title="New Testament"
              books={groupedBooks.nt}
              onSelect={loadChapters}
            />
          </div>
        )}

        {view === 'chapters' && selectedBook && !isLoading && (
          <div className="p-2 grid grid-cols-5 gap-1.5">
            {chapters.map((chapter) => (
              <button
                key={chapter}
                type="button"
                onClick={() => {
                  setSelectedChapter(chapter);
                  loadChapter(selectedBook, chapter);
                }}
                className="py-2.5 rounded-lg bg-muted hover:bg-blue-600 hover:text-white text-sm font-medium transition-colors"
              >
                {chapter}
              </button>
            ))}
          </div>
        )}

        {view === 'verses' && selectedBook && selectedChapter !== null && !isLoading && (
          <div>
            <div className="px-3 py-2 bg-muted/50 border-b border-border text-xs text-muted-foreground sticky top-0">
              {selectedBook} {selectedChapter} · {preferredTranslation} · click = preview, double-click = go live
            </div>
            {verses.map((verse) => (
              <VerseRow
                key={verse.id}
                verse={verse}
                onPreview={onPreview}
                onGoLive={onGoLive}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VerseRow({
  verse,
  onPreview,
  onGoLive,
}: {
  verse: ScriptureLibraryItem;
  onPreview: (verse: ScriptureLibraryItem) => void;
  onGoLive: (verse: ScriptureLibraryItem) => void;
}) {
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      onPreview(verse);
    }, 250);
  };

  const handleDoubleClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    onGoLive(verse);
  };

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className="p-3 hover:bg-muted cursor-pointer border-b border-border/60 transition-colors"
    >
      <div className="flex gap-2">
        <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm shrink-0 w-6">
          {verse.verse}
        </span>
        <p className="text-foreground text-sm leading-relaxed">{verse.text}</p>
      </div>
    </div>
  );
}

function BookGrid({
  title,
  books,
  onSelect,
}: {
  title: string;
  books: { name: string; chapters: number; versesAvailable: number }[];
  onSelect: (book: string) => void;
}) {
  return (
    <div>
      <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-1">
        {books.map((book) => (
          <button
            key={book.name}
            type="button"
            onClick={() => onSelect(book.name)}
            className="text-left px-2 py-2 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="text-sm font-medium text-foreground truncate">{book.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {book.chapters} ch
              {book.versesAvailable > 0 ? '' : ' · pending import'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
