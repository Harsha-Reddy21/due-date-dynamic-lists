import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Calendar, CheckCircle, AlertCircle, RefreshCw, LogOut, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { toast } from './ui/sonner';
import { useTaskContext } from '@/contexts/TaskContext';
import { Progress } from './ui/progress';
import '@/types/google-api.d.ts';

// Configuration
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

// To solve type errors, we need to declare these variables before referencing them
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const GoogleCalendarIntegration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const { tasks } = useTaskContext();
  
  // These are set up as variables to be used throughout the component
  const [gapiInstance, setGapiInstance] = useState<typeof window.gapi | null>(null);
  const [googleInstance, setGoogleInstance] = useState<typeof window.google | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);
  
  useEffect(() => {
    // Load the Google API client
    loadGapiClient();
    
    // Check if we have a stored token
    const accessToken = localStorage.getItem('google_access_token');
    const expiresAt = localStorage.getItem('google_expires_at');
    
    // If we have a token and it's not expired, we're connected
    if (accessToken && expiresAt) {
      const isExpired = new Date().getTime() > parseInt(expiresAt);
      setIsConnected(!isExpired);
      setIsLoading(false);
      
      // If we have a valid token, initialize the client
      if (!isExpired) {
        const lastSync = localStorage.getItem('google_last_sync');
        if (lastSync) {
          setLastSynced(lastSync);
        }
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadGapiClient = () => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGapiInstance(window.gapi);
      window.gapi.load('client', initializeGapiClient);
    };
    document.body.appendChild(script);
    
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => {
      setGoogleInstance(window.google);
      initializeGisClient();
    };
    document.body.appendChild(gisScript);
  };
  
  const initializeGapiClient = async () => {
    try {
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
      });
      
      // Check if we have a stored token and set it
      const accessToken = localStorage.getItem('google_access_token');
      if (accessToken) {
        window.gapi.client.setToken({
          access_token: accessToken,
        });
      }
    } catch (err) {
      console.error('Error initializing GAPI client:', err);
      setError('Failed to initialize Google Calendar API');
    }
  };
  
  const initializeGisClient = () => {
    try {
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        console.error('Google Identity Services not loaded yet');
        return;
      }
      
      const tokenClientInstance = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: handleTokenResponse,
      });
      
      setTokenClient(tokenClientInstance);
    } catch (err) {
      console.error('Error initializing GIS client:', err);
      setError('Failed to initialize Google Identity Services');
    }
  };
  
  const handleTokenResponse = (resp: any) => {
    if (resp.error) {
      setError(`Authorization error: ${resp.error}`);
      setIsConnecting(false);
      return;
    }
    
    // Store the token
    const token = window.gapi.client.getToken();
    if (token) {
      // Calculate expires_at based on current time + expires_in
      const expiresAt = new Date().getTime() + (token.expires_in || 3600) * 1000;
      localStorage.setItem('google_access_token', token.access_token);
      localStorage.setItem('google_expires_at', expiresAt.toString());
      
      const now = new Date().toISOString();
      localStorage.setItem('google_last_sync', now);
      setLastSynced(now);
      
      setIsConnected(true);
      toast.success('Successfully connected to Google Calendar!');
    }
    
    setIsConnecting(false);
    fetchEvents();
  };
  
  const handleConnect = () => {
    setIsConnecting(true);
    setError(null);
    
    if (!tokenClient) {
      toast.error('Google Calendar API is not initialized yet. Please try again.');
      setIsConnecting(false);
      return;
    }
    
    try {
      // Request an access token
      tokenClient.requestAccessToken({
        prompt: 'consent',
      });
    } catch (err) {
      console.error('Error requesting access token:', err);
      setError('Failed to connect to Google Calendar');
      setIsConnecting(false);
    }
  };
  
  const handleDisconnect = () => {
    setIsLoading(true);
    
    try {
      if (window.gapi && window.google) {
        const token = window.gapi.client.getToken();
        if (token) {
          window.google.accounts.oauth2.revoke(token.access_token, () => {
            window.gapi.client.setToken('');
            localStorage.removeItem('google_access_token');
            localStorage.removeItem('google_expires_at');
            localStorage.removeItem('google_last_sync');
            setIsConnected(false);
            setLastSynced(null);
            toast.success('Disconnected from Google Calendar');
            setIsLoading(false);
          });
        } else {
          // If no token, just clear everything
          localStorage.removeItem('google_access_token');
          localStorage.removeItem('google_expires_at');
          localStorage.removeItem('google_last_sync');
          setIsConnected(false);
          setLastSynced(null);
          setIsLoading(false);
        }
      } else {
        // If API not loaded, just clear everything
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_expires_at');
        localStorage.removeItem('google_last_sync');
        setIsConnected(false);
        setLastSynced(null);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error disconnecting from Google Calendar:', err);
      toast.error('Failed to disconnect from Google Calendar');
      setIsLoading(false);
    }
  };

  const fetchEvents = async () => {
    if (!window.gapi || !window.gapi.client || !window.gapi.client.calendar) {
      console.error('Google Calendar API not loaded yet');
      return;
    }
    
    try {
      const response = await window.gapi.client.calendar.events.list({
        'calendarId': 'primary',
        'timeMin': new Date().toISOString(),
        'showDeleted': false,
        'singleEvents': true,
        'maxResults': 10,
        'orderBy': 'startTime',
      });
      
      const events = response.result.items;
      setEvents(events || []);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      toast.error('Failed to fetch calendar events');
    }
  };

  const handleSyncTasks = async () => {
    if (!isConnected || !window.gapi || !window.gapi.client || !window.gapi.client.calendar) {
      toast.error('Please connect to Google Calendar first');
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
      let successCount = 0;
      
      // Process tasks
      for (let i = 0; i < tasksToSync.length; i++) {
        const task = tasksToSync[i];
        
        try {
          // Convert task to calendar event
          const startTime = task.dueDate ? new Date(task.dueDate) : new Date();
          const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration
          
          const event = {
            'summary': task.title,
            'description': task.description || '',
            'start': {
              'dateTime': startTime.toISOString(),
              'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone, 
            },
            'end': {
              'dateTime': endTime.toISOString(),
              'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            'reminders': {
              'useDefault': true
            }
          };
          
          // Add the event
          const response = await window.gapi.client.calendar.events.insert({
            'calendarId': 'primary',
            'resource': event,
          });
          
          if (response.status === 200) {
            successCount++;
          }
        } catch (err) {
          console.error(`Error adding task ${task.title} to calendar:`, err);
        }
        
        // Update progress
        const progress = Math.round(stepSize * (i + 1));
        setSyncProgress(Math.min(progress, 100));
      }
      
      // Update last synced time
      const now = new Date().toISOString();
      localStorage.setItem('google_last_sync', now);
      setLastSynced(now);
      
      setTimeout(() => {
        setIsSyncing(false);
        toast.success(
          successCount === 0 
            ? "No tasks to sync" 
            : `${successCount} task${successCount === 1 ? '' : 's'} synced to Google Calendar!`,
          {
            description: successCount === 0 
              ? "Add tasks with due dates to sync them" 
              : "Your tasks are now visible in your Google Calendar"
          }
        );
        fetchEvents();
      }, 500);
    } catch (err) {
      console.error("Error syncing tasks:", err);
      toast.error("Failed to sync tasks");
      setIsSyncing(false);
    }
  };

  const handleRefreshCalendar = () => {
    toast.info("Refreshing calendar data...");
    fetchEvents();
    
    const now = new Date().toISOString();
    localStorage.setItem('google_last_sync', now);
    setLastSynced(now);
    
    toast.success('Calendar refreshed');
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
        
        {isLoading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : isConnected ? (
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
            
            {events.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Upcoming Events</h3>
                <ul className="space-y-2">
                  {events.slice(0, 3).map((event) => (
                    <li key={event.id} className="text-sm p-2 bg-muted rounded-md">
                      <div className="font-medium">{event.summary}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(event.start.dateTime || event.start.date).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
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
                <LogOut className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
              <Button variant="outline" onClick={handleRefreshCalendar} disabled={isLoading || isSyncing}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
            <Button 
              onClick={handleSyncTasks} 
              disabled={isSyncing || isLoading}
            >
              <Plus className="mr-2 h-4 w-4" />
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
