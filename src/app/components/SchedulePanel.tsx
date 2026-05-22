import { useDrag, useDrop } from 'react-dnd';
import { Music, BookOpen, Image as ImageIcon, GripVertical } from 'lucide-react';
import { ServiceFlowItem } from '../lib/backend';

interface SchedulePanelProps {
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

function DraggableServiceItem({
  item,
  index,
  isPreview,
  isLive,
  onReorder,
  onItemClick,
  onItemDoubleClick,
}: DraggableItemProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'SERVICE_ITEM',
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
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
        return <Music size={14} />;
      case 'scripture':
        return <BookOpen size={14} />;
      case 'media':
        return <ImageIcon size={14} />;
    }
  };

  const getStyle = () => {
    if (isLive) return 'bg-red-950/80 border-red-600 text-white';
    if (isPreview) return 'bg-amber-950/60 border-amber-600/80 text-amber-50';
    if (isDragging) return 'bg-muted/50 border-border opacity-50';
    return 'bg-card border-border hover:bg-muted/60 text-foreground';
  };

  return (
    <div
      ref={(node) => drag(drop(node))}
      onClick={() => onItemClick(item)}
      onDoubleClick={() => onItemDoubleClick(item)}
      className={`flex items-start gap-1.5 px-2 py-2 border rounded cursor-pointer transition-colors text-sm ${getStyle()}`}
      title="Click to preview • Double-click to go live"
    >
      <GripVertical size={12} className="shrink-0 mt-0.5 opacity-50 cursor-grab" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="shrink-0 opacity-70">{getIcon()}</span>
          <span className="font-medium truncate">{item.title}</span>
        </div>
        {item.subtitle ? (
          <p className="text-xs opacity-70 truncate mt-0.5">{item.subtitle}</p>
        ) : null}
      </div>
      {isLive ? (
        <span className="text-[10px] font-bold text-red-300 shrink-0">LIVE</span>
      ) : isPreview ? (
        <span className="text-[10px] font-bold text-amber-300 shrink-0">PV</span>
      ) : null}
    </div>
  );
}

export function SchedulePanel({
  serviceItems,
  previewItemId,
  liveItemId,
  onReorder,
  onItemClick,
  onItemDoubleClick,
}: SchedulePanelProps) {
  return (
    <div className="w-52 shrink-0 flex flex-col bg-[#1e1e1e] border-r border-[#3a3a3a] min-h-0">
      <div className="h-7 shrink-0 flex items-center px-2 border-b border-[#3a3a3a] bg-[#252525]">
        <span className="text-xs font-semibold text-[#c8c8c8] tracking-wide">Schedule</span>
        <span className="ml-auto text-[10px] text-[#888]">{serviceItems.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 p-1.5 space-y-1">
        {serviceItems.length === 0 ? (
          <p className="text-xs text-[#666] italic px-2 py-4 text-center">
            Drag items here or add from the library below
          </p>
        ) : (
          serviceItems.map((item, index) => (
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
          ))
        )}
      </div>
    </div>
  );
}
