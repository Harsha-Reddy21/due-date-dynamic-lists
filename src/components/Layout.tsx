
import React from "react";
import { Button } from "./ui/button";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              TaskPal
            </h1>
            <span className="ml-2 bg-gradient-to-r from-blue-200 to-purple-200 text-xs px-2 py-0.5 rounded-full text-purple-800 font-medium">
              BETA
            </span>
          </div>
          <div>
            <Button variant="outline">
              Need help?
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main>
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>TaskPal - Prioritize your tasks intelligently</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
