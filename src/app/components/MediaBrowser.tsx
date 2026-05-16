import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Folder, FolderOpen, Image, Music, Video, HardDrive } from 'lucide-react';

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

function MediaIcon({ type }: { type: LocalMediaItem['type'] }) {
  if (type === 'video') {
    return <Video size={16} className="text-blue-500 shrink-0" />;
  }
  if (type === 'audio') {
    return <Music size={16} className="text-purple-500 shrink-0" />;
  }
  if (type === 'image') {
    return <Image size={16} className="text-emerald-500 shrink-0" />;
  }
  return <Folder size={16} className="text-muted-foreground shrink-0" />;
}

export function MediaBrowser({ onPreview, onGoLive }: MediaBrowserProps) {
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [rootName, setRootName] = useState<string | null>(null);
  const [pathStack, setPathStack] = useState<{ name: string; handle: FileSystemDirectoryHandle }[]>(
    [],
  );
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supportsPicker, setSupportsPicker] = useState(false);
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
        const nextEntries: DirEntry[] = [];
        for await (const [name, handle] of dir.entries()) {
          if (handle.kind === 'directory') {
            nextEntries.push({ kind: 'dir', name, handle });
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
          nextEntries.push({
            kind: 'file',
            name,
            media: {
              id: relativePath,
              name,
              type,
              url,
              relativePath,
              mimeType: file.type,
            },
          });
        }

        nextEntries.sort((a, b) => {
          if (a.kind !== b.kind) {
            return a.kind === 'dir' ? -1 : 1;
          }
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        });
        setEntries(nextEntries);
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

    const mediaFiles: DirEntry[] = [];
    for (const file of files) {
      const name = file.name;
      const type = mediaTypeFromName(name, file.type);
      if (type === 'other') {
        continue;
      }
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      mediaFiles.push({
        kind: 'file',
        name,
        media: {
          id: file.webkitRelativePath || name,
          name,
          type,
          url,
          relativePath: file.webkitRelativePath || name,
          mimeType: file.type,
        },
      });
    }
    mediaFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    setEntries(mediaFiles);
    event.target.value = '';
  };

  const breadcrumbs = useMemo(() => {
    if (!rootName) {
      return [];
    }
    return [rootName, ...pathStack.map((p) => p.name)];
  }, [pathStack, rootName]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-3 border-b border-border shrink-0 space-y-2">
        <button
          type="button"
          onClick={chooseFolder}
          className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
        >
          <HardDrive size={16} />
          {rootName ? 'Choose different folder' : 'Browse device storage…'}
        </button>
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
          multiple
          onChange={onFallbackFolderInput}
        />
        {!supportsPicker && (
          <p className="text-xs text-muted-foreground">
            Use Chrome or Edge to browse folders on your device.
          </p>
        )}
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {rootName && (
        <div className="px-3 py-2 border-b border-border shrink-0 flex items-center gap-1 text-sm min-w-0">
          {pathStack.length > 0 && rootHandle && (
            <button
              type="button"
              onClick={goUp}
              className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0"
              aria-label="Up"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <FolderOpen size={16} className="text-muted-foreground shrink-0" />
          <span className="truncate text-foreground font-medium" title={breadcrumbs.join(' / ')}>
            {breadcrumbs.join(' / ')}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        {!rootName && !isLoading && (
          <p className="p-4 text-sm text-muted-foreground">
            Choose a folder on your computer to browse images, videos, and audio for your service.
          </p>
        )}
        {isLoading && <p className="p-3 text-sm text-muted-foreground">Loading folder…</p>}
        {rootName && !isLoading && entries.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No media files in this folder.</p>
        )}
        {rootName && entries.length > 0 && (
          <div className="px-3 py-2 bg-muted/50 border-b border-border text-xs text-muted-foreground sticky top-0">
            click = preview · double-click = go live
          </div>
        )}
        {entries.map((entry) =>
          entry.kind === 'dir' ? (
            <button
              key={`dir-${entry.name}`}
              type="button"
              onClick={() => enterFolder(entry)}
              className="w-full p-3 hover:bg-muted border-b border-border/60 flex items-center gap-2 text-left"
            >
              <Folder size={16} className="text-amber-500 shrink-0" />
              <span className="text-foreground text-sm font-medium truncate">{entry.name}</span>
            </button>
          ) : (
            <MediaFileRow
              key={entry.media.id}
              item={entry.media}
              onPreview={onPreview}
              onGoLive={onGoLive}
            />
          ),
        )}
      </div>
    </div>
  );
}

function MediaFileRow({
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
      className="p-3 hover:bg-muted cursor-pointer border-b border-border/60 transition-colors"
    >
      <div className="flex items-center gap-2 min-w-0">
        <MediaIcon type={item.type} />
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-sm font-medium truncate">{item.name}</p>
          <p className="text-muted-foreground text-xs truncate capitalize">{item.type}</p>
        </div>
      </div>
    </div>
  );
}
