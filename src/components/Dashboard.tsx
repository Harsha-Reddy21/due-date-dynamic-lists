
import React, { useState } from "react";
import TaskForm from "./TaskForm";
import TaskList from "./TaskList";
import { useTaskContext } from "@/contexts/TaskContext";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Plus } from "lucide-react";

const Dashboard: React.FC = () => {
  const { tasks, topTasks, getRootTasks } = useTaskContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const rootTasks = getRootTasks();
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Priority Tasks Section */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Top Priority Tasks</h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
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
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">Today's Focus (Top 5)</h3>
            <TaskList tasks={topTasks} showScore={true} />
          </div>
          
          <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">All Tasks</h3>
            <TaskList tasks={rootTasks} showScore={true} />
          </div>
        </div>
        
        {/* Add Task Form Section */}
        <div className="w-full lg:w-96 bg-white rounded-lg shadow-sm border p-6 h-fit">
          <h3 className="text-lg font-semibold mb-4">Add New Task</h3>
          <TaskForm />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
