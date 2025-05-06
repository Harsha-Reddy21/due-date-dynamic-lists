
import { Task, TaskWithPriority } from "@/types/task";

// Calculate days until due from today
export function calculateDaysUntilDue(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time part for accurate day calculation
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const differenceInTime = due.getTime() - today.getTime();
  const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));
  
  // If due date is in the past, return a negative number
  return differenceInDays;
}

// Calculate priority score based on weight and days until due
export function calculatePriorityScore(weight: number, dueDate: string): number {
  const daysUntilDue = calculateDaysUntilDue(dueDate);
  
  // For overdue tasks, add urgency by using absolute value + 1 in denominator
  if (daysUntilDue < 0) {
    return weight / (Math.abs(daysUntilDue) + 0.5); // More urgent for overdue tasks
  }
  
  // Standard formula: weight / (days_until_due + 1)
  return weight / (daysUntilDue + 1);
}

// Apply priority scores to all tasks recursively
export function calculatePriorityScores(tasks: Task[]): TaskWithPriority[] {
  return tasks.map(task => {
    const taskWithPriority: TaskWithPriority = {
      ...task,
      priorityScore: calculatePriorityScore(task.weight, task.dueDate)
    };
    
    if (task.children && task.children.length > 0) {
      taskWithPriority.children = calculatePriorityScores(task.children) as TaskWithPriority[];
    }
    
    return taskWithPriority;
  });
}

// Get top N tasks by priority score, flattening the hierarchy
export function getTopPriorityTasks(tasks: TaskWithPriority[], count: number = 5): TaskWithPriority[] {
  // Flatten nested structure
  const flattenTasks = (taskList: TaskWithPriority[]): TaskWithPriority[] => {
    return taskList.reduce((acc: TaskWithPriority[], task) => {
      acc.push(task);
      if (task.children && task.children.length > 0) {
        acc.push(...flattenTasks(task.children as TaskWithPriority[]));
      }
      return acc;
    }, []);
  };
  
  const allTasks = flattenTasks(tasks);
  
  // Sort by priority score (descending)
  return allTasks
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, count);
}

// Format the priority score for display (two decimal places)
export function formatPriorityScore(score: number): string {
  return score.toFixed(2);
}

// Get the appropriate CSS class based on task weight
export function getPriorityClass(weight: number): string {
  return `priority-${weight}`;
}
