import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TopBar } from './components/TopBar';
import { LeftPanel } from './components/LeftPanel';
import { CenterPanel } from './components/CenterPanel';
import { RightPanel } from './components/RightPanel';
import { BottomPanel } from './components/BottomPanel';
import { KeyboardHints } from './components/KeyboardHints';
import { QuickHints } from './components/QuickHints';

interface ServiceItem {
  id: string;
  type: 'song' | 'scripture' | 'media';
  title: string;
  subtitle?: string;
  content?: string;
}

const initialServiceItems: ServiceItem[] = [
  { id: '1', type: 'song', title: 'Amazing Grace', subtitle: 'Traditional', content: 'Amazing grace, how sweet the sound\nThat saved a wretch like me\nI once was lost, but now am found\nWas blind, but now I see' },
  { id: '2', type: 'scripture', title: 'John 3:16', subtitle: 'NIV', content: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.' },
  { id: '3', type: 'song', title: 'How Great Thou Art', subtitle: 'Traditional', content: 'O Lord my God, when I in awesome wonder\nConsider all the worlds Thy hands have made\nI see the stars, I hear the rolling thunder\nThy power throughout the universe displayed' },
  { id: '4', type: 'scripture', title: 'Psalm 23:1-3', subtitle: 'NIV', content: 'The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.' },
];

export default function App() {
  const [isAIOpen, setIsAIOpen] = useState(true);
  const [isMicActive, setIsMicActive] = useState(false);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>(initialServiceItems);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [liveIndex, setLiveIndex] = useState(-1);

  const handleNext = () => {
    setPreviewIndex(prev => Math.min(prev + 1, serviceItems.length - 1));
  };

  const handlePrevious = () => {
    setPreviewIndex(prev => Math.max(prev - 1, 0));
  };

  const handleClear = () => {
    setLiveIndex(-1);
  };

  const handleGoLive = () => {
    if (previewIndex >= 0) {
      setLiveIndex(previewIndex);
    }
  };

  const handleScriptureToPreview = (scripture?: any) => {
    if (scripture) {
      const scriptureItem: ServiceItem = {
        id: `scripture-${Date.now()}`,
        type: 'scripture',
        title: scripture.reference,
        subtitle: 'NIV',
        content: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.'
      };
      setServiceItems(prev => [...prev, scriptureItem]);
      setPreviewIndex(serviceItems.length);
    }
  };

  const handleProjectScripture = () => {
    if (previewSlide) {
      setLiveIndex(previewIndex);
    }
  };

  const handleItemSelect = (item: any, type: string) => {
    const newItem: ServiceItem = {
      id: `${type}-${Date.now()}`,
      type: type as 'song' | 'scripture' | 'media',
      title: item.title || item.reference || item.name,
      subtitle: item.artist || item.version || item.type,
      content: 'Sample content for ' + (item.title || item.reference || item.name)
    };
    setServiceItems(prev => [...prev, newItem]);
    setPreviewIndex(serviceItems.length);
  };

  const handleItemDoubleClickFromLibrary = (item: any, type: string) => {
    const newItem: ServiceItem = {
      id: `${type}-${Date.now()}`,
      type: type as 'song' | 'scripture' | 'media',
      title: item.title || item.reference || item.name,
      subtitle: item.artist || item.version || item.type,
      content: 'Sample content for ' + (item.title || item.reference || item.name)
    };
    setServiceItems(prev => [...prev, newItem]);
    const newIndex = serviceItems.length;
    setPreviewIndex(newIndex);
    setLiveIndex(newIndex);
  };

  const handleReorder = (dragIndex: number, hoverIndex: number) => {
    const newItems = [...serviceItems];
    const [removed] = newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, removed);
    setServiceItems(newItems);

    if (previewIndex === dragIndex) {
      setPreviewIndex(hoverIndex);
    } else if (dragIndex < previewIndex && hoverIndex >= previewIndex) {
      setPreviewIndex(previewIndex - 1);
    } else if (dragIndex > previewIndex && hoverIndex <= previewIndex) {
      setPreviewIndex(previewIndex + 1);
    }

    if (liveIndex === dragIndex) {
      setLiveIndex(hoverIndex);
    } else if (dragIndex < liveIndex && hoverIndex >= liveIndex) {
      setLiveIndex(liveIndex - 1);
    } else if (dragIndex > liveIndex && hoverIndex <= liveIndex) {
      setLiveIndex(liveIndex + 1);
    }
  };

  const handleItemClick = (item: ServiceItem) => {
    const index = serviceItems.findIndex(i => i.id === item.id);
    setPreviewIndex(index);
  };

  const handleItemDoubleClick = (item: ServiceItem) => {
    const index = serviceItems.findIndex(i => i.id === item.id);
    setPreviewIndex(index);
    setLiveIndex(index);
  };

  const previewSlide = previewIndex >= 0 ? serviceItems[previewIndex] : null;
  const liveSlide = liveIndex >= 0 ? serviceItems[liveIndex] : null;

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
        setIsAIOpen(!isAIOpen);
      } else if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        setIsMicActive(!isMicActive);
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [previewIndex, serviceItems.length, isAIOpen, isMicActive]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full w-full min-h-0 max-h-full flex flex-col bg-background text-foreground overflow-hidden">
        <TopBar
          onNext={handleNext}
          onPrevious={handlePrevious}
          onClear={handleClear}
          onProjectScripture={() => handleProjectScripture()}
          onToggleAI={() => setIsAIOpen(!isAIOpen)}
          onToggleMic={() => setIsMicActive(!isMicActive)}
          isAIOpen={isAIOpen}
          isMicActive={isMicActive}
        />

        <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
          <LeftPanel
            onItemSelect={handleItemSelect}
            onItemDoubleClick={handleItemDoubleClickFromLibrary}
          />

          <CenterPanel previewSlide={previewSlide} liveSlide={liveSlide} onGoLive={handleGoLive} />

          <RightPanel
            isOpen={isAIOpen}
            isMicActive={isMicActive}
            onScriptureToPreview={handleScriptureToPreview}
          />
        </div>

        <BottomPanel
          serviceItems={serviceItems}
          previewItemId={previewSlide?.id || null}
          liveItemId={liveSlide?.id || null}
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