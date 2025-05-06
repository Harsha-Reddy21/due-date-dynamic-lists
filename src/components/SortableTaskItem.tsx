
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableTaskItemProps {
  id: string;
  children: React.ReactNode;
}

export function SortableTaskItem({ id, children }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div className="absolute left-[-30px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab transition-opacity">
        <div {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
      {children}
    </div>
  );
}
