
import React, { useEffect } from "react";
import { useTaskContext } from "@/contexts/TaskContext";
import TaskCard from "./TaskCard";
import { TaskWithPriority } from "@/types/task";
import { Loader2 } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableTaskItem } from "./SortableTaskItem";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

interface TaskListProps {
  tasks?: TaskWithPriority[];
  showScore?: boolean;
  nestingLevel?: number;
  parentId?: string | null;
}

const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  showScore = true, 
  nestingLevel = 0,
  parentId = null
}) => {
  const { tasks: allTasks, isLoading, updateTaskOrder } = useTaskContext();
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const tasksToRender = tasks || allTasks.filter(task => task.parentId === parentId);
  
  // Sort tasks by priority score (highest first)
  const sortedTasks = [...tasksToRender].sort((a, b) => b.priorityScore - a.priorityScore);
  
  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = sortedTasks.findIndex(task => task.id === active.id);
      const newIndex = sortedTasks.findIndex(task => task.id === over.id);
      
      const newOrder = arrayMove(sortedTasks, oldIndex, newIndex);
      
      // Update the order in the context
      updateTaskOrder(newOrder, parentId);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-pulse text-center flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p>Loading tasks...</p>
        </div>
      </div>
    );
  }
  
  if (tasksToRender.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-md bg-gray-50">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-muted-foreground mb-1">No tasks found</p>
        <p className="text-sm text-muted-foreground">Create a new task to get started</p>
      </div>
    );
  }
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <SortableContext items={sortedTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4" style={{ paddingLeft: nestingLevel > 0 ? `${nestingLevel * 16}px` : '0' }}>
          {sortedTasks.map((task) => (
            <div key={task.id}>
              <SortableTaskItem id={task.id}>
                <TaskCard task={task} showScore={showScore} />
              </SortableTaskItem>
              
              {/* Render child tasks recursively if they exist */}
              {task.children && task.children.length > 0 && (
                <TaskList
                  tasks={task.children as TaskWithPriority[]}
                  showScore={showScore}
                  nestingLevel={nestingLevel + 1}
                  parentId={task.id}
                />
              )}
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default TaskList;
