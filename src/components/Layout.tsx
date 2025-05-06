
import React from "react";
import { Button } from "./ui/button";
import { BellRing, HelpCircle, Menu } from "lucide-react";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b py-4 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full hover:bg-gray-100 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              TaskPal
            </h1>
            <Badge className="ml-2 bg-gradient-to-r from-blue-200 to-purple-200 text-xs px-2 py-0.5 rounded-full text-purple-800 font-medium border-0">
              BETA
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <BellRing className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                2
              </span>
            </Button>
            <Button variant="outline" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Need help?
            </Button>
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
