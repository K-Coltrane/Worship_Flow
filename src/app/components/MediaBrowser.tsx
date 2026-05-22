import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  Folder,
  FolderOpen,
  HardDrive,
  Music,
  Video,
} from 'lucide-react';

export type LocalMediaItem = {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'other';
  url: string;
  relativePath: string;
  mimeType: string;
};

interface MediaBrowserProps {
  onPreview: (item: LocalMediaItem) => void;
  onGoLive: (item: LocalMediaItem) => void;
}

type DirEntry =
  | { kind: 'dir'; name: string; handle: FileSystemDirectoryHandle }
  | { kind: 'file'; name: string; media: LocalMediaItem };

function mediaTypeFromName(name: string, mimeType: string): LocalMediaItem['type'] {
  const lower = name.toLowerCase();
  if (mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(lower)) {
    return 'image';
  }
  if (mimeType.startsWith('video/') || /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(lower)) {
    return 'video';
  }
  if (mimeType.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(lower)) {
    return 'audio';
  }
  return 'other';
}

export function MediaBrowser({ onPreview, onGoLive }: MediaBrowserProps) {
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [rootName, setRootName] = useState<string | null>(null);
  const [pathStack, setPathStack] = useState<{ name: string; handle: FileSystemDirectoryHandle }[]>(
    [],
  );
  const [folders, setFolders] = useState<Extract<DirEntry, { kind: 'dir' }>[]>([]);
  const [mediaFiles, setMediaFiles] = useState<LocalMediaItem[]>([]);
  const [audioFiles, setAudioFiles] = useState<LocalMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supportsPicker, setSupportsPicker] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const revokeObjectUrls = useCallback(() => {
    for (const url of objectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    objectUrlsRef.current = [];
  }, []);

  useEffect(() => {
    setSupportsPicker(typeof window.showDirectoryPicker === 'function');
    return () => revokeObjectUrls();
  }, [revokeObjectUrls]);

  const loadDirectory = useCallback(
    async (dir: FileSystemDirectoryHandle, basePath: string) => {
      setIsLoading(true);
      setError(null);
      revokeObjectUrls();

      try {
        const dirEntries: Extract<DirEntry, { kind: 'dir' }>[] = [];
        const imagesVideos: LocalMediaItem[] = [];
        const audio: LocalMediaItem[] = [];

        for await (const [name, handle] of dir.entries()) {
          if (handle.kind === 'directory') {
            dirEntries.push({ kind: 'dir', name, handle });
            continue;
          }
          const file = await handle.getFile();
          const type = mediaTypeFromName(name, file.type);
          if (type === 'other') {
            continue;
          }
          const url = URL.createObjectURL(file);
          objectUrlsRef.current.push(url);
          const relativePath = basePath ? `${basePath}/${name}` : name;
          const item: LocalMediaItem = {
            id: relativePath,
            name,
            type,
            url,
            relativePath,
            mimeType: file.type,
          };
          if (type === 'audio') {
            audio.push(item);
          } else {
            imagesVideos.push(item);
          }
        }

        dirEntries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        imagesVideos.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        );
        audio.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

        setFolders(dirEntries);
        setMediaFiles(imagesVideos);
        setAudioFiles(audio);
        setSelectedId(null);
      } catch (err) {
        console.error(err);
        setError('Could not read this folder. Try choosing the folder again.');
      } finally {
        setIsLoading(false);
      }
    },
    [revokeObjectUrls],
  );

  const openDirectory = useCallback(
    async (dir: FileSystemDirectoryHandle) => {
      setRootHandle(dir);
      setRootName(dir.name);
      setPathStack([]);
      await loadDirectory(dir, '');
    },
    [loadDirectory],
  );

  const chooseFolder = async () => {
    setError(null);
    try {
      if (window.showDirectoryPicker) {
        const dir = await window.showDirectoryPicker({ mode: 'read' });
        await openDirectory(dir);
        return;
      }
      folderInputRef.current?.click();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error(err);
        setError('Folder access was denied or is not supported in this browser.');
      }
    }
  };

  const enterFolder = async (entry: Extract<DirEntry, { kind: 'dir' }>) => {
    const nextPath = [...pathStack, { name: entry.name, handle: entry.handle }];
    setPathStack(nextPath);
    const basePath = nextPath.map((p) => p.name).join('/');
    await loadDirectory(entry.handle, basePath);
  };

  const goUp = async () => {
    if (pathStack.length === 0 || !rootHandle) {
      return;
    }
    const next = pathStack.slice(0, -1);
    setPathStack(next);
    if (next.length === 0) {
      await loadDirectory(rootHandle, '');
      return;
    }
    const basePath = next.map((p) => p.name).join('/');
    await loadDirectory(next[next.length - 1].handle, basePath);
  };

  const onFallbackFolderInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList?.length) {
      return;
    }
    revokeObjectUrls();
    const files = Array.from(fileList);
    const folderName = files[0]?.webkitRelativePath?.split('/')[0] ?? 'Selected folder';
    setRootName(folderName);
    setRootHandle(null);
    setPathStack([]);
    setFolders([]);

    const imagesVideos: LocalMediaItem[] = [];
    const audio: LocalMediaItem[] = [];

    for (const file of files) {
      const name = file.name;
      const type = mediaTypeFromName(name, file.type);
      if (type === 'other') {
        continue;
      }
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      const item: LocalMediaItem = {
        id: file.webkitRelativePath || name,
        name,
        type,
        url,
        relativePath: file.webkitRelativePath || name,
        mimeType: file.type,
      };
      if (type === 'audio') {
        audio.push(item);
      } else {
        imagesVideos.push(item);
      }
    }

    imagesVideos.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    audio.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    setMediaFiles(imagesVideos);
    setAudioFiles(audio);
    event.target.value = '';
  };

  const breadcrumbs = useMemo(() => {
    if (!rootName) {
      return [];
    }
    return [rootName, ...pathStack.map((p) => p.name)];
  }, [pathStack, rootName]);

  const currentFolderLabel = breadcrumbs[breadcrumbs.length - 1] ?? rootName;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-2 border-b border-[#3a3a3a] shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={chooseFolder}
          className="py-1.5 px-3 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-medium flex items-center gap-1.5 shrink-0"
        >
          <HardDrive size={14} />
          {rootName ? 'Change folder' : 'Browse…'}
        </button>
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
          multiple
          onChange={onFallbackFolderInput}
        />
        {rootName && (
          <div className="flex items-center gap-1 min-w-0 text-xs text-[#aaa]">
            {pathStack.length > 0 && rootHandle && (
              <button
                type="button"
                onClick={goUp}
                className="p-1 rounded hover:bg-[#333] text-[#888] shrink-0"
                aria-label="Up"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <FolderOpen size={14} className="shrink-0 text-[#888]" />
            <span className="truncate" title={breadcrumbs.join(' / ')}>
              {breadcrumbs.join(' / ')}
            </span>
          </div>
        )}
        {!supportsPicker && (
          <span className="text-[10px] text-[#666] ml-auto hidden sm:inline">
            Chrome/Edge for folder browse
          </span>
        )}
      </div>

      {error && <p className="px-3 py-1 text-xs text-red-400 shrink-0">{error}</p>}

      {!rootName && !isLoading && (
        <p className="p-4 text-sm text-[#666]">
          Choose a folder to browse images and videos. Open a subfolder on the left to see its
          thumbnails on the right.
        </p>
      )}

      {rootName && (
        <div className="flex flex-1 min-h-0">
          <div className="w-44 shrink-0 flex flex-col border-r border-[#3a3a3a] bg-[#222] overflow-y-auto">
            <div className="px-2 py-1.5 border-b border-[#3a3a3a] text-[10px] font-semibold text-[#888] uppercase tracking-wide">
              Folders
            </div>
            {pathStack.length > 0 && rootHandle && (
              <button
                type="button"
                onClick={goUp}
                className="w-full text-left px-2 py-2 text-xs text-[#aaa] hover:bg-[#2a2a2a] flex items-center gap-1.5 border-b border-[#333]"
              >
                <ChevronLeft size={14} />
                ..
              </button>
            )}
            {folders.length === 0 && !isLoading && (
              <p className="p-2 text-[10px] text-[#666] italic">No subfolders</p>
            )}
            {folders.map((folder) => (
              <button
                key={folder.name}
                type="button"
                onClick={() => enterFolder(folder)}
                className="w-full text-left px-2 py-2 text-xs text-[#ccc] hover:bg-[#2f2f2f] border-b border-[#333] flex items-center gap-2"
              >
                <Folder size={14} className="text-amber-500 shrink-0" />
                <span className="truncate">{folder.name}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="px-3 py-1.5 border-b border-[#3a3a3a] bg-[#252525] shrink-0 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#aaa]">
                {currentFolderLabel} — {mediaFiles.length} image
                {mediaFiles.length === 1 ? '' : 's'}/video
                {mediaFiles.length === 1 ? '' : 's'}
              </span>
              <span className="text-[10px] text-[#666]">click = preview · double-click = live</span>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-2">
              {isLoading && <p className="text-sm text-[#888]">Loading…</p>}
              {!isLoading && mediaFiles.length === 0 && (
                <p className="text-sm text-[#666] p-2">
                  No images or videos in this folder. Open a subfolder or choose another location.
                </p>
              )}
              {!isLoading && mediaFiles.length > 0 && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
                  {mediaFiles.map((item) => (
                    <MediaThumbnail
                      key={item.id}
                      item={item}
                      selected={selectedId === item.id}
                      onSelect={() => setSelectedId(item.id)}
                      onPreview={onPreview}
                      onGoLive={onGoLive}
                    />
                  ))}
                </div>
              )}

              {!isLoading && audioFiles.length > 0 && (
                <div className="mt-4 border-t border-[#3a3a3a] pt-2">
                  <p className="text-[10px] font-semibold text-[#888] uppercase tracking-wide mb-2 px-1">
                    Audio ({audioFiles.length})
                  </p>
                  <div className="space-y-1">
                    {audioFiles.map((item) => (
                      <AudioRow
                        key={item.id}
                        item={item}
                        onPreview={onPreview}
                        onGoLive={onGoLive}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MediaThumbnail({
  item,
  selected,
  onSelect,
  onPreview,
  onGoLive,
}: {
  item: LocalMediaItem;
  selected: boolean;
  onSelect: () => void;
  onPreview: (item: LocalMediaItem) => void;
  onGoLive: (item: LocalMediaItem) => void;
}) {
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = () => {
    onSelect();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      onPreview(item);
    }, 250);
  };

  const handleDoubleClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    onGoLive(item);
  };

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`group cursor-pointer rounded border overflow-hidden bg-[#1a1a1a] transition-colors ${
        selected ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-[#444] hover:border-[#666]'
      }`}
    >
      <div className="aspect-video bg-black flex items-center justify-center overflow-hidden relative">
        {item.type === 'image' ? (
          <img src={item.url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <>
            <video
              src={item.url}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.currentTime = 0;
                el.play().catch(() => undefined);
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.pause();
                el.currentTime = 0;
              }}
            />
            <div className="absolute bottom-1 right-1 p-0.5 bg-black/70 rounded">
              <Video size={12} className="text-white" />
            </div>
          </>
        )}
      </div>
      <p className="px-1.5 py-1 text-[10px] text-[#ccc] truncate" title={item.name}>
        {item.name}
      </p>
    </div>
  );
}

function AudioRow({
  item,
  onPreview,
  onGoLive,
}: {
  item: LocalMediaItem;
  onPreview: (item: LocalMediaItem) => void;
  onGoLive: (item: LocalMediaItem) => void;
}) {
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = () => {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      onPreview(item);
    }, 250);
  };

  const handleDoubleClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    onGoLive(item);
  };

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className="px-2 py-1.5 rounded hover:bg-[#2a2a2a] cursor-pointer flex items-center gap-2 text-xs text-[#ccc]"
    >
      <Music size={14} className="text-purple-400 shrink-0" />
      <span className="truncate">{item.name}</span>
    </div>
  );
}
