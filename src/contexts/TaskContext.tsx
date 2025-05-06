
import React, { createContext, useContext, useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Task, TaskWithPriority, Weight } from "@/types/task";
import { calculatePriorityScores, getTopPriorityTasks } from "@/lib/priority-utils";
import { toast } from "@/components/ui/sonner";

// Mock user ID (will be replaced with auth)
const MOCK_USER_ID = "user-1";

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
}

const TaskContext = createContext<TaskContextProps | undefined>(undefined);

// Mock initial data
const initialTasks: Task[] = [
  {
    id: "task-1",
    userId: MOCK_USER_ID,
    parentId: null,
    title: "Launch Marketing Campaign",
    description: "Execute the Q2 marketing campaign across all channels",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    weight: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-2",
    userId: MOCK_USER_ID,
    parentId: "task-1",
    title: "Write Social Media Copy",
    description: "Create engaging copy for Twitter, LinkedIn and Facebook",
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
    weight: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-3",
    userId: MOCK_USER_ID,
    parentId: "task-1",
    title: "Design Banner Ads",
    description: "Create banner ads for the campaign in various sizes",
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    weight: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-4",
    userId: MOCK_USER_ID,
    parentId: null,
    title: "Team Meeting Preparation",
    description: "Prepare agenda and materials for the weekly team meeting",
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
    weight: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-5",
    userId: MOCK_USER_ID,
    parentId: null,
    title: "Quarterly Budget Review",
    description: "Review and adjust departmental budget for Q3",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    weight: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-6",
    userId: MOCK_USER_ID,
    parentId: null,
    title: "Update Website Content",
    description: "Refresh product descriptions and team bios",
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    weight: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

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

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flatTasks, setFlatTasks] = useState<Task[]>(initialTasks);
  const [hierarchicalTasks, setHierarchicalTasks] = useState<TaskWithPriority[]>([]);
  const [topTasks, setTopTasks] = useState<TaskWithPriority[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Process tasks whenever flat task list changes
  useEffect(() => {
    const processedTasks = buildTaskHierarchy(flatTasks);
    const withPriority = calculatePriorityScores(processedTasks);
    setHierarchicalTasks(withPriority);
    setTopTasks(getTopPriorityTasks(withPriority, 5));
    setIsLoading(false);
  }, [flatTasks]);
  
  // Add new task
  const addTask = (task: Omit<Task, "id" | "userId" | "createdAt" | "updatedAt" | "priorityScore">) => {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: uuidv4(),
      userId: MOCK_USER_ID,
      createdAt: now,
      updatedAt: now,
      ...task
    };
    
    setFlatTasks(prevTasks => [...prevTasks, newTask]);
    toast("Task created", {
      description: `"${task.title}" has been added to your tasks`
    });
  };
  
  // Update task
  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setFlatTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              ...updates, 
              updatedAt: new Date().toISOString() 
            } 
          : task
      )
    );
    
    toast("Task updated", {
      description: "Your task has been updated successfully"
    });
  };
  
  // Delete task (and its children)
  const deleteTask = (taskId: string) => {
    // First find the task to be deleted for notification
    const taskToDelete = flatTasks.find(t => t.id === taskId);
    
    // Find all child task IDs (recursive)
    const findAllChildIds = (parentId: string): string[] => {
      const childTasks = flatTasks.filter(t => t.parentId === parentId);
      return [
        ...childTasks.map(t => t.id),
        ...childTasks.flatMap(t => findAllChildIds(t.id))
      ];
    };
    
    const childIds = findAllChildIds(taskId);
    const allIdsToDelete = [taskId, ...childIds];
    
    setFlatTasks(prevTasks => 
      prevTasks.filter(task => !allIdsToDelete.includes(task.id))
    );
    
    if (taskToDelete) {
      toast("Task deleted", {
        description: `"${taskToDelete.title}" and its subtasks have been removed`
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
      getRootTasks
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
