
export type Weight = 1 | 2 | 3 | 4 | 5;

export interface Task {
  id: string;
  userId: string;
  parentId: string | null;
  title: string;
  description: string;
  dueDate: string; // ISO format date string (includes time)
  dueTime?: string; // Optional time string in HH:MM format
  weight: Weight;
  priorityScore?: number; // Computed dynamically
  createdAt: string;
  updatedAt: string;
  children?: Task[]; // For nested structure
  completed: boolean;
  calendarEventId?: string; // For Google Calendar integration
}

export interface TaskWithPriority extends Task {
  priorityScore: number;
}
