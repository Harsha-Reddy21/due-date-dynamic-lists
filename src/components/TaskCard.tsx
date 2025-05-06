import React, { useState } from "react";
import { Task } from "@/types/task";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { formatPriorityScore } from "@/lib/priority-utils";
import { Button } from "@/components/ui/button";
import { 
  Calendar as CalendarIcon, 
  Edit, 
  Plus, 
  Trash2 
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

interface TaskCardProps {
  task: Task;
  showScore?: boolean;
  onAddSubtask?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, showScore = true, onAddSubtask }) => {
  const { deleteTask } = useTaskContext();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Format the due date to a relative time (e.g., "in 2 days", "2 days ago")
  const formattedDueDate = formatDistanceToNow(new Date(task.dueDate), {
    addSuffix: true
  });

  // Get the priority color based on the weight
  const getPriorityColor = (weight: number) => {
    switch (weight) {
      case 1: return "bg-gray-100 text-gray-800";
      case 2: return "bg-blue-100 text-blue-800";
      case 3: return "bg-amber-100 text-amber-800";
      case 4: return "bg-orange-100 text-orange-800";
      case 5: return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
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
      return "bg-red-100 text-red-800";
    }
    
    // If due date is tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueTime === tomorrow.getTime()) {
      return "bg-orange-100 text-orange-800";
    }
    
    // If due date is within the next 3 days
    const threeDays = new Date(today);
    threeDays.setDate(threeDays.getDate() + 3);
    if (dueTime <= threeDays.getTime()) {
      return "bg-amber-100 text-amber-800";
    }
    
    // Otherwise, it's not urgent
    return "bg-green-100 text-green-800";
  };

  const handleDelete = () => {
    deleteTask(task.id);
  };
  
  return (
    <div className="flex flex-col p-4 border rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium">{task.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{task.description}</p>
        </div>
        
        <div className="flex gap-2">
          {showScore && task.priorityScore && (
            <Badge variant="outline" className="bg-primary-50 text-primary font-medium">
              Score: {formatPriorityScore(task.priorityScore)}
            </Badge>
          )}
          
          <Badge className={getPriorityColor(task.weight)}>
            Priority: {task.weight}
          </Badge>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-2">
        <Badge variant="outline" className={getDueDateColor()}>
          <CalendarIcon className="mr-1 h-3 w-3" />
          {formattedDueDate}
        </Badge>
        
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onAddSubtask}
            className="h-8 w-8"
            title="Add subtask"
          >
            <Plus className="h-4 w-4" />
          </Button>
          
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Edit task"
              >
                <Edit className="h-4 w-4" />
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
                className="h-8 w-8 hover:text-red-500"
                title="Delete task"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{task.title}" and all its subtasks.
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
