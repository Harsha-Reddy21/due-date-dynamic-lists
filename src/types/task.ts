
export type Weight = 1 | 2 | 3 | 4 | 5;

export interface Task {
  id: string;
  userId: string;
  parentId: string | null;
  title: string;
  description: string;
  dueDate: string; // ISO format date string
  weight: Weight;
  priorityScore?: number; // Computed dynamically
  createdAt: string;
  updatedAt: string;
  children?: Task[]; // For nested structure
  completed: boolean; // Added this property
  calendarEventId?: string; // Added for Google Calendar integration
}

export interface TaskWithPriority extends Task {
  priorityScore: number;
}
