
import React, { useEffect, useState } from "react";
import { useTaskContext } from "@/contexts/TaskContext";
import TaskCard from "./TaskCard";
import { TaskWithPriority } from "@/types/task";
import { Loader2, Plus, SortAsc, SortDesc, RefreshCw } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableTaskItem } from "./SortableTaskItem";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import TaskForm from "./TaskForm";
import { toast } from "./ui/sonner";

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
  const { tasks: allTasks, isLoading, updateTaskOrder, refreshTasks } = useTaskContext();
  const [isAddSubtaskDialogOpen, setIsAddSubtaskDialogOpen] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const tasksToRender = tasks || allTasks.filter(task => task.parentId === parentId);
  
  // Sort tasks by priority score (based on sort direction)
  const sortedTasks = [...tasksToRender].sort((a, b) => {
    return sortDirection === 'desc' 
      ? b.priorityScore - a.priorityScore 
      : a.priorityScore - b.priorityScore;
  });
  
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
  
  // Handle add subtask
  const handleAddSubtask = (taskId: string) => {
    setIsAddSubtaskDialogOpen(taskId);
  };
  
  // Handle closing the dialog
  const handleDialogClose = () => {
    setIsAddSubtaskDialogOpen(null);
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshTasks();
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Tasks refreshed successfully");
    }, 500); // Add a small delay for better UX
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
      <div className={`text-center py-8 border border-dashed rounded-md bg-gray-50 ${nestingLevel > 0 ? 'py-6' : 'py-12'}`}>
        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-muted-foreground text-sm mb-1">{nestingLevel > 0 ? 'No subtasks found' : 'No tasks found'}</p>
        <p className="text-xs text-muted-foreground">{nestingLevel > 0 ? 'Add a subtask to get started' : 'Create a new task to get started'}</p>
      </div>
    );
  }

  // Only show sort button at the root level
  const shouldShowSortButton = nestingLevel === 0;
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <div className="space-y-2 mb-4">
        {shouldShowSortButton && (
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="flex items-center gap-1 text-xs"
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleSortDirection}
              className="flex items-center gap-1 text-xs"
            >
              Sort by priority {sortDirection === 'desc' ? (
                <SortDesc className="h-3 w-3" />
              ) : (
                <SortAsc className="h-3 w-3" />
              )}
            </Button>
          </div>
        )}
      </div>
      
      <SortableContext items={sortedTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {sortedTasks.map((task) => (
            <div key={task.id} className={nestingLevel > 0 ? `pl-${nestingLevel * 4} ml-2 border-l-2 border-gray-100` : ''}>
              <SortableTaskItem id={task.id}>
                <TaskCard 
                  task={task} 
                  showScore={showScore} 
                  onAddSubtask={() => handleAddSubtask(task.id)}
                  isSubtask={nestingLevel > 0}
                />
              </SortableTaskItem>
              
              {/* Dialog for adding a subtask */}
              <Dialog open={isAddSubtaskDialogOpen === task.id} onOpenChange={handleDialogClose}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Add Subtask to "{task.title}"</DialogTitle>
                  </DialogHeader>
                  <TaskForm onSubmit={handleDialogClose} parentId={task.id} />
                </DialogContent>
              </Dialog>
              
              {/* Render child tasks recursively if they exist */}
              {task.children && task.children.length > 0 && (
                <div className="mt-2">
                  <TaskList
                    tasks={task.children as TaskWithPriority[]}
                    showScore={false}
                    nestingLevel={nestingLevel + 1}
                    parentId={task.id}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default TaskList;
