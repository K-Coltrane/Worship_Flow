import { useCallback, useEffect, useState } from 'react';
import {
  CalendarPlus,
  Eye,
  GripVertical,
  Music,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { backendApi, Song, SongSegment } from '../lib/backend';

const SEGMENT_TYPES: SongSegment['type'][] = [
  'verse',
  'chorus',
  'bridge',
  'tag',
  'intro',
  'outro',
];

const emptySegment = (): SongSegment => ({
  type: 'verse',
  label: '',
  content: '',
});

type DraftSong = {
  title: string;
  artist: string;
  defaultKey: string;
  verses: SongSegment[];
};

function toDraft(song?: Song | null): DraftSong {
  if (!song) {
    return { title: '', artist: '', defaultKey: '', verses: [emptySegment()] };
  }
  return {
    title: song.title,
    artist: song.artist ?? '',
    defaultKey: song.defaultKey ?? '',
    verses: song.verses.map((v) => ({ ...v })),
  };
}

interface SongsBrowserProps {
  onPreview: (song: Song, segmentIndex?: number) => void;
  onSchedule: (song: Song, goLive: boolean) => void;
}

export function SongsBrowser({ onPreview, onSchedule }: SongsBrowserProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftSong>(toDraft());
  const [isNew, setIsNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadSongs = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const results = await backendApi.searchSongs(searchQuery);
      setSongs(results);
    } catch (error) {
      setLoadError('Could not load songs');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = window.setTimeout(loadSongs, 150);
    return () => window.clearTimeout(timer);
  }, [loadSongs]);

  const selectSong = async (id: string) => {
    setIsNew(false);
    setSelectedId(id);
    setSaveError(null);
    try {
      const song = await backendApi.getSong(id);
      setDraft(toDraft(song));
    } catch (error) {
      console.error(error);
      setSaveError('Could not load song');
    }
  };

  const startNewSong = () => {
    setIsNew(true);
    setSelectedId(null);
    setDraft(toDraft());
    setSaveError(null);
  };

  const updateDraft = (patch: Partial<DraftSong>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const updateSegment = (index: number, patch: Partial<SongSegment>) => {
    setDraft((current) => ({
      ...current,
      verses: current.verses.map((segment, i) =>
        i === index ? { ...segment, ...patch } : segment,
      ),
    }));
  };

  const addSegment = () => {
    setDraft((current) => ({ ...current, verses: [...current.verses, emptySegment()] }));
  };

  const removeSegment = (index: number) => {
    setDraft((current) => {
      if (current.verses.length <= 1) return current;
      return { ...current, verses: current.verses.filter((_, i) => i !== index) };
    });
  };

  const handleSave = async () => {
    const title = draft.title.trim();
    if (!title) {
      setSaveError('Title is required');
      return;
    }
    const verses = draft.verses
      .map((segment) => ({
        ...segment,
        label: segment.label?.trim() || undefined,
        content: segment.content.trim(),
      }))
      .filter((segment) => segment.content.length > 0);

    if (verses.length === 0) {
      setSaveError('Add at least one slide with lyrics');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const payload = {
        title,
        artist: draft.artist.trim() || undefined,
        defaultKey: draft.defaultKey.trim() || undefined,
        verses,
      };

      if (isNew || !selectedId) {
        const created = await backendApi.createSong(payload);
        setIsNew(false);
        setSelectedId(created.id);
        setDraft(toDraft(created));
      } else {
        const updated = await backendApi.updateSong(selectedId, payload);
        setDraft(toDraft(updated));
      }
      await loadSongs();
    } catch (error) {
      console.error(error);
      setSaveError('Could not save song');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId || isNew) return;
    if (!window.confirm('Delete this song?')) return;
    try {
      await backendApi.deleteSong(selectedId);
      setSelectedId(null);
      setIsNew(false);
      setDraft(toDraft());
      await loadSongs();
    } catch (error) {
      console.error(error);
      setSaveError('Could not delete song');
    }
  };

  const buildSongFromDraft = (): Song | null => {
    const title = draft.title.trim();
    if (!title) return null;
    const verses = draft.verses
      .map((segment) => ({
        ...segment,
        label: segment.label?.trim() || undefined,
        content: segment.content.trim(),
      }))
      .filter((segment) => segment.content.length > 0);
    if (verses.length === 0) return null;
    return {
      id: selectedId ?? 'draft',
      title,
      artist: draft.artist.trim() || undefined,
      defaultKey: draft.defaultKey.trim() || undefined,
      verses,
    };
  };

  const handlePreview = () => {
    const song = buildSongFromDraft();
    if (song) onPreview(song, 0);
  };

  const handleSchedule = (goLive: boolean) => {
    const song = buildSongFromDraft();
    if (!song) {
      setSaveError('Save the song first, or fill in title and lyrics');
      return;
    }
    if (!selectedId && !isNew) {
      setSaveError('Select or save a song before scheduling');
      return;
    }
    if (isNew || !selectedId) {
      setSaveError('Save the song before adding to schedule');
      return;
    }
    onSchedule({ ...song, id: selectedId }, goLive);
  };

  const filteredSongs = songs.filter((song) => {
    const q = searchQuery.toLowerCase();
    return (
      song.title.toLowerCase().includes(q) ||
      (song.artist ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-1 min-h-0">
      <div className="w-52 shrink-0 flex flex-col border-r border-[#3a3a3a] bg-[#222]">
        <div className="p-2 border-b border-[#3a3a3a] space-y-2 shrink-0">
          <button
            type="button"
            onClick={startNewSong}
            className="w-full py-1.5 px-2 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Plus size={14} />
            New Song
          </button>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#666]" size={14} />
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 bg-[#2a2a2a] border border-[#444] rounded text-xs text-[#e0e0e0] placeholder:text-[#666] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading && <p className="p-2 text-[#888] text-xs">Loading…</p>}
          {loadError && <p className="p-2 text-red-400 text-xs">{loadError}</p>}
          {filteredSongs.map((song) => (
            <button
              key={song.id}
              type="button"
              onClick={() => selectSong(song.id)}
              onDoubleClick={(e) => {
                e.preventDefault();
                onSchedule(song, true);
              }}
              className={`w-full text-left px-2 py-2 border-b border-[#333] transition-colors ${
                selectedId === song.id && !isNew
                  ? 'bg-blue-900/40 text-blue-100'
                  : 'hover:bg-[#2a2a2a] text-[#ccc]'
              }`}
            >
              <p className="text-sm font-medium truncate">{song.title}</p>
              <p className="text-[10px] text-[#888] truncate">
                {song.artist || 'Unknown'} · {song.verses.length} slide
                {song.verses.length === 1 ? '' : 's'}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-[#3a3a3a] bg-[#252525]">
          <Music size={16} className="text-[#888]" />
          <span className="text-sm font-semibold text-[#ccc]">
            {isNew ? 'New Song' : selectedId ? 'Edit Song' : 'Select or create a song'}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePreview}
              disabled={!buildSongFromDraft()}
              className="px-2 py-1 text-[10px] font-medium rounded border border-[#444] text-[#ccc] hover:bg-[#333] disabled:opacity-40 flex items-center gap-1"
              title="Preview first slide"
            >
              <Eye size={12} />
              Preview
            </button>
            <button
              type="button"
              onClick={() => handleSchedule(false)}
              disabled={!selectedId || isNew}
              className="px-2 py-1 text-[10px] font-medium rounded bg-[#333] hover:bg-[#444] text-[#ccc] disabled:opacity-40 flex items-center gap-1"
              title="Add each slide to the schedule"
            >
              <CalendarPlus size={12} />
              Schedule
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-2.5 py-1 text-[10px] font-semibold rounded bg-green-800 hover:bg-green-700 text-white disabled:opacity-50 flex items-center gap-1"
            >
              <Save size={12} />
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            {selectedId && !isNew && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-1 rounded text-red-400 hover:bg-red-950/50"
                title="Delete song"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-3">
          {saveError && <p className="text-red-400 text-xs">{saveError}</p>}

          <div className="grid grid-cols-3 gap-2">
            <label className="col-span-2 space-y-1">
              <span className="text-[10px] text-[#888] uppercase tracking-wide">Title</span>
              <input
                value={draft.title}
                onChange={(e) => updateDraft({ title: e.target.value })}
                className="w-full px-2 py-1.5 bg-[#2a2a2a] border border-[#444] rounded text-sm text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-[#888] uppercase tracking-wide">Key</span>
              <input
                value={draft.defaultKey}
                onChange={(e) => updateDraft({ defaultKey: e.target.value })}
                placeholder="G"
                className="w-full px-2 py-1.5 bg-[#2a2a2a] border border-[#444] rounded text-sm text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </label>
            <label className="col-span-3 space-y-1">
              <span className="text-[10px] text-[#888] uppercase tracking-wide">Artist</span>
              <input
                value={draft.artist}
                onChange={(e) => updateDraft({ artist: e.target.value })}
                className="w-full px-2 py-1.5 bg-[#2a2a2a] border border-[#444] rounded text-sm text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#aaa]">
                Slides (each becomes one schedule item)
              </span>
              <button
                type="button"
                onClick={addSegment}
                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Plus size={12} />
                Add slide
              </button>
            </div>
            <div className="space-y-2">
              {draft.verses.map((segment, index) => (
                <div
                  key={index}
                  className="p-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical size={14} className="text-[#555] shrink-0" />
                    <select
                      value={segment.type}
                      onChange={(e) =>
                        updateSegment(index, { type: e.target.value as SongSegment['type'] })
                      }
                      className="px-2 py-1 bg-[#1e1e1e] border border-[#444] rounded text-xs text-[#ccc]"
                    >
                      {SEGMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <input
                      value={segment.label ?? ''}
                      onChange={(e) => updateSegment(index, { label: e.target.value })}
                      placeholder="Label (e.g. Verse 1)"
                      className="flex-1 px-2 py-1 bg-[#1e1e1e] border border-[#444] rounded text-xs text-[#e0e0e0] min-w-0"
                    />
                    {draft.verses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSegment(index)}
                        className="p-1 text-[#666] hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <textarea
                    value={segment.content}
                    onChange={(e) => updateSegment(index, { content: e.target.value })}
                    rows={3}
                    placeholder="Lyrics for this slide…"
                    className="w-full px-2 py-1.5 bg-[#1e1e1e] border border-[#444] rounded text-sm text-[#e0e0e0] leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {selectedId && !isNew && (
                    <button
                      type="button"
                      onClick={() => {
                        const song = buildSongFromDraft();
                        if (song) onPreview({ ...song, id: selectedId }, index);
                      }}
                      className="text-[10px] text-[#888] hover:text-blue-400"
                    >
                      Preview this slide
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-[#666] leading-relaxed">
            <strong className="text-[#888]">Schedule</strong> adds every slide to the left-hand
            schedule as separate items. Save first, then use Schedule or double-click a song in the
            list to add and go live.
          </p>
        </div>
      </div>
    </div>
  );
}
