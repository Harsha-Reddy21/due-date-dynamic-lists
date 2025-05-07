import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Calendar, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { toast } from './ui/sonner';
import { useTaskContext } from '@/contexts/TaskContext';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from './ui/progress';
import { supabase } from '@/integrations/supabase/client';
import '@/types/google-api.d.ts';

// Define the serverUrl for our Edge Function
const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL 
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar`
  : 'http://localhost:54321/functions/v1/google-calendar';

// Get the current hostname dynamically for redirect URI
const REDIRECT_URI = window.location.origin + '/settings';

const GoogleCalendarIntegration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { tasks } = useTaskContext();
  const { user } = useAuth();

  // Check for OAuth code in URL on component mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      setError(`Authentication error: ${error}`);
      toast.error("Google Calendar authentication failed", {
        description: `Error: ${error}`
      });
      return;
    }

    if (code) {
      handleOAuthCallback(code);
      // Remove the code from the URL to prevent reprocessing on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check connection status
    if (user) {
      checkConnectionStatus();
    }
  }, [user]);
  
  const checkConnectionStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('is_google_connected, google_last_sync')
        .eq('user_id', user.id)
        .single();
        
      if (error) {
        console.error("Error fetching connection status:", error);
        return;
      }
      
      setIsConnected(data?.is_google_connected || false);
      setLastSynced(data?.google_last_sync || null);
    } catch (error) {
      console.error("Error checking connection status:", error);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    if (!user) {
      toast.error("You must be logged in to connect Google Calendar");
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      // Exchange authorization code for tokens using our Edge Function
      const response = await fetch(`${EDGE_FUNCTION_URL}/auth/callback?code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await supabase.auth.getSession().then(res => res.data.session?.access_token)}`,
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to exchange code for tokens: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Update connection status in Supabase
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({
          is_google_connected: true,
          google_last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (updateError) {
        throw updateError;
      }
      
      setIsConnected(true);
      toast.success("Google Calendar connected successfully!", {
        description: "You can now sync your tasks with your Google Calendar"
      });
    } catch (err: any) {
      console.error("Error connecting to Google Calendar:", err);
      setError("Failed to connect to Google Calendar. Please try again.");
      toast.error("Failed to connect to Google Calendar");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    if (!user) {
      toast.error("You must be logged in to connect Google Calendar");
      return;
    }
    
    setError(null);
    
    try {
      // Redirect to login endpoint on our Edge Function with explicit redirect URI
      const response = await fetch(`${EDGE_FUNCTION_URL}/login?redirect_uri=${encodeURIComponent(REDIRECT_URI)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await supabase.auth.getSession().then(res => res.data.session?.access_token)}`,
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to initiate OAuth flow: ${response.statusText}`);
      }
      
      const { authUrl } = await response.json();
      
      toast.info("Redirecting to Google for authorization", {
        description: "You'll be asked to grant permission to access your calendar"
      });
      
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error initiating Google sign-in:", error);
      setError("Failed to connect to Google Calendar. Please try again.");
      toast.error("Failed to connect to Google Calendar");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) {
      toast.error("You must be logged in to disconnect Google Calendar");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Call our Edge Function to revoke the tokens
      const response = await fetch(`${EDGE_FUNCTION_URL}/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await supabase.auth.getSession().then(res => res.data.session?.access_token)}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to revoke tokens: ${response.statusText}`);
      }
      
      // Update connection status in Supabase
      await supabase
        .from('user_settings')
        .update({
          is_google_connected: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
        
      setIsConnected(false);
      setLastSynced(null);
      
      toast.success("Disconnected from Google Calendar");
    } catch (error) {
      console.error("Error disconnecting from Google:", error);
      toast.error("Failed to disconnect Google Calendar");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncTasks = async () => {
    if (!user) {
      toast.error("You must be logged in to sync tasks");
      return;
    }
    
    if (!isConnected) {
      toast.error("Please connect to Google Calendar first");
      return;
    }
    
    setIsSyncing(true);
    setSyncProgress(0);
    
    try {
      // Get tasks that are due today or in the future
      const tasksToSync = tasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dueDate >= today;
      });
      
      const totalTasks = tasksToSync.length;
      const stepSize = totalTasks > 0 ? 100 / totalTasks : 100;
      
      // Process tasks in batches to avoid overwhelming the API
      for (let i = 0; i < tasksToSync.length; i++) {
        const task = tasksToSync[i];
        try {
          // Convert task to calendar event
          const startTime = task.dueDate ? new Date(task.dueDate) : new Date();
          const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration
          
          // Format ISO strings for the API
          const startIso = startTime.toISOString();
          const endIso = endTime.toISOString();
          
          // Call our Edge Function to add the event
          const response = await fetch(`${EDGE_FUNCTION_URL}/add_task`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${await supabase.auth.getSession().then(res => res.data.session?.access_token)}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: task.title,
              description: task.description || '',
              start_time: startIso,
              end_time: endIso
            })
          });
          
          if (!response.ok) {
            console.error(`Failed to add task ${task.title} to calendar`);
          }
        } catch (err) {
          console.error(`Error adding task ${task.title} to calendar:`, err);
        }
        
        // Update progress
        const progress = Math.min(stepSize * (i + 1), 100);
        setSyncProgress(progress);
      }
      
      // Final progress update
      setSyncProgress(100);
      
      // Update last synced time in Supabase
      const now = new Date().toISOString();
      setLastSynced(now);
      
      await supabase
        .from('user_settings')
        .update({
          google_last_sync: now,
          updated_at: now
        })
        .eq('user_id', user.id);
      
      setTimeout(() => {
        setIsSyncing(false);
        
        // Show notification about the sync
        const syncCount = tasksToSync.length;
        toast.success(
          syncCount === 0 
            ? "No tasks to sync" 
            : `${syncCount} task${syncCount === 1 ? '' : 's'} synced to Google Calendar!`,
          {
            description: syncCount === 0 
              ? "Add tasks with due dates to sync them" 
              : "Your tasks are now visible in your Google Calendar"
          }
        );
      }, 500);
      
    } catch (err: any) {
      console.error("Error syncing tasks:", err);
      setIsSyncing(false);
      toast.error("Failed to sync tasks", {
        description: err.message || "An unknown error occurred"
      });
    }
  };

  const handleRefreshCalendar = async () => {
    if (!user) {
      toast.error("You must be logged in to refresh calendar data");
      return;
    }
    
    toast.info("Refreshing calendar data...");
    
    try {
      const response = await fetch(`${EDGE_FUNCTION_URL}/list_events`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await supabase.auth.getSession().then(res => res.data.session?.access_token)}`,
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to list events: ${response.statusText}`);
      }
      
      const result = await response.json();
      const eventsCount = result.items?.length || 0;
      
      // Update last synced time in Supabase
      const now = new Date().toISOString();
      setLastSynced(now);
      
      await supabase
        .from('user_settings')
        .update({
          google_last_sync: now,
          updated_at: now
        })
        .eq('user_id', user.id);
      
      toast.success(`Calendar refreshed: ${eventsCount} upcoming events found`);
    } catch (error) {
      console.error("Error refreshing calendar:", error);
      toast.error("Failed to refresh calendar");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Integration
        </CardTitle>
        <CardDescription>
          Sync your tasks with Google Calendar to get reminders and stay organized.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {isConnected ? (
          <div className="space-y-4">
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-600">Connected</AlertTitle>
              <AlertDescription className="text-green-700">
                Your account is connected to Google Calendar. You can now sync your tasks.
                {lastSynced && (
                  <p className="mt-2 text-sm">Last synced: {new Date(lastSynced).toLocaleString()}</p>
                )}
              </AlertDescription>
            </Alert>
            
            {isSyncing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Syncing tasks to Google Calendar...</span>
                  <span>{Math.round(syncProgress)}%</span>
                </div>
                <Progress value={syncProgress} className="h-2" />
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-muted-foreground mb-4">
              Connect your Google Calendar to automatically sync your tasks and receive notifications.
            </p>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Not Connected</AlertTitle>
              <AlertDescription>
                You need to connect your Google account to sync your tasks with Google Calendar.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between flex-wrap gap-2">
        {isConnected ? (
          <>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDisconnect} disabled={isLoading}>
                Disconnect
              </Button>
              <Button variant="outline" onClick={handleRefreshCalendar} disabled={isLoading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
            <Button 
              onClick={handleSyncTasks} 
              disabled={isSyncing || isLoading}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {isSyncing ? `Syncing (${Math.round(syncProgress)}%)` : "Sync Tasks"}
            </Button>
          </>
        ) : (
          <Button 
            onClick={handleConnect} 
            disabled={isConnecting || isLoading}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {isConnecting ? "Connecting..." : "Connect Google Calendar"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default GoogleCalendarIntegration;
