import { useEffect, useState } from 'react';
import { Search, Music, BookOpen, Image, Plus, Edit, Trash2 } from 'lucide-react';
import { backendApi, ScriptureLibraryItem, Song } from '../lib/backend';

type TabType = 'songs' | 'scriptures' | 'media';

interface Media {
  id: string;
  name: string;
  type: string;
}

const mockMedia: Media[] = [
  { id: '1', name: 'Worship Background.mp4', type: 'video' },
  { id: '2', name: 'Cross Image.jpg', type: 'image' },
  { id: '3', name: 'Intro Music.mp3', type: 'audio' },
];

interface LeftPanelProps {
  onItemSelect: (item: any, type: string) => void;
  onItemDoubleClick: (item: any, type: string) => void;
}

export function LeftPanel({ onItemSelect, onItemDoubleClick }: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('songs');
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [scriptures, setScriptures] = useState<ScriptureLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLibrary() {
      if (activeTab === 'media') {
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        if (activeTab === 'songs') {
          const results = await backendApi.searchSongs(searchQuery);
          if (!cancelled) {
            setSongs(results);
          }
        } else {
          const results = await backendApi.searchScriptures(searchQuery);
          if (!cancelled) {
            setScriptures(results);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError('Backend library unavailable');
          console.error(error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    const timer = window.setTimeout(loadLibrary, 150);
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

  const getFilteredItems = () => {
    const query = searchQuery.toLowerCase();
    switch (activeTab) {
      case 'songs':
        return songs.filter(song =>
          song.title.toLowerCase().includes(query) ||
          (song.artist ?? '').toLowerCase().includes(query)
        );
      case 'scriptures':
        return scriptures.filter(scripture =>
          scripture.reference.toLowerCase().includes(query)
        );
      case 'media':
        return mockMedia.filter(media =>
          media.name.toLowerCase().includes(query)
        );
      default:
        return [];
    }
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col min-h-0">
      <div className="border-b border-border shrink-0">
        <div className="flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
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

      <div className="p-3 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading && (
          <div className="p-3 text-muted-foreground text-sm">Loading {activeTab}...</div>
        )}
        {loadError && (
          <div className="p-3 text-red-600 dark:text-red-400 text-sm">{loadError}</div>
        )}
        {getFilteredItems().map((item: any) => (
          <div
            key={item.id}
            onClick={() => onItemSelect(item, activeTab)}
            onDoubleClick={() => onItemDoubleClick(item, activeTab)}
            className="p-3 hover:bg-muted cursor-pointer border-b border-border/60 group transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                {activeTab === 'songs' && (
                  <>
                    <div className="text-foreground font-medium truncate">{item.title}</div>
                    <div className="text-muted-foreground text-sm truncate">{item.artist || 'Unknown artist'}</div>
                  </>
                )}
                {activeTab === 'scriptures' && (
                  <>
                    <div className="text-foreground font-medium">{item.reference}</div>
                    <div className="text-muted-foreground text-sm truncate">{item.version} • {item.text}</div>
                  </>
                )}
                {activeTab === 'media' && (
                  <>
                    <div className="text-foreground font-medium truncate">{item.name}</div>
                    <div className="text-muted-foreground text-sm">{item.type}</div>
                  </>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                <button className="p-1 hover:bg-secondary rounded">
                  <Edit size={14} className="text-muted-foreground" />
                </button>
                <button className="p-1 hover:bg-secondary rounded">
                  <Trash2 size={14} className="text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-border shrink-0">
        <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
          <Plus size={18} />
          Add New {activeTab.slice(0, -1)}
        </button>
      </div>
    </div>
  );
}
