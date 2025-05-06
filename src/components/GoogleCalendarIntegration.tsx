
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
  const { tasks } = useTaskContext();
  const { user } = useAuth();

  // Using a sample client ID - in a production app you would use a real one
  const CLIENT_ID = '123456789012-example12345example12345.apps.googleusercontent.com';
  const REDIRECT_URI = window.location.origin;
  const SCOPES = 'https://www.googleapis.com/auth/calendar';

  // Check if user is already authenticated with Google
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('google_calendar_token');
      if (token) {
        try {
          const tokenData = JSON.parse(token);
          const expiryTime = tokenData.issued_at + tokenData.expires_in * 1000;
          if (Date.now() < expiryTime) {
            setIsConnected(true);
          }
        } catch (err) {
          console.error("Error parsing token:", err);
        }
      }
    };
    
    checkAuth();
  }, []);

  // Handle OAuth redirect
  useEffect(() => {
    const handleOAuthRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        // Remove the query parameters to prevent issues on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
        
        setIsConnecting(true);
        setError(null);
        
        try {
          // Simulating token exchange - in a real app this would be a secure backend call
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          toast.success("Google Calendar connected!");
          
          // Store mock token
          const mockToken = {
            access_token: "mock_token",
            expires_in: 3600,
            issued_at: Date.now(),
          };
          localStorage.setItem('google_calendar_token', JSON.stringify(mockToken));
          
          setIsConnected(true);
        } catch (err: any) {
          console.error("Error connecting to Google Calendar:", err);
          setError("Failed to connect to Google Calendar. Please try again.");
          toast.error("Failed to connect to Google Calendar");
        } finally {
          setIsConnecting(false);
        }
      }
    };
    
    handleOAuthRedirect();
  }, []);

  const handleConnect = () => {
    if (!CLIENT_ID) {
      toast.error("Google Calendar integration is not configured", {
        description: "Please add your Google API client ID to enable this feature."
      });
      return;
    }
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&access_type=offline&prompt=consent`;
    
    window.location.href = authUrl;
  };

  const handleDisconnect = () => {
    localStorage.removeItem('google_calendar_token');
    setIsConnected(false);
    toast.success("Disconnected from Google Calendar");
  };

  const handleSyncTasks = async () => {
    if (!isConnected) {
      toast.error("Please connect to Google Calendar first");
      return;
    }
    
    setIsSyncing(true);
    setSyncProgress(0);
    
    // Simulate progress updates
    const interval = setInterval(() => {
      setSyncProgress(prev => {
        const newProgress = prev + 10;
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsSyncing(false);
            toast.success("Tasks synced to Google Calendar!");
          }, 500);
          return 100;
        }
        return newProgress;
      });
    }, 300);
  };

  const handleRefreshCalendar = () => {
    toast.info("Refreshing calendar data...");
    
    // Simulate fetching calendar events
    setTimeout(() => {
      toast.success("Calendar refreshed successfully");
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
              </AlertDescription>
            </Alert>
            
            {isSyncing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Syncing tasks...</span>
                  <span>{syncProgress}%</span>
                </div>
                <Progress value={syncProgress} className="h-2" />
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground mb-4">
            Connect your Google Calendar to automatically sync your tasks and receive notifications.
          </p>
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
              {isSyncing ? `Syncing (${syncProgress}%)` : "Sync Tasks"}
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

export default GoogleCalendarIntegration;
