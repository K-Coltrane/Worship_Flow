import { useState } from 'react';
import { Search, Music, BookOpen, Image, Plus, Edit, Trash2 } from 'lucide-react';

type TabType = 'songs' | 'scriptures' | 'media';

interface Song {
  id: string;
  title: string;
  artist: string;
}

interface Scripture {
  id: string;
  reference: string;
  version: string;
}

interface Media {
  id: string;
  name: string;
  type: string;
}

const mockSongs: Song[] = [
  { id: '1', title: 'Amazing Grace', artist: 'Traditional' },
  { id: '2', title: 'How Great Thou Art', artist: 'Traditional' },
  { id: '3', title: 'Holy Holy Holy', artist: 'Reginald Heber' },
  { id: '4', title: 'Great is Thy Faithfulness', artist: 'Thomas Chisholm' },
  { id: '5', title: 'It is Well', artist: 'Horatio Spafford' },
  { id: '6', title: 'Blessed Assurance', artist: 'Fanny Crosby' },
];

const mockScriptures: Scripture[] = [
  { id: '1', reference: 'John 3:16', version: 'NIV' },
  { id: '2', reference: 'Psalm 23:1-6', version: 'NIV' },
  { id: '3', reference: 'Romans 8:28', version: 'ESV' },
  { id: '4', reference: '1 Corinthians 13:4-8', version: 'NIV' },
  { id: '5', reference: 'Philippians 4:13', version: 'NIV' },
];

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

  const tabs = [
    { id: 'songs' as TabType, label: 'Songs', icon: Music },
    { id: 'scriptures' as TabType, label: 'Scriptures', icon: BookOpen },
    { id: 'media' as TabType, label: 'Media', icon: Image },
  ];

  const getFilteredItems = () => {
    const query = searchQuery.toLowerCase();
    switch (activeTab) {
      case 'songs':
        return mockSongs.filter(song =>
          song.title.toLowerCase().includes(query) ||
          song.artist.toLowerCase().includes(query)
        );
      case 'scriptures':
        return mockScriptures.filter(scripture =>
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
    <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      <div className="border-b border-zinc-800">
        <div className="flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-zinc-800 text-blue-400 border-b-2 border-blue-500'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {getFilteredItems().map((item: any) => (
          <div
            key={item.id}
            onClick={() => onItemSelect(item, activeTab)}
            onDoubleClick={() => onItemDoubleClick(item, activeTab)}
            className="p-3 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800/50 group transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                {activeTab === 'songs' && (
                  <>
                    <div className="text-white font-medium truncate">{item.title}</div>
                    <div className="text-zinc-400 text-sm truncate">{item.artist}</div>
                  </>
                )}
                {activeTab === 'scriptures' && (
                  <>
                    <div className="text-white font-medium">{item.reference}</div>
                    <div className="text-zinc-400 text-sm">{item.version}</div>
                  </>
                )}
                {activeTab === 'media' && (
                  <>
                    <div className="text-white font-medium truncate">{item.name}</div>
                    <div className="text-zinc-400 text-sm">{item.type}</div>
                  </>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                <button className="p-1 hover:bg-zinc-700 rounded">
                  <Edit size={14} className="text-zinc-400" />
                </button>
                <button className="p-1 hover:bg-zinc-700 rounded">
                  <Trash2 size={14} className="text-zinc-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-zinc-800">
        <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
          <Plus size={18} />
          Add New {activeTab.slice(0, -1)}
        </button>
      </div>
    </div>
  );
}
