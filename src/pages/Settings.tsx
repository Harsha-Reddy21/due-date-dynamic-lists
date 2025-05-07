
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Bell, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
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
  
  // Form for Google Calendar credentials
  const form = useForm<IntegrationFormValues>({
    resolver: zodResolver(integrationFormSchema),
    defaultValues: {
      clientId: localStorage.getItem("GOOGLE_CLIENT_ID") || "",
      apiKey: localStorage.getItem("GOOGLE_API_KEY") || "",
    },
  });
  
  const handleGoogleConnect = async (values: IntegrationFormValues) => {
    try {
      setIsLoading(true);
      
      // Save credentials to localStorage
      localStorage.setItem("GOOGLE_CLIENT_ID", values.clientId);
      localStorage.setItem("GOOGLE_API_KEY", values.apiKey);
      
      // Load the Google API client library
      if (!window.gapi) {
        const script = document.createElement('script');
        script.src = "https://apis.google.com/js/api.js";
        document.body.appendChild(script);
        
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }
      
      await new Promise((resolve) => {
        window.gapi.load('client:auth2', resolve);
      });
      
      await window.gapi.client.init({
        apiKey: values.apiKey,
        clientId: values.clientId,
        scope: "https://www.googleapis.com/auth/calendar.readonly",
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"]
      });
      
      const authInstance = window.gapi.auth2.getAuthInstance();
      
      if (!authInstance.isSignedIn.get()) {
        await authInstance.signIn();
        toast.success("Google Calendar connected successfully");
        setIsGoogleConnected(true);
      } else {
        toast.info("Already connected to Google Calendar");
        setIsGoogleConnected(true);
      }
    } catch (error) {
      console.error("Google Calendar connection error:", error);
      toast.error("Failed to connect Google Calendar", { 
        description: "Please verify your credentials and try again" 
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleDisconnect = async () => {
    try {
      setIsLoading(true);
      
      if (window.gapi && window.gapi.auth2) {
        const authInstance = window.gapi.auth2.getAuthInstance();
        if (authInstance) {
          await authInstance.signOut();
          toast.success("Disconnected from Google Calendar");
          setIsGoogleConnected(false);
        }
      }
    } catch (error) {
      console.error("Error disconnecting from Google:", error);
      toast.error("Failed to disconnect Google Calendar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        
        <Tabs defaultValue="account" className="w-full">
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
                      {isLoading ? "Processing..." : "Disconnect"}
                    </Button>
                  )}
                </div>
                
                {isGoogleConnected && (
                  <div className="rounded-md bg-blue-50 p-4 mt-4">
                    <div className="flex">
                      <div className="text-blue-800">
                        <p className="text-sm font-medium">Google Calendar is connected</p>
                        <p className="text-xs">Your tasks will be synced with your Google Calendar</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {!isGoogleConnected && (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleGoogleConnect)} className="space-y-4">
                      <div className="rounded-md bg-amber-50 p-4 mb-4">
                        <div className="flex">
                          <Info className="h-5 w-5 text-amber-800 mr-2" />
                          <div className="text-amber-800">
                            <p className="text-sm font-medium">Google Cloud API Credentials Required</p>
                            <p className="text-xs">You need to create a project in the Google Cloud Console and generate credentials. 
                              <a 
                                href="https://developers.google.com/calendar/api/quickstart/js" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline ml-1"
                              >
                                Learn how to get credentials
                              </a>
                            </p>
                          </div>
                        </div>
                      </div>
                      
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
                      
                      <Button 
                        type="submit"
                        disabled={isLoading}
                      >
                        {isLoading ? "Connecting..." : "Connect Google Calendar"}
                      </Button>
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
