
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { useTaskContext } from "@/contexts/TaskContext";
import { Weight } from "@/types/task";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const taskFormSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }).max(50),
  description: z.string().max(200).optional(),
  dueDate: z.date({
    required_error: "Due date is required.",
  }),
  dueTime: z.string().optional(),
  weight: z.enum(["1", "2", "3", "4", "5"], {
    required_error: "Priority weight is required.",
  }),
  parentId: z.string().nullable().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  onSubmit?: () => void;
  parentId?: string | null;
}

const TaskForm: React.FC<TaskFormProps> = ({ onSubmit, parentId = null }) => {
  const { addTask } = useTaskContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow by default
      dueTime: "12:00", // Noon by default
      weight: "3", // Medium priority by default
      parentId: parentId,
    },
  });

  const handleSubmit = async (values: TaskFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Create a date object from the dueDate and dueTime values
      const dueDate = new Date(values.dueDate);
      
      if (values.dueTime) {
        const [hours, minutes] = values.dueTime.split(':').map(Number);
        dueDate.setHours(hours, minutes);
      }
      
      addTask({
        title: values.title,
        description: values.description || "",
        dueDate: dueDate.toISOString(),
        weight: parseInt(values.weight) as Weight,
        parentId: values.parentId,
        completed: false, // Adding the completed property
      });
      
      // Reset form
      form.reset({
        title: "",
        description: "",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        dueTime: "12:00",
        weight: "3",
        parentId: parentId,
      });
      
      // Call onSubmit callback if provided
      if (onSubmit) onSubmit();
    } catch (error) {
      console.error("Error adding task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter task title..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter task description..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col sm:flex-row gap-4">
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Due Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueTime"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Due Time</FormLabel>
                <div className="flex items-center">
                  <FormControl>
                    <Input
                      type="time"
                      {...field}
                      className="flex-1"
                    />
                  </FormControl>
                  <Clock className="ml-2 h-4 w-4 text-gray-400" />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="weight"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Priority Weight</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1">1 - Low</SelectItem>
                  <SelectItem value="2">2 - Moderate</SelectItem>
                  <SelectItem value="3">3 - Medium</SelectItem>
                  <SelectItem value="4">4 - High</SelectItem>
                  <SelectItem value="5">5 - Critical</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Higher priority tasks will score higher
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Creating..." : "Create Task"}
        </Button>
      </form>
    </Form>
  );
};

export default TaskForm;
