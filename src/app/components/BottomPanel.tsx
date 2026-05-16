import { useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Music, BookOpen, Image as ImageIcon, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { ServiceFlowItem } from '../lib/backend';

interface BottomPanelProps {
  serviceItems: ServiceFlowItem[];
  previewItemId: string | null;
  liveItemId: string | null;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onItemClick: (item: ServiceFlowItem) => void;
  onItemDoubleClick: (item: ServiceFlowItem) => void;
}

interface DraggableItemProps {
  item: ServiceFlowItem;
  index: number;
  isPreview: boolean;
  isLive: boolean;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onItemClick: (item: ServiceFlowItem) => void;
  onItemDoubleClick: (item: ServiceFlowItem) => void;
}

function DraggableServiceItem({ item, index, isPreview, isLive, onReorder, onItemClick, onItemDoubleClick }: DraggableItemProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'SERVICE_ITEM',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'SERVICE_ITEM',
    hover: (draggedItem: { index: number }) => {
      if (draggedItem.index !== index) {
        onReorder(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  const getIcon = () => {
    switch (item.type) {
      case 'song':
        return <Music size={18} />;
      case 'scripture':
        return <BookOpen size={18} />;
      case 'media':
        return <ImageIcon size={18} />;
    }
  };

  const getBorderStyle = () => {
    if (isLive) return 'border-red-500 shadow-lg shadow-red-500/30 bg-red-500/10 dark:bg-red-950/50';
    if (isPreview) return 'border-yellow-500 bg-yellow-500/15 dark:bg-yellow-950/30';
    if (isDragging) return 'border-border bg-muted opacity-50';
    return 'border-border bg-muted hover:border-primary/30';
  };

  return (
    <div
      ref={(node) => drag(drop(node))}
      onClick={() => onItemClick(item)}
      onDoubleClick={() => onItemDoubleClick(item)}
      className={`relative flex-shrink-0 w-56 p-3 rounded-lg border-2 cursor-pointer transition-all ${getBorderStyle()}`}
    >
      {isLive && (
        <div className="absolute -top-1 -right-1 flex items-center gap-1 px-2 py-0.5 bg-red-600 rounded-full text-xs font-bold text-white">
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
          LIVE
        </div>
      )}
      {isPreview && !isLive && (
        <div className="absolute -top-1 -right-1 px-2 py-0.5 bg-yellow-600 rounded-full text-xs font-bold text-white">
          PREVIEW
        </div>
      )}
      <div className="flex items-start gap-2">
        <div className="mt-0.5 cursor-grab active:cursor-grabbing">
          <GripVertical
            size={16}
            className={isLive || isPreview ? 'text-white' : 'text-muted-foreground'}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={isLive || isPreview ? 'text-white' : 'text-muted-foreground'}>
              {getIcon()}
            </div>
            <div
              className={`font-medium truncate ${isLive || isPreview ? 'text-white' : 'text-foreground'}`}
            >
              {item.title}
            </div>
          </div>
          {item.subtitle && (
            <div
              className={`text-sm truncate ${isLive ? 'text-red-100' : isPreview ? 'text-yellow-100' : 'text-muted-foreground'}`}
            >
              {item.subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BottomPanel({ serviceItems, previewItemId, liveItemId, onReorder, onItemClick, onItemDoubleClick }: BottomPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (!expanded) {
    return (
      <div className="shrink-0 bg-card border-t border-border w-full min-w-0">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-muted/80 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ChevronUp size={18} className="text-muted-foreground shrink-0" aria-hidden />
            <h2 className="text-foreground font-semibold text-sm truncate">Service Flow</h2>
            <span className="text-muted-foreground text-xs shrink-0">({serviceItems.length})</span>
          </div>
          <span className="text-muted-foreground text-xs shrink-0 hidden sm:inline">Show strip</span>
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 flex flex-col bg-card border-t border-border w-full min-w-0 max-h-[min(38vh,280px)]">
      <div className="p-3 border-b border-border flex items-center justify-between gap-3 min-w-0">
        <h2 className="text-foreground font-semibold text-sm shrink-0">Service Flow</h2>
        <span className="text-muted-foreground text-xs hidden lg:inline truncate text-right">
          Single click = Preview • Double click = Go Live
        </span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          title="Collapse service flow"
          aria-expanded={true}
          aria-label="Collapse service flow"
        >
          <ChevronDown size={18} />
        </button>
      </div>
      <div className="p-3 overflow-x-auto overflow-y-hidden min-h-0 flex-1">
        <div className="flex gap-3 w-max max-w-none pb-1">
          {serviceItems.map((item, index) => (
            <DraggableServiceItem
              key={item.id}
              item={item}
              index={index}
              isPreview={item.id === previewItemId}
              isLive={item.id === liveItemId}
              onReorder={onReorder}
              onItemClick={onItemClick}
              onItemDoubleClick={onItemDoubleClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
