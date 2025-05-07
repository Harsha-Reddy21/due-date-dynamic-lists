import React, { createContext, useContext, useState, useEffect, useRef } from "react";
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
  markNotificationsAsSeen: () => void;
  hasUnseenNotifications: boolean;
  refreshTasks: () => Promise<void>; // Added refreshTasks method
  getTaskColor: (taskId: string) => string;
}

const TaskContext = createContext<TaskContextProps | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [flatTasks, setFlatTasks] = useState<Task[]>([]);
  const [hierarchicalTasks, setHierarchicalTasks] = useState<TaskWithPriority[]>([]);
  const [topTasks, setTopTasks] = useState<TaskWithPriority[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsShown, setNotificationsShown] = useState(false);
  
  // For tracking if notifications have been seen
  const [notificationsSeen, setNotificationsSeen] = useState(true);
  const [hasUnseenNotifications, setHasUnseenNotifications] = useState(false);
  
  // Store page navigation history to detect actual page changes
  const lastPathRef = useRef(window.location.pathname);
  
  // Track initial load
  const initialLoadRef = useRef(true);

  // Function to update notification state in Supabase
  const updateNotificationState = async (seen: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert(
          { user_id: user.id, notifications_seen: seen },
          { onConflict: 'user_id' }
        );

      if (error) throw error;
    } catch (error) {
      console.error('Error updating notification state:', error);
    }
  };

  // Generate unique color for a task
  const getTaskColor = (taskId: string): string => {
    // Convert task ID to a number using a simple hash
    let hash = 0;
    for (let i = 0; i < taskId.length; i++) {
      hash = taskId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate a color based on the hash
    const hue = (hash % 360) / 360;
    const saturation = 0.7;
    const lightness = 0.7;
    
    // Convert HSL to RGB
    const hslToRgb = (h: number, s: number, l: number) => {
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => {
        const k = (n + h * 12) % 12;
        return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      };
      return `rgb(${Math.round(f(0) * 255)}, ${Math.round(f(8) * 255)}, ${Math.round(f(4) * 255)})`;
    };
    
    return hslToRgb(hue, saturation, lightness);
  };
  
  // Check for due tasks and show notifications
  useEffect(() => {
    if (!user) return;

    // First check the user's notification state from Supabase
    const checkNotificationState = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('notifications_seen')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (data?.notifications_seen) {
          setNotificationsSeen(true);
          setHasUnseenNotifications(false);
        }
      } catch (error) {
        console.error('Error checking notification state:', error);
        // If there's an error or no record exists, default to notifications not seen
        setNotificationsSeen(false);
        setHasUnseenNotifications(true);
      }
    };

    checkNotificationState();

    // Find tasks due today or tomorrow
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dueTodayTasks = flatTasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    });
    
    const dueTomorrowTasks = flatTasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === tomorrow.getTime();
    });

    // Update notification state based on tasks
    if (dueTodayTasks.length > 0 || dueTomorrowTasks.length > 0) {
      setHasUnseenNotifications(!notificationsSeen);
    }
  }, [flatTasks, user, notificationsSeen]);
  
  // Listen for page navigation to avoid resetting notification state
  useEffect(() => {
    const handleRouteChange = () => {
      const currentPath = window.location.pathname;
      if (currentPath !== lastPathRef.current) {
        lastPathRef.current = currentPath;
        // Don't reset notification state on page change
      }
    };
    
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);
  
  // Function to fetch tasks that can be called from outside
  const fetchTasks = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id) // Only fetch tasks for this user
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      // Convert the database format to our app's Task format
      const formattedTasks: Task[] = data.map((task: any) => ({
        id: task.id,
        userId: task.user_id,
        parentId: task.parent_id,
        title: task.title,
        description: task.description || "",
        dueDate: task.due_date,
        weight: task.weight as Weight,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        completed: Boolean(task.completed),
        calendarEventId: task.calendar_event_id || undefined,
      }));
      
      setFlatTasks(formattedTasks);
      console.log("Tasks fetched successfully:", formattedTasks.length);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Public method to refresh tasks
  const refreshTasks = async () => {
    await fetchTasks();
  };
  
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
    
    fetchTasks();
    
    // Subscribe to changes - improve the subscription to handle all types of changes
    const tasksSubscription = supabase
      .channel('public:tasks')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${user.id}` // Only listen for this user's tasks
      }, () => {
        console.log("Task inserted, refreshing tasks");
        fetchTasks();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${user.id}` // Only listen for this user's tasks
      }, () => {
        console.log("Task updated, refreshing tasks");
        fetchTasks();
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${user.id}` // Only listen for this user's tasks
      }, () => {
        console.log("Task deleted, refreshing tasks");
        fetchTasks();
      })
      .subscribe((status) => {
        console.log("Supabase channel status:", status);
      });
      
    return () => {
      console.log("Removing Supabase channel subscription");
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
  
  // Mark notifications as seen
  const markNotificationsAsSeen = async () => {
    setNotificationsSeen(true);
    setHasUnseenNotifications(false);
    await updateNotificationState(true);
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
            completed: task.completed || false,
            calendar_event_id: task.calendarEventId
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      toast("Task created", {
        description: `"${task.title}" has been added to your tasks`
      });
      
      // Force refresh tasks to ensure everything is up to date
      await fetchTasks();
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
      if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
      if (updates.calendarEventId !== undefined) dbUpdates.calendar_event_id = updates.calendarEventId;
      
      const { error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', taskId);
      
      if (error) throw error;
      
      toast("Task updated", {
        description: "Your task has been updated successfully"
      });
      
      // Force refresh tasks to ensure everything is up to date
      await fetchTasks();
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
    
    // First find the task to be deleted for notification and Google Calendar deletion
    const taskToDelete = flatTasks.find(t => t.id === taskId);
    
    try {
      // Delete the task from Google Calendar if it has a calendarEventId
      if (taskToDelete && taskToDelete.calendarEventId && window.gapi && window.gapi.client) {
        try {
          await window.gapi.client.calendar.events.delete({
            'calendarId': 'primary',
            'eventId': taskToDelete.calendarEventId
          });
          console.log(`Successfully deleted Google Calendar event for task: ${taskToDelete.title}`);
        } catch (calendarError) {
          console.error("Error deleting Google Calendar event:", calendarError);
          // Continue with task deletion even if Calendar deletion fails
        }
      }
      
      // Get all subtasks recursively
      const subtaskIds = getSubtaskIds(taskId);
      
      // For each subtask that has a calendar event, delete it from Google Calendar
      for (const subtaskId of subtaskIds) {
        const subtask = flatTasks.find(t => t.id === subtaskId);
        if (subtask && subtask.calendarEventId && window.gapi && window.gapi.client) {
          try {
            await window.gapi.client.calendar.events.delete({
              'calendarId': 'primary',
              'eventId': subtask.calendarEventId
            });
            console.log(`Successfully deleted Google Calendar event for subtask: ${subtask.title}`);
          } catch (calendarError) {
            console.error("Error deleting Google Calendar event for subtask:", calendarError);
            // Continue with subtask deletion even if Calendar deletion fails
          }
        }
      }
      
      // Delete the task and all its subtasks from the database
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', [taskId, ...subtaskIds]);
      
      if (error) throw error;
      
      if (taskToDelete) {
        toast("Task deleted", {
          description: `"${taskToDelete.title}" and its subtasks have been removed`
        });
      }
      
      // Force refresh tasks to ensure everything is up to date
      await fetchTasks();
    } catch (error: any) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task", {
        description: error.message
      });
    }
  };
  
  // Helper function to get all subtask IDs recursively
  const getSubtaskIds = (parentId: string): string[] => {
    const directChildren = flatTasks.filter(task => task.parentId === parentId);
    
    if (directChildren.length === 0) {
      return [];
    }
    
    const directChildrenIds = directChildren.map(child => child.id);
    const nestedChildrenIds = directChildrenIds.flatMap(childId => getSubtaskIds(childId));
    
    return [...directChildrenIds, ...nestedChildrenIds];
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
      updateTaskOrder,
      markNotificationsAsSeen,
      hasUnseenNotifications,
      refreshTasks,
      getTaskColor,
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
