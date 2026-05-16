import { io, Socket } from 'socket.io-client';

export type ContentType = 'song' | 'scripture' | 'media' | 'blank';

export interface PresentationContent {
  id: string;
  type: ContentType;
  title: string;
  subtitle?: string;
  content?: string;
  payload?: Record<string, unknown>;
}

export interface PresentationState {
  preview: PresentationContent | null;
  live: PresentationContent | null;
  updatedAt: string;
}

export interface ServiceFlowItem {
  id: string;
  type: 'song' | 'scripture' | 'media';
  title: string;
  subtitle?: string;
  content: PresentationContent;
  itemRef?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceFlowState {
  items: ServiceFlowItem[];
  activeItemId: string | null;
  activeItem: ServiceFlowItem | null;
}

export interface SongSegment {
  type: 'verse' | 'chorus' | 'bridge' | 'tag' | 'intro' | 'outro';
  label?: string;
  content: string;
}

export interface Song {
  id: string;
  title: string;
  artist?: string;
  defaultKey?: string;
  verses: SongSegment[];
}

export interface ScriptureVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
}

export interface DetectedScripture {
  id: string;
  reference: string;
  book?: string;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
  timestamp: string;
  confidence: number;
  sourceText?: string;
}

export interface ScriptureLibraryItem extends ScriptureVerse {
  id: string;
  reference: string;
  version: string;
}

export interface TranslationInfo {
  code: string;
  label: string;
  language: string;
  verseCount: number;
}

export interface BibleBookInfo {
  name: string;
  testament: 'OT' | 'NT';
  chapters: number;
  versesAvailable: number;
}

export interface TranscriptionUpdate {
  text: string;
  engine: string;
  confidence: number;
  source: string;
  timestamp: string;
}

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Backend request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const backendApi = {
  getPresentationState: () => request<PresentationState>('/presentation/state'),
  setPreview: (item: PresentationContent) =>
    request<PresentationState>('/presentation/preview', {
      method: 'POST',
      body: JSON.stringify({ item }),
    }),
  goLive: () =>
    request<PresentationState>('/presentation/go-live', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  clearLive: () =>
    request<PresentationState>('/presentation/clear-live', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  projectScripture: (reference?: string) =>
    request<PresentationState>('/presentation/project-scripture', {
      method: 'POST',
      body: JSON.stringify({ reference }),
    }),
  getServiceFlow: () => request<ServiceFlowState>('/service-flow'),
  addServiceItem: (item: {
    type: 'song' | 'scripture' | 'media';
    title: string;
    subtitle?: string;
    itemRef?: string;
    content: PresentationContent;
  }) =>
    request<ServiceFlowItem>('/service-flow/items', {
      method: 'POST',
      body: JSON.stringify(item),
    }),
  reorderServiceItems: (itemIds: string[]) =>
    request<ServiceFlowState>('/service-flow/items/reorder', {
      method: 'PUT',
      body: JSON.stringify({ itemIds }),
    }),
  setActiveServiceItem: (id: string) =>
    request<ServiceFlowState>(`/service-flow/items/${id}/active`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  searchSongs: (query = '') => request<Song[]>(`/songs?q=${encodeURIComponent(query)}`),
  listTranslations: () => request<TranslationInfo[]>('/scripture/translations'),
  listBibleBooks: (translation = 'KJV') =>
    request<BibleBookInfo[]>(
      `/scripture/books?translation=${encodeURIComponent(translation)}`,
    ),
  listBibleChapters: (book: string, translation = 'KJV') =>
    request<number[]>(
      `/scripture/chapters?book=${encodeURIComponent(book)}&translation=${encodeURIComponent(translation)}`,
    ),
  getBibleChapter: async (book: string, chapter: number, translation = 'KJV') => {
    const verses = await request<ScriptureVerse[]>(
      `/scripture/chapter?book=${encodeURIComponent(book)}&chapter=${chapter}&translation=${encodeURIComponent(translation)}`,
    );
    return verses.map((verse) => ({
      ...verse,
      id: `${verse.book}-${verse.chapter}-${verse.verse}-${verse.translation}`,
      reference: `${verse.book} ${verse.chapter}:${verse.verse}`,
      version: verse.translation,
    }));
  },
  searchScriptures: async (query = '', translation = 'KJV') => {
    const verses = await request<ScriptureVerse[]>(
      `/scripture/search?q=${encodeURIComponent(query)}&translation=${encodeURIComponent(translation)}`,
    );

    return verses.map((verse) => ({
      ...verse,
      id: `${verse.book}-${verse.chapter}-${verse.verse}-${verse.translation}`,
      reference: `${verse.book} ${verse.chapter}:${verse.verse}`,
      version: verse.translation,
    }));
  },
  getScriptureContent: (reference: string, translation = 'KJV') =>
    request<PresentationContent>(
      `/scripture/passage?reference=${encodeURIComponent(reference)}&translation=${encodeURIComponent(translation)}`,
    ),
  processTranscription: (
    text: string,
    translation = 'KJV',
    source = 'microphone',
    persist = true,
  ) =>
    request<{ transcription: TranscriptionUpdate; detections: DetectedScripture[] }>(
      '/ai/transcriptions',
      {
        method: 'POST',
        body: JSON.stringify({ text, source, translation, persist }),
      },
    ),
  listDetections: () => request<DetectedScripture[]>('/ai/scripture-detections'),
};

export function connectRealtime(handlers: {
  onPresentationState?: (state: PresentationState) => void;
  onServiceFlow?: (flow: ServiceFlowState) => void;
  onTranscription?: (update: TranscriptionUpdate) => void;
  onScriptureDetected?: (scripture: DetectedScripture) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}): Socket {
  const socket = io(API_BASE_URL, {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => handlers.onConnected?.());
  socket.on('disconnect', () => handlers.onDisconnected?.());
  socket.on('presentation_state_updated', handlers.onPresentationState ?? (() => undefined));
  socket.on('service_flow_updated', handlers.onServiceFlow ?? (() => undefined));
  socket.on('transcription_update', handlers.onTranscription ?? (() => undefined));
  socket.on('scripture_detected', handlers.onScriptureDetected ?? (() => undefined));

  return socket;
}

export function songToPresentationContent(song: Song): PresentationContent {
  return {
    id: `song:${song.id}`,
    type: 'song',
    title: song.title,
    subtitle: song.artist,
    content: song.verses.map((segment) => segment.content).join('\n\n'),
    payload: {
      songId: song.id,
      defaultKey: song.defaultKey,
      verses: song.verses,
    },
  };
}

export function scriptureToPresentationContent(scripture: ScriptureLibraryItem): PresentationContent {
  return {
    id: `scripture:${scripture.reference}:${scripture.translation}`,
    type: 'scripture',
    title: scripture.reference,
    subtitle: scripture.translation,
    content: scripture.text,
    payload: {
      book: scripture.book,
      chapter: scripture.chapter,
      verseStart: scripture.verse,
      verseEnd: scripture.verse,
      translation: scripture.translation,
    },
  };
}

export function mediaToPresentationContent(media: {
  id: string;
  name: string;
  type: string;
  url?: string;
  relativePath?: string;
  mimeType?: string;
}) {
  return {
    id: `media:${media.id}`,
    type: 'media' as const,
    title: media.name,
    subtitle: media.type,
    content: media.url ? '' : `Media item: ${media.name}`,
    payload: {
      ...media,
      mediaUrl: media.url,
    },
  };
}
