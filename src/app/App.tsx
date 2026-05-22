import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TopBar } from './components/TopBar';
import { SchedulePanel } from './components/SchedulePanel';
import { CenterPanel } from './components/CenterPanel';
import { RightPanel } from './components/RightPanel';
import { ResourceLibraryPanel } from './components/ResourceLibraryPanel';
import { KeyboardHints } from './components/KeyboardHints';
import { QuickHints } from './components/QuickHints';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import type { LocalMediaItem } from './components/MediaBrowser';
import {
  backendApi,
  connectRealtime,
  DetectedScripture,
  mediaToPresentationContent,
  PresentationContent,
  PresentationState,
  scriptureToPresentationContent,
  ServiceFlowItem,
  Song,
  songSegmentToPresentationContent,
} from './lib/backend';

const emptyPresentation: PresentationState = {
  preview: null,
  live: null,
  updatedAt: new Date(0).toISOString(),
};

function extractRecentPhrase(text: string, wordCount = 14): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(-wordCount).join(' ');
}

function detectionKey(scripture: DetectedScripture): string {
  return `${scripture.reference}|${scripture.matchedTranslation ?? ''}`;
}

export default function App() {
  const [isAIOpen, setIsAIOpen] = useState(true);
  const [isMicActive, setIsMicActive] = useState(false);
  const [serviceItems, setServiceItems] = useState<ServiceFlowItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [presentation, setPresentation] = useState<PresentationState>(emptyPresentation);
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [detectedScriptures, setDetectedScriptures] = useState<DetectedScripture[]>([]);
  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'offline'>(
    'connecting',
  );
  const [preferredTranslation, setPreferredTranslation] = useState('NLT');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const lastDetectionTextRef = useRef('');
  const detectionInFlightRef = useRef(false);
  const pendingDetectionPhraseRef = useRef<string | null>(null);

  const mergeDetections = useCallback((incoming: DetectedScripture[]) => {
    if (incoming.length === 0) {
      return;
    }
    setDetectedScriptures((current) => {
      const merged = [...incoming];
      for (const item of current) {
        if (!merged.some((d) => detectionKey(d) === detectionKey(item))) {
          merged.push(item);
        }
      }
      return merged.slice(0, 25);
    });
  }, []);

  const runSpeechDetection = useCallback(
    (phrase: string, scope: 'live' | 'full' = 'live') => {
      const trimmed = phrase.trim();
      const cacheKey = `${scope}:${trimmed}`;
      if (trimmed.length < 3 || cacheKey === lastDetectionTextRef.current) {
        return;
      }

      const execute = () => {
        lastDetectionTextRef.current = cacheKey;
        detectionInFlightRef.current = true;
        backendApi
          .detectSpeech(trimmed, preferredTranslation)
          .then((detections) => mergeDetections(detections))
          .catch((error) => {
            console.error(error);
            setBackendStatus('offline');
          })
          .finally(() => {
            detectionInFlightRef.current = false;
            const pending = pendingDetectionPhraseRef.current;
            pendingDetectionPhraseRef.current = null;
            if (pending && pending !== lastDetectionTextRef.current) {
              runSpeechDetection(pending, scope);
            }
          });
      };

      if (detectionInFlightRef.current) {
        pendingDetectionPhraseRef.current = trimmed;
        return;
      }

      execute();
    },
    [mergeDetections, preferredTranslation],
  );

  const handleFinalTranscript = useCallback(
    (text: string) => {
      setInterimTranscript('');
      setTranscriptLines((current) => [...current.slice(-20), text]);
      runSpeechDetection(text, 'full');
    },
    [runSpeechDetection],
  );

  const handleLiveTranscript = useCallback(
    (fullText: string, interimOnly: string) => {
      setLiveTranscript(fullText);
      setInterimTranscript(interimOnly);
      if (!isMicActive) {
        return;
      }
      const livePhrase =
        interimOnly.trim() || extractRecentPhrase(fullText, 14) || fullText.trim();
      if (livePhrase) {
        runSpeechDetection(livePhrase, 'live');
      }
    },
    [isMicActive, runSpeechDetection],
  );

  const { status: micStatus } = useSpeechRecognition({
    enabled: isMicActive,
    onFinalTranscript: handleFinalTranscript,
    onLiveTranscript: handleLiveTranscript,
  });

  useEffect(() => {
    if (!isMicActive) {
      setLiveTranscript('');
      setInterimTranscript('');
      lastDetectionTextRef.current = '';
      pendingDetectionPhraseRef.current = null;
      detectionInFlightRef.current = false;
    }
  }, [isMicActive]);

  const refreshBackendState = useCallback(async () => {
    const [flow, state, detections] = await Promise.all([
      backendApi.getServiceFlow(),
      backendApi.getPresentationState(),
      backendApi.listDetections(),
    ]);

    setServiceItems(flow.items);
    setActiveItemId(flow.activeItemId);
    setPresentation(state);
    setDetectedScriptures(detections);
    setBackendStatus('connected');
  }, []);

  useEffect(() => {
    refreshBackendState().catch((error) => {
      console.error(error);
      setBackendStatus('offline');
    });

    const socket = connectRealtime({
      onConnected: () => setBackendStatus('connected'),
      onDisconnected: () => setBackendStatus('offline'),
      onPresentationState: setPresentation,
      onServiceFlow: (flow) => {
        setServiceItems(flow.items);
        setActiveItemId(flow.activeItemId);
      },
      onTranscription: (update) => {
        if (update.text) {
          setTranscriptLines((current) => [...current.slice(-20), update.text]);
        }
      },
      onScriptureDetected: (scripture) => {
        mergeDetections([scripture]);
      },
    });

    return () => socket.disconnect();
  }, [mergeDetections, refreshBackendState]);

  const previewSlide = presentation.preview;
  const liveSlide = presentation.live;

  const previewItemId = useMemo(() => {
    if (!previewSlide) {
      return null;
    }

    const activeItem = serviceItems.find((item) => item.id === activeItemId);
    if (activeItem?.content.id === previewSlide.id) {
      return activeItem.id;
    }

    return serviceItems.find((item) => item.content.id === previewSlide.id)?.id ?? null;
  }, [activeItemId, previewSlide, serviceItems]);

  const liveItemId = useMemo(() => {
    if (!liveSlide) {
      return null;
    }

    return serviceItems.find((item) => item.content.id === liveSlide.id)?.id ?? null;
  }, [liveSlide, serviceItems]);

  const setActiveItem = useCallback(async (id: string) => {
    const flow = await backendApi.setActiveServiceItem(id);
    setServiceItems(flow.items);
    setActiveItemId(flow.activeItemId);
  }, []);

  const handleNext = useCallback(() => {
    if (serviceItems.length === 0) {
      return;
    }

    const currentIndex = activeItemId
      ? serviceItems.findIndex((item) => item.id === activeItemId)
      : serviceItems.findIndex((item) => item.content.id === previewSlide?.id);
    const nextIndex = Math.min(currentIndex + 1, serviceItems.length - 1);
    setActiveItem(serviceItems[Math.max(nextIndex, 0)].id).catch(console.error);
  }, [activeItemId, previewSlide?.id, serviceItems, setActiveItem]);

  const handlePrevious = useCallback(() => {
    if (serviceItems.length === 0) {
      return;
    }

    const currentIndex = activeItemId
      ? serviceItems.findIndex((item) => item.id === activeItemId)
      : serviceItems.findIndex((item) => item.content.id === previewSlide?.id);
    const previousIndex = Math.max(currentIndex - 1, 0);
    setActiveItem(serviceItems[Math.max(previousIndex, 0)].id).catch(console.error);
  }, [activeItemId, previewSlide?.id, serviceItems, setActiveItem]);

  const handleClear = useCallback(() => {
    backendApi.clearLive().then(setPresentation).catch(console.error);
  }, []);

  const handleGoLive = useCallback(() => {
    backendApi.goLive().then(setPresentation).catch(console.error);
  }, []);

  const handleProjectScripture = useCallback(() => {
    backendApi.projectScripture().then(setPresentation).catch(console.error);
  }, []);

  const handleClearDetections = useCallback(() => {
    setDetectedScriptures([]);
    lastDetectionTextRef.current = '';
    pendingDetectionPhraseRef.current = null;
    backendApi.clearDetections().catch((error) => {
      console.error(error);
    });
  }, []);

  const handleScriptureToPreview = useCallback(
    async (scripture: DetectedScripture) => {
      const translation = scripture.matchedTranslation ?? preferredTranslation;
      const content = await backendApi.getScriptureContent(scripture.reference, translation);
      const state = await backendApi.setPreview(content);
      setPresentation(state);
    },
    [preferredTranslation],
  );

  const handleScriptureLibraryPreview = useCallback(
    async (verse: Parameters<typeof scriptureToPresentationContent>[0]) => {
      const content = scriptureToPresentationContent(verse);
      const state = await backendApi.setPreview(content);
      setPresentation(state);
    },
    [],
  );

  const handleScriptureLibraryGoLive = useCallback(
    async (verse: Parameters<typeof scriptureToPresentationContent>[0]) => {
      const content = scriptureToPresentationContent(verse);
      await backendApi.setPreview(content);
      const state = await backendApi.goLive();
      setPresentation(state);
    },
    [],
  );

  const handleMediaPreview = useCallback(async (item: LocalMediaItem) => {
    const content = mediaToPresentationContent(item);
    const state = await backendApi.setPreview(content);
    setPresentation(state);
  }, []);

  const handleMediaGoLive = useCallback(async (item: LocalMediaItem) => {
    const content = mediaToPresentationContent(item);
    await backendApi.setPreview(content);
    const state = await backendApi.goLive();
    setPresentation(state);
  }, []);

  const handleSongPreview = useCallback(async (song: Song, segmentIndex = 0) => {
    const segment = song.verses[segmentIndex] ?? song.verses[0];
    if (!segment) {
      return;
    }
    const content = songSegmentToPresentationContent(song, segment, segmentIndex);
    const state = await backendApi.setPreview(content);
    setPresentation(state);
  }, []);

  const handleSongSchedule = useCallback(
    async (song: Song, goLive: boolean) => {
      let firstItemId: string | null = null;
      for (let i = 0; i < song.verses.length; i++) {
        const content = songSegmentToPresentationContent(song, song.verses[i], i);
        const segmentLabel =
          song.verses[i].label?.trim() ||
          song.verses[i].type.charAt(0).toUpperCase() + song.verses[i].type.slice(1);
        const created = await backendApi.addServiceItem({
          type: 'song',
          title: song.title,
          subtitle: [song.artist, segmentLabel].filter(Boolean).join(' · '),
          itemRef: `${song.id}:${i}`,
          content,
        });
        if (i === 0) {
          firstItemId = created.id;
        }
      }
      if (firstItemId) {
        await setActiveItem(firstItemId);
      }
      if (goLive) {
        const state = await backendApi.goLive();
        setPresentation(state);
      }
    },
    [setActiveItem],
  );

  const handleReorder = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const nextItems = [...serviceItems];
      const [removed] = nextItems.splice(dragIndex, 1);
      nextItems.splice(hoverIndex, 0, removed);
      setServiceItems(nextItems);
      backendApi
        .reorderServiceItems(nextItems.map((item) => item.id))
        .then((flow) => {
          setServiceItems(flow.items);
          setActiveItemId(flow.activeItemId);
        })
        .catch((error) => {
          console.error(error);
          refreshBackendState().catch(console.error);
        });
    },
    [refreshBackendState, serviceItems],
  );

  const handleItemClick = useCallback(
    (item: ServiceFlowItem) => {
      setActiveItem(item.id).catch(console.error);
    },
    [setActiveItem],
  );

  const handleItemDoubleClick = useCallback(
    async (item: ServiceFlowItem) => {
      await setActiveItem(item.id);
      const state = await backendApi.goLive();
      setPresentation(state);
    },
    [setActiveItem],
  );

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !isInput)) {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'Enter' && !isInput) {
        e.preventDefault();
        handleGoLive();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      } else if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        handleProjectScripture();
      } else if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        setIsAIOpen((current) => !current);
      } else if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        setIsMicActive((current) => !current);
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleClear, handleGoLive, handleNext, handlePrevious, handleProjectScripture]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full w-full min-h-0 max-h-full flex flex-col bg-[#1a1a1a] text-[#e0e0e0] overflow-hidden">
        <TopBar
          onNext={handleNext}
          onPrevious={handlePrevious}
          onClear={handleClear}
          onGoLive={handleGoLive}
          onProjectScripture={handleProjectScripture}
          onToggleAI={() => setIsAIOpen(!isAIOpen)}
          onToggleMic={() => setIsMicActive(!isMicActive)}
          isAIOpen={isAIOpen}
          isMicActive={isMicActive}
          hasPreview={!!previewSlide}
        />

        {backendStatus !== 'connected' && (
          <div className="shrink-0 px-4 py-2 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-b border-yellow-500/30 text-sm">
            Backend status: {backendStatus}. Start it with <code>npm run backend:dev</code>.
          </div>
        )}

        <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
              <SchedulePanel
                serviceItems={serviceItems}
                previewItemId={previewItemId}
                liveItemId={liveItemId}
                onReorder={handleReorder}
                onItemClick={handleItemClick}
                onItemDoubleClick={handleItemDoubleClick}
              />
              <CenterPanel
                previewSlide={previewSlide}
                liveSlide={liveSlide}
                onGoLive={handleGoLive}
              />
            </div>

            <ResourceLibraryPanel
              preferredTranslation={preferredTranslation}
              onTranslationChange={setPreferredTranslation}
              onScripturePreview={(verse) =>
                handleScriptureLibraryPreview(verse).catch(console.error)
              }
              onScriptureGoLive={(verse) =>
                handleScriptureLibraryGoLive(verse).catch(console.error)
              }
              onMediaPreview={(item) => handleMediaPreview(item).catch(console.error)}
              onMediaGoLive={(item) => handleMediaGoLive(item).catch(console.error)}
              onSongPreview={(song, segmentIndex) =>
                handleSongPreview(song, segmentIndex).catch(console.error)
              }
              onSongSchedule={(song, goLive) =>
                handleSongSchedule(song, goLive).catch(console.error)
              }
            />
          </div>

          <RightPanel
            isOpen={isAIOpen}
            onToggle={() => setIsAIOpen((current) => !current)}
            isMicActive={isMicActive}
            micStatus={micStatus}
            interimTranscript={liveTranscript || interimTranscript}
            preferredTranslation={preferredTranslation}
            onTranslationChange={setPreferredTranslation}
            transcriptLines={transcriptLines}
            detectedScriptures={detectedScriptures}
            onClearDetections={handleClearDetections}
            onScriptureToPreview={(scripture) =>
              handleScriptureToPreview(scripture).catch(console.error)
            }
          />
        </div>

        <KeyboardHints />
        <QuickHints />
      </div>
    </DndProvider>
  );
}
