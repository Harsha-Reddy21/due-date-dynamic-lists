
import React from "react";
import Layout from "@/components/Layout";
import Dashboard from "@/components/Dashboard";
import { TaskProvider } from "@/contexts/TaskContext";
import { Toaster } from "@/components/ui/toaster";

const Index = () => {
  return (
    <TaskProvider>
      <Layout>
        <Dashboard />
      </Layout>
      <Toaster />
    </TaskProvider>
  );
};

export default Index;
