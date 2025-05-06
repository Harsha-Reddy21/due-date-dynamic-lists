
import React from "react";
import { Task, TaskWithPriority } from "@/types/task";
import { formatPriorityScore, getPriorityClass, calculateDaysUntilDue } from "@/lib/priority-utils";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Trash2, Check, Calendar } from "lucide-react";
import { useTaskContext } from "@/contexts/TaskContext";
import { format } from "date-fns";

interface TaskCardProps {
  task: TaskWithPriority;
  showScore?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, showScore = true }) => {
  const { updateTask, deleteTask } = useTaskContext();
  const daysUntilDue = calculateDaysUntilDue(task.dueDate);
  
  const handleDelete = () => {
    deleteTask(task.id);
  };
  
  const handleComplete = () => {
    // In a real app, you might move this to a "completed" state or archive
    deleteTask(task.id);
  };
  
  // Determine message about due date
  const getDueDateMessage = () => {
    if (daysUntilDue === 0) return "Due today";
    if (daysUntilDue === 1) return "Due tomorrow";
    if (daysUntilDue < 0) return `Overdue by ${Math.abs(daysUntilDue)} days`;
    return `Due in ${daysUntilDue} days`;
  };
  
  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow duration-200">
      <div 
        className={`h-2 rounded-t-md ${getPriorityClass(task.weight)}`} 
        title={`Priority: ${task.weight}`}
      />
      <CardHeader className="pb-2">
        <h3 className="text-lg font-medium">{task.title}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
          {task.description}
        </p>
        <div className="flex items-center text-sm gap-1">
          <Calendar className="h-3 w-3 mr-1" />
          <span className={`font-medium ${daysUntilDue < 0 ? 'text-destructive' : daysUntilDue === 0 ? 'text-orange-500' : ''}`}>
            {getDueDateMessage()}
          </span>
          <span className="text-muted-foreground">
            ({format(new Date(task.dueDate), "MMM d, yyyy")})
          </span>
        </div>
        
        {showScore && (
          <div className="mt-2 text-xs font-mono bg-gray-100 rounded px-2 py-1 inline-block">
            Score: {formatPriorityScore(task.priorityScore)}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleComplete}
        >
          <Check className="h-4 w-4 mr-1" /> Complete
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TaskCard;
