import { useState } from 'react';
import { Music, BookOpen, Image } from 'lucide-react';
import { ScriptureLibraryItem, Song } from '../lib/backend';
import { ScriptureBrowser } from './ScriptureBrowser';
import { LocalMediaItem, MediaBrowser } from './MediaBrowser';
import { SongsBrowser } from './SongsBrowser';

type TabType = 'songs' | 'scriptures' | 'media';

interface ResourceLibraryPanelProps {
  preferredTranslation: string;
  onTranslationChange: (translation: string) => void;
  onScripturePreview: (verse: ScriptureLibraryItem) => void;
  onScriptureGoLive: (verse: ScriptureLibraryItem) => void;
  onMediaPreview: (item: LocalMediaItem) => void;
  onMediaGoLive: (item: LocalMediaItem) => void;
  onSongPreview: (song: Song, segmentIndex?: number) => void;
  onSongSchedule: (song: Song, goLive: boolean) => void;
}

export function ResourceLibraryPanel({
  preferredTranslation,
  onTranslationChange,
  onScripturePreview,
  onScriptureGoLive,
  onMediaPreview,
  onMediaGoLive,
  onSongPreview,
  onSongSchedule,
}: ResourceLibraryPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('scriptures');

  const tabs = [
    { id: 'songs' as TabType, label: 'Songs', icon: Music },
    { id: 'scriptures' as TabType, label: 'Scriptures', icon: BookOpen },
    { id: 'media' as TabType, label: 'Media', icon: Image },
  ];

  return (
    <div className="shrink-0 flex flex-col bg-[#1e1e1e] border-t border-[#3a3a3a] h-[38%] min-h-[200px] max-h-[420px]">
      <div className="flex border-b border-[#3a3a3a] shrink-0 bg-[#252525]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 flex items-center gap-2 text-sm font-medium transition-colors border-b-2 ${
                active
                  ? 'border-blue-500 text-blue-400 bg-[#2a2a2a]'
                  : 'border-transparent text-[#999] hover:text-[#ccc] hover:bg-[#2a2a2a]/60'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
          <SongsBrowser onPreview={onSongPreview} onSchedule={onSongSchedule} />
        )}
      </div>
    </div>
  );
}
