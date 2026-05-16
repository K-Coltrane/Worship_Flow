import { useEffect, useState } from 'react';
import { Search, Music, BookOpen, Image } from 'lucide-react';
import { backendApi, ScriptureLibraryItem, Song } from '../lib/backend';
import { ScriptureBrowser } from './ScriptureBrowser';
import { LocalMediaItem, MediaBrowser } from './MediaBrowser';

type TabType = 'songs' | 'scriptures' | 'media';

interface LeftPanelProps {
  preferredTranslation: string;
  onTranslationChange: (translation: string) => void;
  onScripturePreview: (verse: ScriptureLibraryItem) => void;
  onScriptureGoLive: (verse: ScriptureLibraryItem) => void;
  onMediaPreview: (item: LocalMediaItem) => void;
  onMediaGoLive: (item: LocalMediaItem) => void;
  onItemSelect: (item: unknown, type: string) => void;
  onItemDoubleClick: (item: unknown, type: string) => void;
}

export function LeftPanel({
  preferredTranslation,
  onTranslationChange,
  onScripturePreview,
  onScriptureGoLive,
  onMediaPreview,
  onMediaGoLive,
  onItemSelect,
  onItemDoubleClick,
}: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('songs');
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== 'songs') return;
    let cancelled = false;
    async function loadSongs() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const results = await backendApi.searchSongs(searchQuery);
        if (!cancelled) setSongs(results);
      } catch (error) {
        if (!cancelled) {
          setLoadError('Backend library unavailable');
          console.error(error);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    const timer = window.setTimeout(loadSongs, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeTab, searchQuery]);

  const tabs = [
    { id: 'songs' as TabType, label: 'Songs', icon: Music },
    { id: 'scriptures' as TabType, label: 'Scriptures', icon: BookOpen },
    { id: 'media' as TabType, label: 'Media', icon: Image },
  ];

  const panelWidth =
    activeTab === 'scriptures' || activeTab === 'media' ? 'w-[22rem]' : 'w-80';

  return (
    <div
      className={`${panelWidth} shrink-0 bg-card border-r border-border flex flex-col min-h-0 transition-[width]`}
    >
      <div className="border-b border-border shrink-0">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-muted text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'scriptures' ? (
        <ScriptureBrowser
          preferredTranslation={preferredTranslation}
          onTranslationChange={onTranslationChange}
          onPreview={onScripturePreview}
          onGoLive={onScriptureGoLive}
        />
      ) : activeTab === 'media' ? (
        <MediaBrowser onPreview={onMediaPreview} onGoLive={onMediaGoLive} />
      ) : (
        <>
          <div className="p-3 border-b border-border shrink-0">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={18}
              />
              <input
                type="text"
                placeholder="Search songs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading && <p className="p-3 text-muted-foreground text-sm">Loading songs...</p>}
            {loadError && <p className="p-3 text-red-600 dark:text-red-400 text-sm">{loadError}</p>}
            {songs
              .filter((song) => {
                const q = searchQuery.toLowerCase();
                return (
                  song.title.toLowerCase().includes(q) ||
                  (song.artist ?? '').toLowerCase().includes(q)
                );
              })
              .map((song) => (
                <div
                  key={song.id}
                  onClick={() => onItemSelect(song, activeTab)}
                  onDoubleClick={() => onItemDoubleClick(song, activeTab)}
                  className="p-3 hover:bg-muted cursor-pointer border-b border-border/60 transition-colors"
                >
                  <p className="text-foreground font-medium truncate">{song.title}</p>
                  <p className="text-muted-foreground text-sm truncate">
                    {song.artist || 'Unknown artist'}
                  </p>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
