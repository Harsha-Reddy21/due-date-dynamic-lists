
import React, { useState, useMemo } from "react";
import { useTaskContext } from "@/contexts/TaskContext";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth, 
  addDays,
  startOfWeek,
  endOfWeek 
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import TaskCard from "./TaskCard";
import { TaskWithPriority } from "@/types/task";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

const CalendarView: React.FC = () => {
  const { tasks, isLoading } = useTaskContext();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Generate calendar days including dates from previous and next months
  // to fill the calendar grid properly
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);
  
  // Group tasks by due date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, TaskWithPriority[]> = {};
    
    tasks.forEach(task => {
      const dueDate = new Date(task.dueDate);
      const dateKey = format(dueDate, 'yyyy-MM-dd');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push(task);
    });
    
    return grouped;
  }, [tasks]);
  
  // Handle month navigation
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };
  
  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };
  
  // Get tasks for selected date
  const getTasksForDate = (date: Date): TaskWithPriority[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return tasksByDate[dateKey] || [];
  };
  
  // Get active tasks for a date (not completed)
  const getActiveTasksForDate = (date: Date): TaskWithPriority[] => {
    return getTasksForDate(date).filter(task => !task.completed);
  };
  
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsDialogOpen(true);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <CalendarIcon className="h-6 w-6" />
          Calendar View
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-medium min-w-[150px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mt-2">
            {calendarDays.map((date) => {
              const tasksForDate = getTasksForDate(date);
              const activeTasksForDate = getActiveTasksForDate(date);
              const isToday = isSameDay(date, new Date());
              const isCurrentMonth = isSameMonth(date, currentMonth);
              
              return (
                <div
                  key={date.toString()}
                  className={`
                    min-h-[80px] rounded-md p-1 border
                    ${isToday ? 'bg-primary/10 border-primary' : 'hover:bg-accent'}
                    ${!isCurrentMonth ? 'text-muted-foreground bg-gray-50' : ''}
                    cursor-pointer
                  `}
                  onClick={() => handleDateClick(date)}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium 
                      ${isToday ? 'text-primary' : ''}
                      ${!isCurrentMonth ? 'text-gray-400' : ''}
                    `}>
                      {format(date, 'd')}
                    </span>
                    {activeTasksForDate.length > 0 && (
                      <Badge variant="outline" className={`text-xs ${isCurrentMonth ? 'bg-primary/20' : 'bg-gray-100'}`}>
                        {activeTasksForDate.length}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-1">
                    {activeTasksForDate.slice(0, 2).map((task) => (
                      <div 
                        key={task.id} 
                        className={`
                          text-xs truncate mb-1 p-1 rounded
                          ${isCurrentMonth ? 'bg-secondary/10' : 'bg-gray-100/50 text-gray-500'}
                        `}
                      >
                        {task.title}
                      </div>
                    ))}
                    {activeTasksForDate.length > 2 && (
                      <div className={`text-xs ${isCurrentMonth ? 'text-muted-foreground' : 'text-gray-400'}`}>
                        +{activeTasksForDate.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Tasks for {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-4 py-4">
            {selectedDate && getTasksForDate(selectedDate).length > 0 ? (
              getTasksForDate(selectedDate).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No tasks for this date
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarView;
