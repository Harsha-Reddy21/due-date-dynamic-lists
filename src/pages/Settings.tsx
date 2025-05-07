
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Bell, Info, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const integrationFormSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  apiKey: z.string().min(1, "API Key is required"),
});

type IntegrationFormValues = z.infer<typeof integrationFormSchema>;

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [gapiInited, setGapiInited] = useState(false);
  const [gisInited, setGisInited] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState({
    gapi: false,
    gis: false
  });
  
  // Form for Google Calendar credentials
  const form = useForm<IntegrationFormValues>({
    resolver: zodResolver(integrationFormSchema),
    defaultValues: {
      clientId: "",
      apiKey: "",
    },
  });
  
  // Load user settings from Supabase
  useEffect(() => {
    if (!user) return;
    
    const fetchUserSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (error) {
          if (error.code === 'PGRST116') {
            // No settings found, create a new entry
            const { error: insertError } = await supabase
              .from('user_settings')
              .insert([{ user_id: user.id }]);
              
            if (insertError) throw insertError;
          } else {
            throw error;
          }
        } else if (data) {
          // Set form values from Supabase
          form.setValue('clientId', data.google_client_id || '');
          form.setValue('apiKey', data.google_api_key || '');
          setIsGoogleConnected(data.is_google_connected || false);
          
          // If already connected, load the scripts
          if (data.is_google_connected) {
            loadGoogleScripts();
          }
        }
      } catch (error) {
        console.error('Error fetching user settings:', error);
      }
    };
    
    fetchUserSettings();
  }, [user, form]);
  
  // Load Google API scripts
  const loadGoogleScripts = () => {
    // Check if scripts are already loaded
    if (window.gapi || document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
      setScriptsLoaded(prev => ({ ...prev, gapi: true }));
    } else {
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      gapiScript.onload = () => {
        setScriptsLoaded(prev => ({ ...prev, gapi: true }));
      };
      document.body.appendChild(gapiScript);
    }
    
    if (window.google?.accounts || document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      setScriptsLoaded(prev => ({ ...prev, gis: true }));
    } else {
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.async = true;
      gisScript.defer = true;
      gisScript.onload = () => {
        setScriptsLoaded(prev => ({ ...prev, gis: true }));
      };
      document.body.appendChild(gisScript);
    }
  };
  
  // Initialize Google APIs when scripts are loaded
  useEffect(() => {
    if (!scriptsLoaded.gapi || !scriptsLoaded.gis) return;
    
    const initializeApis = () => {
      // Initialize GAPI
      if (window.gapi && !gapiInited) {
        window.gapi.load('client', async () => {
          try {
            const apiKey = form.getValues('apiKey');
            if (!apiKey) return;
            
            await window.gapi.client.init({
              apiKey: apiKey,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
            });
            
            setGapiInited(true);
          } catch (error) {
            console.error("Error initializing GAPI client:", error);
          }
        });
      }
      
      // Initialize GIS
      if (window.google?.accounts && !gisInited) {
        try {
          const clientId = form.getValues('clientId');
          if (!clientId) return;
          
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
            callback: handleAuthResponse,
          });
          
          setTokenClient(client);
          setGisInited(true);
        } catch (error) {
          console.error("Error initializing GIS:", error);
        }
      }
    };
    
    initializeApis();
  }, [scriptsLoaded, form]);
  
  // Save credentials to Supabase and initialize Google API
  const handleGoogleInit = async (values: IntegrationFormValues) => {
    if (!user) {
      toast.error("You must be logged in to connect Google Calendar");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Save credentials to Supabase
      const { error } = await supabase
        .from('user_settings')
        .update({
          google_client_id: values.clientId,
          google_api_key: values.apiKey,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // Load Google scripts if not already loaded
      loadGoogleScripts();
      
      toast.success("Google API credentials saved", { 
        description: "You can now connect to Google Calendar" 
      });
    } catch (error) {
      console.error("Error saving Google credentials:", error);
      toast.error("Failed to save Google credentials");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle auth response from Google
  const handleAuthResponse = async (response: any) => {
    if (response.error !== undefined) {
      toast.error("Google authentication failed", { 
        description: response.error 
      });
      return;
    }
    
    if (!user) {
      toast.error("You must be logged in to connect Google Calendar");
      return;
    }
    
    // Successfully authenticated with Google
    try {
      setIsLoading(true);
      
      // Update connection status in Supabase
      await supabase
        .from('user_settings')
        .update({
          is_google_connected: true,
          google_last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
        
      setIsGoogleConnected(true);
      toast.success("Google Calendar connected successfully");
      
      // List upcoming events to confirm connection
      await listUpcomingEvents();
    } catch (error) {
      console.error("Error updating connection status:", error);
      toast.error("Failed to update connection status");
    } finally {
      setIsLoading(false);
    }
  };
  
  // List upcoming events from the calendar
  const listUpcomingEvents = async () => {
    if (!window.gapi?.client?.calendar) {
      toast.error("Google Calendar API not loaded");
      return;
    }
    
    try {
      const request = {
        'calendarId': 'primary',
        'timeMin': (new Date()).toISOString(),
        'showDeleted': false,
        'singleEvents': true,
        'maxResults': 10,
        'orderBy': 'startTime',
      };
      
      const response = await window.gapi.client.calendar.events.list(request);
      const events = response.result.items;
      
      if (!events || events.length === 0) {
        toast.info("No upcoming events found in your calendar");
      } else {
        toast.success(`Found ${events.length} upcoming events`);
      }
    } catch (err: any) {
      console.error('Error listing calendar events:', err);
      toast.error("Failed to fetch calendar events", { 
        description: err.message 
      });
    }
  };
  
  // Connect to Google Calendar
  const handleGoogleConnect = () => {
    if (!tokenClient) {
      toast.error("Google API not initialized", {
        description: "Please save your API credentials first"
      });
      return;
    }
    
    setIsLoading(true);
    
    if (window.gapi?.client?.getToken() === null) {
      // Prompt the user to select a Google Account and ask for consent to share their data
      tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
      // Skip display of account chooser and consent dialog for an existing session
      tokenClient.requestAccessToken({prompt: ''});
    }
  };
  
  // Disconnect from Google Calendar
  const handleGoogleDisconnect = async () => {
    if (!user) {
      toast.error("You must be logged in to disconnect Google Calendar");
      return;
    }
    
    try {
      setIsLoading(true);
      
      const token = window.gapi?.client?.getToken();
      if (token !== null) {
        window.google.accounts.oauth2.revoke(token.access_token, () => {
          console.log("Token revoked successfully");
        });
        if (window.gapi?.client) {
          window.gapi.client.setToken(null);
        }
      }
      
      // Update connection status in Supabase
      await supabase
        .from('user_settings')
        .update({
          is_google_connected: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
        
      toast.success("Disconnected from Google Calendar");
      setIsGoogleConnected(false);
    } catch (error) {
      console.error("Error disconnecting from Google:", error);
      toast.error("Failed to disconnect Google Calendar");
    } finally {
      setIsLoading(false);
    }
  };

  // Check connection status on page load
  useEffect(() => {
    if (!isGoogleConnected || !window.gapi || !window.gapi.client) return;
    
    const checkConnectionStatus = async () => {
      try {
        // Try to list events to verify the connection is valid
        await listUpcomingEvents();
      } catch (error) {
        console.error("Connection verification failed:", error);
        // If verification fails, try to reconnect silently
        if (tokenClient) {
          tokenClient.requestAccessToken({prompt: ''});
        }
      }
    };
    
    if (gapiInited && gisInited) {
      checkConnectionStatus();
    }
  }, [gapiInited, gisInited, isGoogleConnected]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        
        <Tabs defaultValue="integrations" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Manage your account details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Email Address</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium">Account Type</p>
                  <p className="text-sm text-muted-foreground">Free Plan</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={() => toast.info("This feature will be available soon")}>
                  Update Profile
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Google Calendar Integration</CardTitle>
                <CardDescription>
                  Connect your Google Calendar to sync tasks and events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-6 w-6 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Google Calendar</p>
                      <p className="text-xs text-muted-foreground">
                        {isGoogleConnected ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  
                  {isGoogleConnected && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleGoogleDisconnect}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : "Disconnect"}
                    </Button>
                  )}
                </div>
                
                {isGoogleConnected && (
                  <Alert className="mt-4 bg-blue-50 border-blue-200">
                    <div className="flex">
                      <div className="text-blue-800">
                        <AlertTitle className="text-blue-800">Google Calendar connected</AlertTitle>
                        <AlertDescription className="text-blue-700">
                          Your tasks will be synced with your Google Calendar. This integration will persist across sessions.
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                )}
                
                {!isGoogleConnected && (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleGoogleInit)} className="space-y-4">
                      <Alert className="mb-4 bg-amber-50 border-amber-200">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Google Cloud API Credentials Required</AlertTitle>
                        <AlertDescription>
                          You need to create a project in the Google Cloud Console and generate credentials. 
                          <a 
                            href="https://developers.google.com/calendar/api/quickstart/js" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline ml-1"
                          >
                            Learn how to get credentials
                          </a>
                        </AlertDescription>
                      </Alert>
                      
                      <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Google Client ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Your Google OAuth Client ID" {...field} />
                            </FormControl>
                            <FormDescription>
                              Client ID from your Google Cloud Console
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="apiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Google API Key</FormLabel>
                            <FormControl>
                              <Input placeholder="Your Google API Key" {...field} />
                            </FormControl>
                            <FormDescription>
                              API Key from your Google Cloud Console
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex flex-col gap-4">
                        <Button 
                          type="submit"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Saving...
                            </>
                          ) : "Save Credentials"}
                        </Button>
                        
                        {gapiInited && gisInited && (
                          <Button 
                            type="button"
                            onClick={handleGoogleConnect}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Connecting...
                              </>
                            ) : "Connect Google Calendar"}
                          </Button>
                        )}
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Control how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Receive task reminders and updates via email
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={(checked) => setEmailNotifications(checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Receive in-app notifications for updates and reminders
                    </p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={pushNotifications}
                    onCheckedChange={(checked) => setPushNotifications(checked)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => toast.success("Notification settings saved")}>
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
