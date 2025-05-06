
import React from "react";
import { useTaskContext } from "@/contexts/TaskContext";
import TaskCard from "./TaskCard";
import { TaskWithPriority } from "@/types/task";
import { Loader2 } from "lucide-react";

interface TaskListProps {
  tasks?: TaskWithPriority[];
  showScore?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, showScore = true }) => {
  const { tasks: allTasks, isLoading } = useTaskContext();
  
  const tasksToRender = tasks || allTasks;
  
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
    <div className="space-y-4">
      {tasksToRender.map((task) => (
        <TaskCard 
          key={task.id} 
          task={task}
          showScore={showScore} 
        />
      ))}
    </div>
  );
};

export default TaskList;
