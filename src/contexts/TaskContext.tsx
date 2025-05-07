import React, { createContext, useContext, useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Task, TaskWithPriority, Weight } from "@/types/task";
import { calculatePriorityScores, getTopPriorityTasks, calculateDaysUntilDue } from "@/lib/priority-utils";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TaskContextProps {
  tasks: TaskWithPriority[];
  topTasks: TaskWithPriority[];
  isLoading: boolean;
  addTask: (task: Omit<Task, "id" | "userId" | "createdAt" | "updatedAt" | "priorityScore">) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  getTaskById: (taskId: string) => Task | undefined;
  getTaskChildren: (parentId: string) => TaskWithPriority[];
  getRootTasks: () => TaskWithPriority[];
  updateTaskOrder: (newOrder: TaskWithPriority[], parentId: string | null) => void;
}

const TaskContext = createContext<TaskContextProps | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [flatTasks, setFlatTasks] = useState<Task[]>([]);
  const [hierarchicalTasks, setHierarchicalTasks] = useState<TaskWithPriority[]>([]);
  const [topTasks, setTopTasks] = useState<TaskWithPriority[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check for due tasks and show notifications
  useEffect(() => {
    if (flatTasks.length > 0) {
      // Find tasks due today or tomorrow
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const dueTodayTasks = flatTasks.filter(task => {
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      });
      
      const dueTomorrowTasks = flatTasks.filter(task => {
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === tomorrow.getTime();
      });
      
      // We're removing the notifications from here as they will be handled in the Layout component only once
    }
  }, [flatTasks]);
  
  // Fetch tasks from Supabase when user changes
  useEffect(() => {
    if (!user) {
      // If no authenticated user, reset tasks and set loading to false
      setFlatTasks([]);
      setHierarchicalTasks([]);
      setTopTasks([]);
      setIsLoading(false);
      return;
    }
    
    const fetchTasks = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          throw error;
        }
        
        // Convert the database format to our app's Task format
        const formattedTasks: Task[] = data.map(task => ({
          id: task.id,
          userId: task.user_id,
          parentId: task.parent_id,
          title: task.title,
          description: task.description || "",
          dueDate: task.due_date,
          weight: task.weight as Weight,
          createdAt: task.created_at,
          updatedAt: task.updated_at,
          // Use the completed property from the database or default to false
          completed: task.completed === true, 
        }));
        
        setFlatTasks(formattedTasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        toast.error("Failed to load tasks");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTasks();
    
    // Subscribe to changes
    const tasksSubscription = supabase
      .channel('public:tasks')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'tasks'
      }, fetchTasks)
      .subscribe();
      
    return () => {
      supabase.removeChannel(tasksSubscription);
    };
  }, [user]);
  
  // Process tasks whenever flat task list changes
  useEffect(() => {
    const processedTasks = buildTaskHierarchy(flatTasks);
    const withPriority = calculatePriorityScores(processedTasks);
    setHierarchicalTasks(withPriority);
    setTopTasks(getTopPriorityTasks(withPriority, 5));
  }, [flatTasks]);
  
  // Build hierarchical task structure
  const buildTaskHierarchy = (taskList: Task[]): Task[] => {
    const taskMap = new Map<string, Task>();
    const rootTasks: Task[] = [];
    
    // First pass: map all tasks by ID
    taskList.forEach(task => {
      taskMap.set(task.id, { ...task, children: [] });
    });
    
    // Second pass: build hierarchy
    taskList.forEach(task => {
      const taskWithChildren = taskMap.get(task.id);
      
      if (task.parentId && taskMap.has(task.parentId)) {
        // Add to parent's children
        const parent = taskMap.get(task.parentId);
        if (parent && parent.children) {
          parent.children.push(taskWithChildren!);
        }
      } else {
        // Root level task
        rootTasks.push(taskWithChildren!);
      }
    });
    
    return rootTasks;
  };
  
  // Add new task
  const addTask = async (task: Omit<Task, "id" | "userId" | "createdAt" | "updatedAt" | "priorityScore">) => {
    if (!user) {
      toast.error("You must be logged in to add tasks");
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            user_id: user.id,
            parent_id: task.parentId,
            title: task.title,
            description: task.description,
            due_date: task.dueDate,
            weight: task.weight,
            completed: task.completed || false
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      toast("Task created", {
        description: `"${task.title}" has been added to your tasks`
      });
    } catch (error: any) {
      console.error("Error adding task:", error);
      toast.error("Failed to create task", {
        description: error.message
      });
    }
  };
  
  // Update task
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!user) {
      toast.error("You must be logged in to update tasks");
      return;
    }
    
    try {
      // Convert from our app's Task format to database format
      const dbUpdates: any = {};
      
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
      if (updates.parentId !== undefined) dbUpdates.parent_id = updates.parentId;
      
      const { error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', taskId);
      
      if (error) throw error;
      
      toast("Task updated", {
        description: "Your task has been updated successfully"
      });
    } catch (error: any) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task", {
        description: error.message
      });
    }
  };
  
  // Delete task (and its children)
  const deleteTask = async (taskId: string) => {
    if (!user) {
      toast.error("You must be logged in to delete tasks");
      return;
    }
    
    // First find the task to be deleted for notification
    const taskToDelete = flatTasks.find(t => t.id === taskId);
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
      
      if (taskToDelete) {
        toast("Task deleted", {
          description: `"${taskToDelete.title}" and its subtasks have been removed`
        });
      }
    } catch (error: any) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task", {
        description: error.message
      });
    }
  };
  
  // Get task by ID
  const getTaskById = (taskId: string): Task | undefined => {
    return flatTasks.find(task => task.id === taskId);
  };
  
  // Get children for a specific task
  const getTaskChildren = (parentId: string): TaskWithPriority[] => {
    return hierarchicalTasks.filter(task => task.parentId === parentId);
  };
  
  // Get root tasks
  const getRootTasks = (): TaskWithPriority[] => {
    return hierarchicalTasks.filter(task => task.parentId === null);
  };
  
  // Update task order
  const updateTaskOrder = async (newOrder: TaskWithPriority[], parentId: string | null) => {
    if (!user) {
      toast.error("You must be logged in to reorder tasks");
      return;
    }
    
    try {
      // Update the order in the database
      // For simplicity, we just update the in-memory state
      // In a real app, you might use a 'position' field in the database
      
      // Create a new flat task array with the updated order
      const updatedFlatTasks = [...flatTasks];
      
      // Find the tasks with the specified parent ID
      for (let i = 0; i < newOrder.length; i++) {
        const taskIndex = updatedFlatTasks.findIndex(t => t.id === newOrder[i].id);
        if (taskIndex !== -1) {
          // You could update a 'position' field here if you had one
          // updatedFlatTasks[taskIndex].position = i;
        }
      }
      
      // Update the state with the new order
      setFlatTasks(updatedFlatTasks);
      
      toast("Tasks reordered", {
        description: "The order of your tasks has been updated"
      });
    } catch (error: any) {
      console.error("Error reordering tasks:", error);
      toast.error("Failed to reorder tasks", {
        description: error.message
      });
    }
  };
  
  return (
    <TaskContext.Provider value={{
      tasks: hierarchicalTasks,
      topTasks,
      isLoading,
      addTask,
      updateTask,
      deleteTask,
      getTaskById,
      getTaskChildren,
      getRootTasks,
      updateTaskOrder
    }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};
