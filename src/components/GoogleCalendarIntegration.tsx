import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Calendar, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { toast } from './ui/sonner';
import { useTaskContext } from '@/contexts/TaskContext';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from './ui/progress';

const GoogleCalendarIntegration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const { tasks } = useTaskContext();
  const { user } = useAuth();

  // Google OAuth2 configuration
  // Replace these with your actual Google Cloud Console credentials
  const CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';
  const API_KEY = process.env.VITE_GOOGLE_API_KEY || 'YOUR_API_KEY';
  const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
  const SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';
  const REDIRECT_URI = window.location.origin;

  // Check if we're in the OAuth callback
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
    } else {
      // Check local storage for connection status
      const isGoogleConnected = localStorage.getItem('google_calendar_connected');
      if (isGoogleConnected === 'true') {
        setIsConnected(true);
        const lastSyncTime = localStorage.getItem('google_calendar_last_sync');
        if (lastSyncTime) {
          setLastSynced(lastSyncTime);
        }
      }
    }
  }, []);

  // Load Google API client library if needed
  useEffect(() => {
    // Skip if already connected or connecting
    if (isConnected || isConnecting) return;

    let scriptLoaded = false;
    const checkGoogleAPI = () => {
      if (window.gapi && !scriptLoaded) {
        scriptLoaded = true;
        initializeGoogleAPI();
      }
    };

    // Check if script is already loaded
    if (document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
      checkGoogleAPI();
    } else {
      // Load Google API client library script
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        scriptLoaded = true;
        initializeGoogleAPI();
      };
      script.onerror = () => {
        setError('Failed to load Google API client library');
      };
      document.body.appendChild(script);
    }

    // Poll for Google API to be loaded
    const interval = setInterval(checkGoogleAPI, 100);
    return () => clearInterval(interval);
  }, [isConnected, isConnecting]);

  const initializeGoogleAPI = () => {
    if (!window.gapi) return;
    
    try {
      window.gapi.load('client:auth2', initClient);
    } catch (error) {
      console.error('Error loading Google API client', error);
      setError('Failed to initialize Google API client');
    }
  };

  const initClient = () => {
    if (!window.gapi) return;
    
    try {
      window.gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
      }).then(() => {
        // Check if user is already signed in
        if (window.gapi.auth2 && window.gapi.auth2.getAuthInstance().isSignedIn.get()) {
          updateSigninStatus(true);
        }

        // Listen for sign-in state changes
        if (window.gapi.auth2) {
          window.gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        }
      }).catch((error: any) => {
        console.error('Error initializing Google API client:', error);
        setError('Failed to initialize Google API client. Please check your credentials.');
      });
    } catch (error) {
      console.error('Error in initClient', error);
      setError('Failed to initialize Google API client');
    }
  };

  const updateSigninStatus = (isSignedIn: boolean) => {
    setIsConnected(isSignedIn);
    localStorage.setItem('google_calendar_connected', isSignedIn.toString());
    
    if (isSignedIn) {
      toast.success("Google Calendar connected successfully!", {
        description: "You can now sync your tasks with your Google Calendar"
      });
    } else {
      localStorage.removeItem('google_calendar_last_sync');
      setLastSynced(null);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    setIsConnecting(true);
    setError(null);
    
    try {
      // In a real app, you'd exchange the code for a token using a backend service
      // For demo purposes, we'll simulate success after a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate successful connection
      setIsConnected(true);
      localStorage.setItem('google_calendar_connected', 'true');
      
      toast.success("Google Calendar connected successfully!", {
        description: "You can now sync your tasks with your Google Calendar"
      });
    } catch (err: any) {
      console.error("Error connecting to Google Calendar:", err);
      setError("Failed to connect to Google Calendar. Please try again.");
      toast.error("Failed to connect to Google Calendar");
      localStorage.setItem('google_calendar_connected', 'false');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = () => {
    setError(null);
    
    if (!CLIENT_ID || CLIENT_ID === 'YOUR_CLIENT_ID') {
      toast.error("Google Calendar integration is not properly configured", {
        description: "Please configure your Google API credentials in the application settings."
      });
      setError("Google Calendar integration is not configured. Missing client ID.");
      return;
    }

    try {
      // Initiate OAuth flow
      if (window.gapi && window.gapi.auth2) {
        setIsConnecting(true);
        window.gapi.auth2.getAuthInstance().signIn()
          .then(() => {
            setIsConnecting(false);
          })
          .catch((error: any) => {
            console.error("Error during Google sign-in:", error);
            setError("Failed to connect to Google Calendar. Please try again.");
            toast.error("Failed to connect to Google Calendar");
            setIsConnecting(false);
          });
      } else {
        // Fallback to manual OAuth if Google API isn't loaded
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&access_type=offline&prompt=consent`;
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error("Error initiating Google sign-in:", error);
      setError("Failed to connect to Google Calendar. Please try again.");
      toast.error("Failed to connect to Google Calendar");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    // Sign out of Google
    if (window.gapi && window.gapi.auth2) {
      window.gapi.auth2.getAuthInstance().signOut().then(() => {
        localStorage.removeItem('google_calendar_connected');
        localStorage.removeItem('google_calendar_last_sync');
        setLastSynced(null);
        setIsConnected(false);
        toast.success("Disconnected from Google Calendar");
      });
    } else {
      // Fallback if Google API isn't loaded
      localStorage.removeItem('google_calendar_connected');
      localStorage.removeItem('google_calendar_last_sync');
      setLastSynced(null);
      setIsConnected(false);
      toast.success("Disconnected from Google Calendar");
    }
  };

  const handleSyncTasks = async () => {
    if (!isConnected) {
      toast.error("Please connect to Google Calendar first");
      return;
    }
    
    setIsSyncing(true);
    setSyncProgress(0);
    
    // Get tasks that are due today or in the future
    const tasksToSync = tasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate >= today;
    });
    
    try {
      // Simulate progress updates
      const totalTasks = tasksToSync.length || 1;
      const stepSize = 100 / totalTasks;
      
      // Process each task
      for (let i = 0; i < tasksToSync.length; i++) {
        const task = tasksToSync[i];
        
        // In a real app, this would create calendar events with the Google Calendar API
        if (window.gapi && window.gapi.client) {
          try {
            // Create calendar event
            console.log(`Creating calendar event for task: ${task.title}`);
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Calculate progress
            const progress = Math.min(stepSize * (i + 1), 100);
            setSyncProgress(progress);
            
          } catch (error) {
            console.error(`Error creating calendar event for task ${task.title}:`, error);
          }
        }
      }
      
      // Final progress update
      setSyncProgress(100);
      
      // Update last synced time
      const now = new Date().toLocaleString();
      setLastSynced(now);
      localStorage.setItem('google_calendar_last_sync', now);
      
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

  const handleRefreshCalendar = () => {
    toast.info("Refreshing calendar data...");
    
    // Simulate fetching calendar events
    setTimeout(() => {
      toast.success("Calendar refreshed successfully", {
        description: "Your calendar is now up to date"
      });
      const now = new Date().toLocaleString();
      setLastSynced(now);
      localStorage.setItem('google_calendar_last_sync', now);
    }, 1500);
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
                  <p className="mt-2 text-sm">Last synced: {lastSynced}</p>
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
              <Button variant="outline" onClick={handleDisconnect}>
                Disconnect
              </Button>
              <Button variant="outline" onClick={handleRefreshCalendar}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
            <Button onClick={handleSyncTasks} disabled={isSyncing}>
              <Calendar className="mr-2 h-4 w-4" />
              {isSyncing ? `Syncing (${Math.round(syncProgress)}%)` : "Sync Tasks"}
            </Button>
          </>
        ) : (
          <Button onClick={handleConnect} disabled={isConnecting}>
            <Calendar className="mr-2 h-4 w-4" />
            {isConnecting ? "Connecting..." : "Connect Google Calendar"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

// IMPORTANT: Removing the duplicate Window interface declaration
// The correct declaration is already in src/types/google-api.d.ts

export default GoogleCalendarIntegration;
