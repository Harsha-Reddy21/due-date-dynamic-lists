
import React, { useState } from "react";
import { Task } from "@/types/task";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { formatPriorityScore } from "@/lib/priority-utils";
import { Button } from "@/components/ui/button";
import { 
  Calendar as CalendarIcon, 
  Edit, 
  Plus, 
  Trash2,
  Clock,
  CheckSquare,
  Square
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTaskContext } from "@/contexts/TaskContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import EditTaskForm from "./EditTaskForm";
import { Checkbox } from "./ui/checkbox";
import { toast } from "./ui/sonner";

interface TaskCardProps {
  task: Task;
  showScore?: boolean;
  onAddSubtask?: () => void;
  isSubtask?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, showScore = true, onAddSubtask, isSubtask = false }) => {
  const { deleteTask, getTaskColor, updateTask } = useTaskContext();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Format the due date to a relative time (e.g., "in 2 days", "2 days ago")
  const formattedDueDate = formatDistanceToNow(new Date(task.dueDate), {
    addSuffix: true
  });

  // Format time from due date
  const formattedTime = format(new Date(task.dueDate), "h:mm a");

  // Get the priority color based on the weight
  const getPriorityColor = (weight: number) => {
    switch (weight) {
      case 1: return "bg-sky-100 text-sky-800 border-sky-200";
      case 2: return "bg-blue-100 text-blue-800 border-blue-200";
      case 3: return "bg-amber-100 text-amber-800 border-amber-200";
      case 4: return "bg-orange-100 text-orange-800 border-orange-200";
      case 5: return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };
  
  // Get the due date color based on days until due
  const getDueDateColor = () => {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueTime = dueDate.getTime();
    const todayTime = today.getTime();
    
    // If due date is today or in the past
    if (dueTime <= todayTime) {
      return "bg-red-100 text-red-800 border-red-200";
    }
    
    // If due date is tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueTime === tomorrow.getTime()) {
      return "bg-orange-100 text-orange-800 border-orange-200";
    }
    
    // If due date is within the next 3 days
    const threeDays = new Date(today);
    threeDays.setDate(threeDays.getDate() + 3);
    if (dueTime <= threeDays.getTime()) {
      return "bg-amber-100 text-amber-800 border-amber-200";
    }
    
    // Otherwise, it's not urgent
    return "bg-green-100 text-green-800 border-green-200";
  };

  const handleDelete = () => {
    deleteTask(task.id);
  };
  
  // Handle task completion toggle
  const handleCompletionToggle = () => {
    updateTask(task.id, { completed: !task.completed });
    toast(task.completed ? "Task marked as incomplete" : "Task marked as complete", {
      description: task.title,
      duration: 3000,
    });
  };
  
  // Get unique color for the task based on its ID
  const taskColor = getTaskColor(task.id);
  
  // Apply different styles for subtasks - improved with more visual distinction and reduced sizes
  const titleClassName = isSubtask 
    ? "font-medium text-xs text-gray-700"
    : "font-medium text-sm text-gray-800";
  
  const descriptionClassName = isSubtask
    ? "text-xs text-gray-500 mt-0.5"
    : "text-xs text-gray-600 mt-1";
    
  const badgeClassName = isSubtask
    ? "text-[10px] px-1.5 py-0.5"
    : "text-xs px-2 py-1";

  // Determine border and background styles based on priority and completion status
  const priorityBorderStyle = `border-l-4 border-l-[${taskColor}]`;
  const completedStyle = task.completed ? "opacity-60 bg-gray-50" : "";
  
  return (
    <div 
      className={`flex flex-col p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow ${
        isSubtask 
          ? `border border-gray-100 border-dashed bg-gray-50/60 mt-1.5 ml-4 ${task.completed ? "opacity-60" : ""}` 
          : `border border-gray-200 border-solid bg-white ${priorityBorderStyle} ${completedStyle}`
      }`}
      style={isSubtask ? {} : { borderLeftColor: taskColor }}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-start gap-2">
          <div className="pt-0.5">
            <Checkbox 
              checked={task.completed}
              onCheckedChange={handleCompletionToggle}
              className="border-gray-400"
            />
          </div>
          <div>
            <h3 
              className={`${titleClassName} ${task.completed ? "line-through text-gray-500" : ""}`}
              style={isSubtask ? {} : { color: task.completed ? "#888" : taskColor }}
            >
              {task.title}
            </h3>
            {task.description && (
              <p className={`${descriptionClassName} ${task.completed ? "text-gray-400" : ""}`}>
                {task.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {/* Show score for both main tasks and subtasks when score is available */}
          {showScore && task.priorityScore !== undefined && (
            <Badge variant="outline" className="bg-primary-50 text-primary font-medium text-xs border border-primary/20">
              Score: {formatPriorityScore(task.priorityScore)}
            </Badge>
          )}
          
          <Badge className={`${badgeClassName} ${getPriorityColor(task.weight)} border`}>
            P{task.weight}
          </Badge>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-1">
        <div className="flex gap-1 ml-7">
          <Badge variant="outline" className={`${badgeClassName} ${getDueDateColor()} border`}>
            <CalendarIcon className="mr-1 h-2.5 w-2.5" />
            {formattedDueDate}
          </Badge>
          
          <Badge variant="outline" className={`${badgeClassName} bg-gray-50 text-gray-700 border border-gray-200`}>
            <Clock className="mr-1 h-2.5 w-2.5" />
            {formattedTime}
          </Badge>
        </div>
        
        <div className="flex gap-1">
          {!isSubtask && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onAddSubtask}
              className="h-7 w-7"
              title="Add subtask"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
          
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Edit task"
              >
                <Edit className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
              </DialogHeader>
              <EditTaskForm task={task} onSubmit={() => setIsEditDialogOpen(false)} />
            </DialogContent>
          </Dialog>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:text-red-500"
                title="Delete task"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{task.title}" {!isSubtask && "and all its subtasks"}.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
