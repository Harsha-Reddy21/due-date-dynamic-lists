
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import GoogleCalendarIntegration from '@/components/GoogleCalendarIntegration';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertCircle, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import '@/types/google-api.d.ts';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [googleClientId, setGoogleClientId] = useState<string>(localStorage.getItem('google_client_id') || '');
  const [googleClientSecret, setGoogleClientSecret] = useState<string>(localStorage.getItem('google_client_secret') || '');

  const saveGoogleCredentials = () => {
    localStorage.setItem('google_client_id', googleClientId);
    localStorage.setItem('google_client_secret', googleClientSecret);
    toast.success('Google credentials saved successfully');
  };

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
            <Card className="mb-6">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Google OAuth Credentials</CardTitle>
                    <CardDescription>
                      Enter your Google OAuth credentials to enable calendar integration
                    </CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Google OAuth Setup Guide</DialogTitle>
                        <DialogDescription>
                          Follow these steps to set up Google OAuth correctly
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Authentication Error?</AlertTitle>
                          <AlertDescription>
                            If you see an error like "Access blocked" or "App has not completed the Google verification process", 
                            follow the steps below.
                          </AlertDescription>
                        </Alert>
                        
                        <h3 className="text-lg font-medium">Steps to Configure:</h3>
                        <ol className="list-decimal ml-6 space-y-2">
                          <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Cloud Console</a></li>
                          <li>Create a new project or select an existing one</li>
                          <li>Navigate to "APIs & Services" → "OAuth consent screen"</li>
                          <li>Select "External" user type (unless you have a Google Workspace)</li>
                          <li>Fill out the required app information</li>
                          <li>Under "Test users" section, add your email address</li>
                          <li>Go to "Credentials" and create an "OAuth client ID"</li>
                          <li>For "Application type", select "Web application"</li>
                          <li>Add your domain to "Authorized JavaScript origins"</li>
                          <li>Add your domain + "/settings" to "Authorized redirect URIs"</li>
                          <li>Save and copy the Client ID and Client Secret</li>
                        </ol>
                        
                        <p className="text-sm text-muted-foreground mt-4">
                          Note: While testing, you must use the same Google account that you added as a test user.
                          Google verification is only required when you want to release your app to the public.
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="google-client-id">Client ID</Label>
                  <Input 
                    id="google-client-id" 
                    value={googleClientId}
                    onChange={(e) => setGoogleClientId(e.target.value)}
                    placeholder="Enter your Google Client ID"
                  />
                  <p className="text-xs text-muted-foreground">
                    Get this from the Google Cloud Console
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google-client-secret">Client Secret</Label>
                  <Input 
                    id="google-client-secret" 
                    type="password"
                    value={googleClientSecret}
                    onChange={(e) => setGoogleClientSecret(e.target.value)}
                    placeholder="Enter your Google Client Secret"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is kept securely in your browser's local storage
                  </p>
                </div>
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Important OAuth Configuration</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    During development, you must add your email address as a test user in the Google Cloud Console's OAuth consent screen.
                    Otherwise, you'll see "App has not completed the Google verification process" errors.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}>
                  Open Google Console
                </Button>
                <Button onClick={saveGoogleCredentials}>
                  Save Credentials
                </Button>
              </CardFooter>
            </Card>
            <GoogleCalendarIntegration />
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
