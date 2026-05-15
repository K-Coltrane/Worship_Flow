import { useDrag, useDrop } from 'react-dnd';
import { Music, BookOpen, Image as ImageIcon, GripVertical } from 'lucide-react';

interface ServiceItem {
  id: string;
  type: 'song' | 'scripture' | 'media';
  title: string;
  subtitle?: string;
}

interface BottomPanelProps {
  serviceItems: ServiceItem[];
  previewItemId: string | null;
  liveItemId: string | null;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onItemClick: (item: ServiceItem) => void;
  onItemDoubleClick: (item: ServiceItem) => void;
}

interface DraggableItemProps {
  item: ServiceItem;
  index: number;
  isPreview: boolean;
  isLive: boolean;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onItemClick: (item: ServiceItem) => void;
  onItemDoubleClick: (item: ServiceItem) => void;
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
    if (isLive) return 'border-red-500 shadow-lg shadow-red-500/30 bg-red-950/50';
    if (isPreview) return 'border-yellow-500 bg-yellow-950/30';
    if (isDragging) return 'border-zinc-600 bg-zinc-700 opacity-50';
    return 'border-zinc-700 bg-zinc-800 hover:border-zinc-600';
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
          <GripVertical size={16} className={isLive || isPreview ? 'text-white' : 'text-zinc-500'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={isLive || isPreview ? 'text-white' : 'text-zinc-400'}>
              {getIcon()}
            </div>
            <div className={`font-medium truncate ${isLive || isPreview ? 'text-white' : 'text-white'}`}>
              {item.title}
            </div>
          </div>
          {item.subtitle && (
            <div className={`text-sm truncate ${isLive ? 'text-red-100' : isPreview ? 'text-yellow-100' : 'text-zinc-400'}`}>
              {item.subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BottomPanel({ serviceItems, previewItemId, liveItemId, onReorder, onItemClick, onItemDoubleClick }: BottomPanelProps) {
  return (
    <div className="h-30 bg-zinc-900 border-t border-zinc-800">
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-white font-semibold text-sm">Service Flow</h2>
        <span className="text-zinc-400 text-xs">
          Single click = Preview • Double click = Go Live
        </span>
      </div>
      <div className="p-3 overflow-x-auto">
        <div className="flex gap-3 min-w-max">
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
