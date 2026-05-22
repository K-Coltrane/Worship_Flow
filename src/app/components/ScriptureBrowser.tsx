import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Search } from 'lucide-react';
import { backendApi, ScriptureLibraryItem, TranslationInfo } from '../lib/backend';
import { TranslationSearchPicker } from './TranslationSearchPicker';

type BrowseView = 'books' | 'chapters' | 'verses';

interface ScriptureBrowserProps {
  preferredTranslation: string;
  onTranslationChange: (translation: string) => void;
  onPreview: (verse: ScriptureLibraryItem) => void;
  onGoLive: (verse: ScriptureLibraryItem) => void;
  onProjectPassage: (reference: string, translation: string) => void;
}

export function ScriptureBrowser({
  preferredTranslation,
  onTranslationChange,
  onPreview,
  onGoLive,
  onProjectPassage,
}: ScriptureBrowserProps) {
  const [view, setView] = useState<BrowseView>('books');
  const lastEnterRef = useRef<{ query: string; at: number } | null>(null);
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

  const handleSearchSubmit = async (): Promise<ScriptureLibraryItem | null> => {
    const query = searchQuery.trim();
    if (!query) {
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const results = await backendApi.searchScriptures(query, preferredTranslation);
      if (results.length === 0) {
        setError('No matching verses.');
        return null;
      }
      const first = results[0];
      setSelectedBook(first.book);
      setSelectedChapter(first.chapter);
      const chapterVerses = results.filter(
        (v) => v.chapter === first.chapter && v.book === first.book,
      );
      setVerses(chapterVerses);
      setView('verses');
      return first;
    } catch (err) {
      console.error(err);
      setError('Search failed.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();

    const query = searchQuery.trim();
    if (!query) {
      return;
    }

    const now = Date.now();
    const last = lastEnterRef.current;
    const isSecondEnter =
      last !== null && last.query === query && now - last.at < 2500;

    if (isSecondEnter) {
      lastEnterRef.current = null;
      onProjectPassage(query, preferredTranslation);
      return;
    }

    lastEnterRef.current = { query, at: now };
    const first = await handleSearchSubmit();
    if (first) {
      onPreview(first);
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

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-2 py-2 border-b border-[#3a3a3a] shrink-0 flex items-center gap-2 min-w-0">
        {view !== 'books' && (
          <button
            type="button"
            onClick={view === 'verses' ? goToChapters : goToBooks}
            className="p-1.5 rounded hover:bg-[#333] text-[#888] shrink-0"
            aria-label="Back"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div className="relative flex flex-1 min-w-0 gap-1.5">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666] pointer-events-none"
            size={16}
          />
          <input
            type="text"
            placeholder="Genesis 1 or John 3:16…"
            title="Enter to search and preview; press Enter again to project live"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              lastEnterRef.current = null;
            }}
            onKeyDown={handleSearchKeyDown}
            className="flex-1 min-w-0 pl-8 pr-2 py-2 bg-[#2a2a2a] border border-[#444] rounded text-[#e0e0e0] text-sm placeholder:text-[#666] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleSearchSubmit}
            className="px-3 py-2 bg-[#333] hover:bg-[#444] rounded text-sm font-medium text-[#ccc] shrink-0"
          >
            Go
          </button>
        </div>
        <TranslationSearchPicker
          translations={translations}
          value={preferredTranslation}
          onChange={(code) => {
            onTranslationChange(code);
            goToBooks();
          }}
          label=""
          tone="toolbar"
          className="flex-1 min-w-0 max-w-[280px]"
        />
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
