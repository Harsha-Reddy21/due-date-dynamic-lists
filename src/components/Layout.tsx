
import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { BellRing, HelpCircle, Menu } from "lucide-react";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import UserMenu from "./UserMenu";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "./ui/sonner";
import { useTaskContext } from "@/contexts/TaskContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { tasks, markNotificationsAsSeen, hasUnseenNotifications } = useTaskContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<{
    today: any[];
    tomorrow: any[];
  }>({ today: [], tomorrow: [] });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationsShown, setNotificationsShown] = useState(false);
  
  // Calculate notifications based on due dates
  useEffect(() => {
    if (tasks.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const dueTodayTasks = tasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      });
      
      const dueTomorrowTasks = tasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === tomorrow.getTime();
      });
      
      setNotifications({
        today: dueTodayTasks,
        tomorrow: dueTomorrowTasks
      });

      // Only update notification count if notifications haven't been seen
      setNotificationCount(hasUnseenNotifications ? dueTodayTasks.length + dueTomorrowTasks.length : 0);
      
      // Show notification toast only once per session
      if (!notificationsShown && (dueTodayTasks.length > 0 || dueTomorrowTasks.length > 0)) {
        setNotificationsShown(true);
        
        if (dueTodayTasks.length > 0) {
          toast.warning(
            dueTodayTasks.length === 1
              ? `"${dueTodayTasks[0].title}" is due today!`
              : `You have ${dueTodayTasks.length} tasks due today!`,
            {
              description: "Check your notifications to see what needs to be completed.",
              duration: 5000,
            }
          );
        } else if (dueTomorrowTasks.length > 0) {
          toast.info(
            dueTomorrowTasks.length === 1
              ? `"${dueTomorrowTasks[0].title}" is due tomorrow.`
              : `You have ${dueTomorrowTasks.length} tasks due tomorrow.`,
            {
              description: "Plan ahead to complete these tasks on time.",
              duration: 5000,
            }
          );
        }
      }
    } else {
      setNotifications({ today: [], tomorrow: [] });
      setNotificationCount(0);
    }
  }, [tasks, notificationsShown, hasUnseenNotifications]);
  
  const handleNotificationClick = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    
    if (!isNotificationsOpen) {
      // Mark all notifications as seen when opening the menu
      markNotificationsAsSeen();
      setNotificationCount(0);
    }
  };
  
  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b py-4 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button className="p-2 rounded-full hover:bg-gray-100 lg:hidden" variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>TaskPal Menu</SheetTitle>
                  <SheetDescription>
                    Quick access to your task management tools
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  <Button 
                    variant={location.pathname === "/" ? "default" : "ghost"} 
                    className="justify-start" 
                    onClick={() => handleNavigation("/")}
                  >
                    Dashboard
                  </Button>
                  <Button 
                    variant={location.pathname === "/profile" ? "default" : "ghost"} 
                    className="justify-start" 
                    onClick={() => handleNavigation("/profile")}
                  >
                    Profile
                  </Button>
                  <Button 
                    variant={location.pathname === "/settings" ? "default" : "ghost"} 
                    className="justify-start" 
                    onClick={() => handleNavigation("/settings")}
                  >
                    Settings
                  </Button>
                  <Button 
                    variant={location.pathname === "/auth" ? "default" : "ghost"} 
                    className="justify-start" 
                    onClick={() => handleNavigation("/auth")}
                  >
                    Authentication
                  </Button>
                  <Button variant="ghost" className="justify-start" onClick={handleNotificationClick}>
                    <BellRing className="h-4 w-4 mr-2" />
                    Notifications
                    {notificationCount > 0 && (
                      <Badge className="ml-2 bg-red-500 text-white">{notificationCount}</Badge>
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="justify-start gap-2" 
                    onClick={() => {
                      toast("Help & Support", {
                        description: "Our support team will be available shortly.",
                      });
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <HelpCircle className="h-4 w-4" />
                    Help
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <Link to="/">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                TaskPal
              </h1>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative"
                  onClick={handleNotificationClick}
                >
                  <BellRing className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                      {notificationCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b">
                  <h3 className="font-medium">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-auto">
                  {notifications.today.length === 0 && notifications.tomorrow.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No upcoming tasks
                    </div>
                  ) : (
                    <>
                      {notifications.today.length > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-gray-50">
                            <h4 className="text-xs font-medium text-muted-foreground">TODAY</h4>
                          </div>
                          {notifications.today.map(task => (
                            <div key={task.id} className="px-4 py-2 border-b hover:bg-gray-50">
                              <p className="text-sm font-medium">{task.title}</p>
                              <p className="text-xs text-muted-foreground">Due today</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {notifications.tomorrow.length > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-gray-50">
                            <h4 className="text-xs font-medium text-muted-foreground">TOMORROW</h4>
                          </div>
                          {notifications.tomorrow.map(task => (
                            <div key={task.id} className="px-4 py-2 border-b hover:bg-gray-50">
                              <p className="text-sm font-medium">{task.title}</p>
                              <p className="text-xs text-muted-foreground">Due tomorrow</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="p-2 border-t flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsNotificationsOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button 
              variant="outline" 
              className="gap-2 hidden md:flex"
              onClick={() => {
                navigate('/settings');
              }}
            >
              <HelpCircle className="h-4 w-4" />
              Need help?
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>
      
      {/* Main Content with subtle gradient background */}
      <main className="bg-gradient-to-br from-white to-gray-100 min-h-[calc(100vh-8rem)]">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <span className="font-semibold text-gray-700">TaskPal</span>
              <Separator orientation="vertical" className="mx-3 h-4" />
              <span className="text-sm text-muted-foreground">Prioritize intelligently</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">About</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
