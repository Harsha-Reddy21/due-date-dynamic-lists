
import React from "react";
import { useTaskContext } from "@/contexts/TaskContext";
import TaskCard from "./TaskCard";
import { TaskWithPriority } from "@/types/task";

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
        <div className="animate-pulse text-center">
          <p>Loading tasks...</p>
        </div>
      </div>
    );
  }
  
  if (tasksToRender.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed rounded-md">
        <p className="text-muted-foreground">No tasks found</p>
        <p className="text-sm">Create a new task to get started</p>
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
