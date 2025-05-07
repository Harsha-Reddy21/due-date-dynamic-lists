
import React, { useState } from "react";
import TaskForm from "./TaskForm";
import TaskList from "./TaskList";
import CalendarView from "./CalendarView";
import { useTaskContext } from "@/contexts/TaskContext";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Plus, ListChecks, Clock, ArrowUp, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { format, isToday, isTomorrow } from "date-fns";
import { Badge } from "./ui/badge";

const Dashboard: React.FC = () => {
  const { tasks, topTasks, getRootTasks } = useTaskContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState<"list" | "calendar">("calendar");
  
  const rootTasks = getRootTasks();
  
  // Count only non-completed tasks due today and tomorrow
  const todayTasks = tasks.filter(task => {
    if (!task.dueDate || task.completed) return false;
    return isToday(new Date(task.dueDate));
  });
  
  const tomorrowTasks = tasks.filter(task => {
    if (!task.dueDate || task.completed) return false;
    return isTomorrow(new Date(task.dueDate));
  });
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Dashboard Header */}
      <h1 className="text-3xl font-bold mb-2">Your Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Organize and prioritize your tasks efficiently
      </p>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <ListChecks className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-600">Total Tasks</p>
              <p className="text-2xl font-bold">{tasks.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-purple-100 p-3 mr-4">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-purple-600">Due Soon</p>
                {todayTasks.length > 0 && (
                  <Badge variant="destructive" className="text-xs">Today: {todayTasks.length}</Badge>
                )}
              </div>
              <p className="text-2xl font-bold">{todayTasks.length + tomorrowTasks.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-amber-100 p-3 mr-4">
              <ArrowUp className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-600">Priority Score</p>
              <p className="text-2xl font-bold">
                {topTasks.length > 0 ? topTasks[0].priorityScore.toFixed(1) : "0.0"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex flex-col gap-8">
        {/* Priority Tasks Section - Renamed */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Your Tasks</h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <TaskForm onSubmit={() => setIsDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
          
          <Card className="bg-white rounded-lg shadow-sm border p-6 mb-8 hover:shadow-md transition-shadow">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg font-semibold flex items-center">
                <span className="bg-primary/10 p-1.5 rounded-md mr-2">
                  <ListChecks className="h-4 w-4 text-primary"/>
                </span>
                Top-5 Urgent Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <TaskList tasks={topTasks.filter(task => task.parentId === null)} showScore={true} />
            </CardContent>
          </Card>
        </div>
        
        {/* All Tasks Section */}
        <div>
          <Card className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <CardHeader className="px-0 pt-0">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <span className="bg-secondary/20 p-1.5 rounded-md mr-2">
                    <ListChecks className="h-4 w-4 text-secondary-foreground"/>
                  </span>
                  All Tasks
                </CardTitle>
                <Tabs value={activeView} onValueChange={(value) => setActiveView(value as "list" | "calendar")}>
                  <TabsList>
                    <TabsTrigger value="list" className="flex items-center gap-1">
                      <ListChecks className="h-3.5 w-3.5" /> List
                    </TabsTrigger>
                    <TabsTrigger value="calendar" className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Calendar
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <Separator className="my-4" />
            <CardContent className="px-0 pb-0">
              <Tabs defaultValue="calendar" value={activeView}>
                <TabsContent value="list" className="mt-0">
                  <TaskList tasks={rootTasks.filter(task => task.parentId === null)} showScore={true} />
                </TabsContent>
                <TabsContent value="calendar" className="mt-0">
                  <CalendarView />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
