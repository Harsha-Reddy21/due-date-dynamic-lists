
import React from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CalendarCheck, Settings, User } from 'lucide-react';
import { useTaskContext } from '@/contexts/TaskContext';
import { toast } from '@/components/ui/sonner';

const Profile: React.FC = () => {
  const { user, profile } = useAuth();
  const { tasks } = useTaskContext();
  
  if (!user) return null;
  
  const initials = profile?.username ? 
    profile.username.substring(0, 2).toUpperCase() : 
    user.email?.substring(0, 2).toUpperCase() || 'U';
  
  const displayName = profile?.username || user.email?.split('@')[0] || 'User';
  const completedTasks = tasks.filter(task => task.completed).length;
  const pendingTasks = tasks.filter(task => !task.completed).length;
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/3">
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Avatar className="h-24 w-24 border-4 border-primary/10">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-xl">{displayName}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center mt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => toast.info("This feature will be available soon")}
                  >
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="text-muted-foreground h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">Member Since</p>
                    <p className="text-sm text-muted-foreground">
                      {user.created_at 
                        ? new Date(user.created_at).toLocaleDateString() 
                        : 'N/A'}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Settings className="text-muted-foreground h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">Account Type</p>
                    <p className="text-sm text-muted-foreground">Free Plan</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:w-2/3">
            <Card>
              <CardHeader>
                <CardTitle>Task Overview</CardTitle>
                <CardDescription>Your task management statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex flex-col gap-2">
                      <span className="text-blue-600 text-sm font-medium">Total Tasks</span>
                      <span className="text-3xl font-bold">{tasks.length}</span>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex flex-col gap-2">
                      <span className="text-green-600 text-sm font-medium">Completed</span>
                      <span className="text-3xl font-bold">{completedTasks}</span>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <div className="flex flex-col gap-2">
                      <span className="text-amber-600 text-sm font-medium">Pending</span>
                      <span className="text-3xl font-bold">{pendingTasks}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
                  {tasks.length > 0 ? (
                    <div className="space-y-4">
                      {tasks.slice(0, 5).map((task) => (
                        <div key={task.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent">
                          <CalendarCheck className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="ml-auto">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              task.completed
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {task.completed ? 'Completed' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No task activity yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
