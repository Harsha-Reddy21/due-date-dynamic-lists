
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { toast } from './ui/sonner';
import { useTaskContext } from '@/contexts/TaskContext';
import { useAuth } from '@/contexts/AuthContext';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

const GoogleCalendarIntegration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { tasks } = useTaskContext();
  const { user } = useAuth();

  const CLIENT_ID = ''; // You need to replace this with your Google API client ID
  const REDIRECT_URI = window.location.origin;
  const SCOPES = 'https://www.googleapis.com/auth/calendar';

  // Check if user is already authenticated with Google
  React.useEffect(() => {
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
  React.useEffect(() => {
    const handleOAuthRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        // Remove the query parameters to prevent issues on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
        
        setIsConnecting(true);
        setError(null);
        
        try {
          // In a real app, this exchange would happen in a secure backend
          // For demo purposes, we're just simulating success
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
    
    toast.promise(
      // This would be an actual API call in a real app
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: "Syncing tasks to Google Calendar...",
        success: "Tasks synced to Google Calendar!",
        error: "Failed to sync tasks. Please try again.",
      }
    );
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
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">Connected</AlertTitle>
            <AlertDescription className="text-green-700">
              Your account is connected to Google Calendar.
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-muted-foreground mb-4">
            Connect your Google Calendar to automatically sync your tasks and receive notifications.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {isConnected ? (
          <>
            <Button variant="outline" onClick={handleDisconnect}>
              Disconnect
            </Button>
            <Button onClick={handleSyncTasks}>
              <Calendar className="mr-2 h-4 w-4" />
              Sync Tasks
            </Button>
          </>
        ) : (
          <Button onClick={handleConnect} disabled={isConnecting || !CLIENT_ID}>
            <Calendar className="mr-2 h-4 w-4" />
            {isConnecting ? "Connecting..." : "Connect Google Calendar"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default GoogleCalendarIntegration;
