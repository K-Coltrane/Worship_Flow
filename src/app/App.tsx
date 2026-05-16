import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TopBar } from './components/TopBar';
import { LeftPanel } from './components/LeftPanel';
import { CenterPanel } from './components/CenterPanel';
import { RightPanel } from './components/RightPanel';
import { BottomPanel } from './components/BottomPanel';
import { KeyboardHints } from './components/KeyboardHints';
import { QuickHints } from './components/QuickHints';
import {
  backendApi,
  connectRealtime,
  DetectedScripture,
  mediaToPresentationContent,
  PresentationContent,
  PresentationState,
  scriptureToPresentationContent,
  ServiceFlowItem,
  songToPresentationContent,
} from './lib/backend';

const simulatedTranscription = [
  'And the Lord says in John chapter 3 verse 16.',
  'Turn with me to Psalm 23 verse 1.',
  'As it says in Romans 8:28.',
  'First Corinthians 13:4 tells us love is patient.',
];

const emptyPresentation: PresentationState = {
  preview: null,
  live: null,
  updatedAt: new Date(0).toISOString(),
};

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
  const simulationIndexRef = useRef(0);

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
        setDetectedScriptures((current) => [
          scripture,
          ...current.filter((item) => item.id !== scripture.id),
        ]);
      },
    });

    return () => socket.disconnect();
  }, [refreshBackendState]);

  useEffect(() => {
    if (!isMicActive) {
      return;
    }

    const timer = window.setInterval(() => {
      const text = simulatedTranscription[simulationIndexRef.current % simulatedTranscription.length];
      simulationIndexRef.current += 1;
      backendApi.processTranscription(text).catch((error) => {
        console.error(error);
        setBackendStatus('offline');
      });
    }, 3000);

    return () => window.clearInterval(timer);
  }, [isMicActive]);

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

  const addItemToServiceFlow = useCallback(
    async (item: any, type: string, shouldGoLive: boolean) => {
      let content: PresentationContent;
      let serviceType: 'song' | 'scripture' | 'media';
      let subtitle: string | undefined;
      let itemRef: string | undefined;

      if (type === 'songs') {
        content = songToPresentationContent(item);
        serviceType = 'song';
        subtitle = item.artist;
        itemRef = item.id;
      } else if (type === 'scriptures') {
        content = scriptureToPresentationContent(item);
        serviceType = 'scripture';
        subtitle = item.translation;
        itemRef = item.reference;
      } else {
        content = mediaToPresentationContent(item);
        serviceType = 'media';
        subtitle = item.type;
        itemRef = item.id;
      }

      const created = await backendApi.addServiceItem({
        type: serviceType,
        title: content.title,
        subtitle,
        itemRef,
        content,
      });

      await setActiveItem(created.id);

      if (shouldGoLive) {
        const state = await backendApi.goLive();
        setPresentation(state);
      }
    },
    [setActiveItem],
  );

  const handleScriptureToPreview = useCallback(async (scripture: DetectedScripture) => {
    const content = await backendApi.getScriptureContent(scripture.reference);
    const state = await backendApi.setPreview(content);
    setPresentation(state);
  }, []);

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
      <div className="h-full w-full min-h-0 max-h-full flex flex-col bg-background text-foreground overflow-hidden">
        <TopBar
          onNext={handleNext}
          onPrevious={handlePrevious}
          onClear={handleClear}
          onProjectScripture={handleProjectScripture}
          onToggleAI={() => setIsAIOpen(!isAIOpen)}
          onToggleMic={() => setIsMicActive(!isMicActive)}
          isAIOpen={isAIOpen}
          isMicActive={isMicActive}
        />

        {backendStatus !== 'connected' && (
          <div className="shrink-0 px-4 py-2 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-b border-yellow-500/30 text-sm">
            Backend status: {backendStatus}. Start it with <code>npm run backend:dev</code>.
          </div>
        )}

        <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
          <LeftPanel
            onItemSelect={(item, type) => addItemToServiceFlow(item, type, false).catch(console.error)}
            onItemDoubleClick={(item, type) =>
              addItemToServiceFlow(item, type, true).catch(console.error)
            }
          />

          <CenterPanel previewSlide={previewSlide} liveSlide={liveSlide} onGoLive={handleGoLive} />

          <RightPanel
            isOpen={isAIOpen}
            isMicActive={isMicActive}
            transcriptLines={transcriptLines}
            detectedScriptures={detectedScriptures}
            onScriptureToPreview={(scripture) => handleScriptureToPreview(scripture).catch(console.error)}
          />
        </div>

        <BottomPanel
          serviceItems={serviceItems}
          previewItemId={previewItemId}
          liveItemId={liveItemId}
          onReorder={handleReorder}
          onItemClick={handleItemClick}
          onItemDoubleClick={handleItemDoubleClick}
        />

        <KeyboardHints />
        <QuickHints />
      </div>
    </DndProvider>
  );
}
