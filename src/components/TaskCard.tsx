
import React from "react";
import { Task, TaskWithPriority } from "@/types/task";
import { formatPriorityScore, getPriorityClass, calculateDaysUntilDue } from "@/lib/priority-utils";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Trash2, Check, Calendar, AlertTriangle } from "lucide-react";
import { useTaskContext } from "@/contexts/TaskContext";
import { format } from "date-fns";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";

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

  // Calculate urgency for progress bar
  const calculateUrgency = () => {
    if (daysUntilDue < 0) return 100;
    if (daysUntilDue === 0) return 90;
    if (daysUntilDue === 1) return 70;
    if (daysUntilDue <= 3) return 50;
    if (daysUntilDue <= 7) return 30;
    return 10;
  };
  
  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div 
        className={`h-2 ${getPriorityClass(task.weight)}`} 
        title={`Priority: ${task.weight}`}
      />
      <CardHeader className="pb-2">
        <h3 className="text-lg font-semibold">{task.title}</h3>
        {showScore && (
          <Badge variant="outline" className="w-fit text-xs">
            Score: {formatPriorityScore(task.priorityScore)}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {task.description || "No description provided."}
        </p>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              {daysUntilDue < 0 && <AlertTriangle className="h-3 w-3 mr-1 text-destructive" />}
              <Calendar className="h-3 w-3 mr-1" />
              <span className={`${daysUntilDue < 0 ? 'text-destructive font-medium' : daysUntilDue === 0 ? 'text-amber-500 font-medium' : ''}`}>
                {getDueDateMessage()}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {format(new Date(task.dueDate), "MMM d, yyyy")}
            </span>
          </div>
          
          <Progress value={calculateUrgency()} className="h-1.5" 
            style={{
              backgroundColor: 'hsl(var(--muted))', 
              '--progress-color': daysUntilDue < 0 ? 'hsl(var(--destructive))' : 
                                 daysUntilDue === 0 ? '#f59e0b' : 
                                 daysUntilDue <= 3 ? '#3b82f6' : 
                                 'hsl(var(--primary))'
            } as React.CSSProperties} />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
          onClick={handleComplete}
        >
          <Check className="h-4 w-4" /> Complete
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          className="hover:bg-red-50 hover:text-red-600"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TaskCard;
