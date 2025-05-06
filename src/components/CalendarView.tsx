
import React, { useState, useMemo } from "react";
import { useTaskContext } from "@/contexts/TaskContext";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
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
  
  const daysInMonth = useMemo(() => {
    const firstDay = startOfMonth(currentMonth);
    const lastDay = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: firstDay, end: lastDay });
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
          <span className="text-lg font-medium">
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
            {daysInMonth.map((date) => {
              const tasksForDate = getTasksForDate(date);
              const isToday = isSameDay(date, new Date());
              const isCurrentMonth = isSameMonth(date, currentMonth);
              
              return (
                <div
                  key={date.toString()}
                  className={`
                    min-h-[80px] rounded-md p-1 border
                    ${isToday ? 'bg-primary/10 border-primary' : 'hover:bg-accent'}
                    ${!isCurrentMonth ? 'text-muted-foreground' : ''}
                    cursor-pointer
                  `}
                  onClick={() => handleDateClick(date)}
                >
                  <div className="flex justify-between">
                    <span className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                      {format(date, 'd')}
                    </span>
                    {tasksForDate.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {tasksForDate.length}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-1">
                    {tasksForDate.slice(0, 2).map((task) => (
                      <div key={task.id} className="text-xs truncate mb-1 p-1 bg-secondary/10 rounded">
                        {task.title}
                      </div>
                    ))}
                    {tasksForDate.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{tasksForDate.length - 2} more
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
              Tasks for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}
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
